"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProductSchema, ProductSizeSchema } from "@/lib/validators";
import {
  archiveProduct,
  bulkAddTags,
  bulkDelete,
  bulkDraftZeroStock,
  draftAllZeroStock,
  bulkSetCategory,
  bulkSetFootwearType,
  bulkSetGarmentType,
  bulkSetGarmentVariant,
  bulkSetStatus,
  createProduct,
  deleteProduct,
  duplicateProduct,
  updateProduct,
  type ProductInput,
  type ProductSizeInput,
  type ProductImageInput,
} from "@/lib/products/mutations";
import type { FootwearType } from "@/lib/categories/footwear";
import type { GarmentType, GarmentVariant } from "@/lib/categories/garment";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export type { ProductImageInput };

export interface ProductFormPayload {
  product: ProductInput;
  sizes?: ProductSizeInput[];
  /** Todas las categorías marcadas (m2m). Si viene, reemplaza las del producto. */
  categoryIds?: string[];
  /** La categoría "principal" (breadcrumb/canonical + categoryId legacy). */
  primaryCategoryId?: string | null;
  /** Imágenes en orden de visualización. Si viene, reemplaza las del producto. */
  images?: ProductImageInput[];
  /** URL de la imagen principal (debe estar entre images). */
  mainImageUrl?: string | null;
}

export async function createProductAction(payload: ProductFormPayload) {
  const session = await requireSession();
  const parsed = ProductSchema.parse(payload.product);
  const sizes = payload.sizes ? payload.sizes.map((s) => ProductSizeSchema.parse(s)) : [];
  const product = await createProduct(parsed, sizes, session.user.id, {
    categoryIds: payload.categoryIds,
    primaryCategoryId: payload.primaryCategoryId,
    images: payload.images,
    mainImageUrl: payload.mainImageUrl,
  });
  revalidatePath("/admin/productos");
  return { ok: true as const, id: product.id, slug: product.slug };
}

export async function createProductAndRedirect(payload: ProductFormPayload) {
  const res = await createProductAction(payload);
  redirect(`/admin/productos/${res.id}`);
}

export async function updateProductAction(id: string, payload: ProductFormPayload) {
  const session = await requireSession();
  const parsed = ProductSchema.parse(payload.product);
  const sizes = payload.sizes ? payload.sizes.map((s) => ProductSizeSchema.parse(s)) : undefined;
  const product = await updateProduct(id, parsed, sizes, session.user.id, {
    categoryIds: payload.categoryIds,
    primaryCategoryId: payload.primaryCategoryId,
    images: payload.images,
    mainImageUrl: payload.mainImageUrl,
  });
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  revalidatePath(`/producto/${product.slug}`);
  return { ok: true as const, slug: product.slug };
}

export async function duplicateProductAction(
  id: string,
  keepStock = false,
  newColorName?: string,
) {
  const session = await requireSession();
  const created = await duplicateProduct(id, session.user.id, { keepStock, newColorName });
  revalidatePath("/admin/productos");
  return { ok: true as const, id: created.id };
}

export async function archiveProductAction(id: string) {
  const session = await requireSession();
  await archiveProduct(id, session.user.id);
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export async function deleteProductAction(id: string) {
  const session = await requireSession();
  await deleteProduct(id, session.user.id);
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export type BulkActionType =
  | { kind: "publish" }
  | { kind: "unpublish" }
  | { kind: "archive" }
  | { kind: "delete" }
  | { kind: "category"; categoryId: string }
  | { kind: "addTags"; tags: string[] }
  | { kind: "footwearType"; footwearType: FootwearType | null }
  | { kind: "garmentType"; garmentType: GarmentType | null }
  | { kind: "garmentVariant"; garmentVariant: GarmentVariant | null }
  | { kind: "draftZeroStock" };

export async function bulkAction(ids: string[], action: BulkActionType) {
  const session = await requireSession();
  if (!ids.length) return { ok: false as const, error: "Nada seleccionado" };

  // Todo el switch envuelto en try/catch: si una mutación lanza (p.ej. un id
  // borrado en paralelo provoca violación de FK en el audit), devolvemos
  // {ok:false} en lugar de un 500 sin cuerpo. Antes solo footwear/garment lo
  // capturaban; el resto (delete/category/addTags/publish…) quedaba expuesto.
  try {
    let count = 0;
    switch (action.kind) {
      case "publish":
        count = await bulkSetStatus(ids, "ACTIVE", session.user.id);
        break;
      case "unpublish":
        count = await bulkSetStatus(ids, "DRAFT", session.user.id);
        break;
      case "archive":
        count = await bulkSetStatus(ids, "INACTIVE", session.user.id);
        break;
      case "delete":
        count = await bulkDelete(ids, session.user.id);
        break;
      case "category":
        count = await bulkSetCategory(ids, action.categoryId, session.user.id);
        break;
      case "addTags":
        count = await bulkAddTags(ids, action.tags, session.user.id);
        break;
      case "footwearType":
        count = await bulkSetFootwearType(ids, action.footwearType, session.user.id);
        break;
      case "garmentType":
        count = await bulkSetGarmentType(ids, action.garmentType, session.user.id);
        break;
      case "garmentVariant":
        count = await bulkSetGarmentVariant(ids, action.garmentVariant, session.user.id);
        break;
      case "draftZeroStock":
        count = await bulkDraftZeroStock(ids, session.user.id);
        break;
    }
    revalidatePath("/admin/productos");
    return { ok: true as const, count };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Error" };
  }
}

// ---------------------------------------------------------------------------
// Quick-edit inline: SKU y STATUS desde la tabla /admin/productos
// ---------------------------------------------------------------------------

const SKU_MAX = 64;
const STATUS_VALUES = ["DRAFT", "ACTIVE", "INACTIVE", "OUT_OF_STOCK"] as const;
type StatusValue = (typeof STATUS_VALUES)[number];

export async function updateProductSkuAction(
  id: string,
  skuRaw: string,
): Promise<{ ok: true; sku: string | null } | { ok: false; error: string }> {
  await requireSession();
  const { db } = await import("@/lib/db");
  const sku = skuRaw.trim();
  if (sku.length > SKU_MAX) {
    return { ok: false, error: `SKU excede ${SKU_MAX} caracteres` };
  }
  try {
    const updated = await db.product.update({
      where: { id },
      data: { sku: sku.length === 0 ? null : sku },
      select: { sku: true },
    });
    revalidatePath("/admin/productos");
    return { ok: true, sku: updated.sku };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "P2002") {
      return { ok: false, error: "Ya existe otro producto con ese SKU" };
    }
    return { ok: false, error: e.message ?? "Error guardando SKU" };
  }
}

export async function updateProductPriceAction(
  id: string,
  raw: string,
): Promise<{ ok: true; retailPrice: string } | { ok: false; error: string }> {
  await requireSession();
  const { db } = await import("@/lib/db");
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "") return { ok: false, error: "El PVP no puede estar vacío" };
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: "PVP inválido" };
  }
  if (value > 99999) {
    return { ok: false, error: "PVP máximo 99 999 €" };
  }
  try {
    const updated = await db.product.update({
      where: { id },
      data: { retailPrice: value.toFixed(2) },
      select: { retailPrice: true },
    });
    revalidatePath("/admin/productos");
    return { ok: true, retailPrice: updated.retailPrice.toString() };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Error guardando PVP" };
  }
}

export async function updateProductStockAction(
  id: string,
  raw: string,
): Promise<{ ok: true; stock: number } | { ok: false; error: string }> {
  await requireSession();
  const { db } = await import("@/lib/db");
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, error: "Stock inválido (entero ≥ 0)" };
  }
  if (value > 1_000_000) {
    return { ok: false, error: "Stock máximo 1 000 000" };
  }
  try {
    const updated = await db.product.update({
      where: { id },
      data: { stock: value },
      select: { stock: true },
    });
    revalidatePath("/admin/productos");
    return { ok: true, stock: updated.stock };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Error guardando stock" };
  }
}

export async function updateProductStatusAction(
  id: string,
  statusRaw: string,
): Promise<{ ok: true; status: StatusValue } | { ok: false; error: string }> {
  await requireSession();
  const { db } = await import("@/lib/db");
  if (!STATUS_VALUES.includes(statusRaw as StatusValue)) {
    return { ok: false, error: `Estado inválido: ${statusRaw}` };
  }
  const status = statusRaw as StatusValue;
  try {
    // Si pasa a ACTIVE y aún no tenía publishedAt, lo seteamos a ahora.
    const existing = await db.product.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    await db.product.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === "ACTIVE" && !existing?.publishedAt ? new Date() : undefined,
      },
    });
    revalidatePath("/admin/productos");
    return { ok: true, status };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "Error guardando estado" };
  }
}

/**
 * Server action sin args usada por el botón verde "Guardar cambios" al pie
 * de /admin/productos. Cada edit inline ya persiste atómicamente; este
 * botón es una confirmación visual + revalidación forzada del listado.
 */
export async function forceSaveProductsList(): Promise<void> {
  await requireSession();
  revalidatePath("/admin/productos");
}

/**
 * Pasa a BORRADOR (DRAFT) TODOS los productos ACTIVE sin stock (stock total = 0).
 * Global: no requiere selección. Reversible a mano. Devuelve cuántos cambió.
 */
export async function draftAllZeroStockAction(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  const session = await requireSession();
  try {
    const count = await draftAllZeroStock(session.user.id);
    revalidatePath("/admin/productos");
    return { ok: true, count };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error" };
  }
}

// ---------------------------------------------------------------------------
// Generación automática de descripción y meta description
// ---------------------------------------------------------------------------

export async function generateDescriptionAction(productId: string): Promise<
  | { ok: true; description: string; metaDescription: string }
  | { ok: false; error: string }
> {
  await requireSession();
  const { generateAutoDescription } = await import("@/lib/products/description");
  const result = await generateAutoDescription(productId);
  if (!result) {
    return {
      ok: false,
      error: "No hay plantillas para esta categoría. Siembra los templates con POST /api/admin/setup primero.",
    };
  }
  return { ok: true, description: result.description, metaDescription: result.metaDescription };
}

export interface DescriptionFieldsActionInput {
  name: string;
  brandName?: string | null;
  categorySlug?: string | null;
  colorName?: string | null;
}

/**
 * Genera una descripción a partir de los CAMPOS del formulario (sin que el
 * producto esté guardado). Funciona tanto al crear como al editar: el editor
 * pasa name/brandName/categorySlug/colorName resueltos en cliente. Si no hay
 * plantillas sembradas devuelve error con la pista del setup.
 */
export async function generateDescriptionFromFieldsAction(
  input: DescriptionFieldsActionInput,
): Promise<{ ok: true; description: string } | { ok: false; error: string }> {
  await requireSession();
  if (!input?.name || !input.name.trim()) {
    return { ok: false, error: "Escribe primero el nombre del producto." };
  }
  const { generateDescriptionFromFields } = await import("@/lib/products/description");
  const description = await generateDescriptionFromFields(input);
  if (!description) {
    return {
      ok: false,
      error:
        "No hay plantillas para esta categoría. Siembra los templates con POST /api/admin/setup primero.",
    };
  }
  return { ok: true, description };
}

/**
 * Genera una meta description a partir de los CAMPOS del formulario (sin
 * guardar). Siempre devuelve un meta razonable (cae en la genérica si no hay
 * plantilla con metaShort). Requiere al menos el nombre.
 */
export async function generateMetaFromFieldsAction(
  input: DescriptionFieldsActionInput,
): Promise<{ ok: true; metaDescription: string } | { ok: false; error: string }> {
  await requireSession();
  if (!input?.name || !input.name.trim()) {
    return { ok: false, error: "Escribe primero el nombre del producto." };
  }
  const { generateMetaFromFields } = await import("@/lib/products/description");
  const metaDescription = await generateMetaFromFields(input);
  return { ok: true, metaDescription };
}

export async function generateMetaDescriptionAction(productId: string): Promise<
  | { ok: true; metaDescription: string }
  | { ok: false; error: string }
> {
  await requireSession();
  const { db } = await import("@/lib/db");
  const { generateAutoMetaFromProduct } = await import("@/lib/products/description");
  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      colorName: true,
      brand: { select: { name: true } },
      category: { select: { name: true, slug: true } },
    },
  });
  if (!product) return { ok: false, error: "Producto no encontrado" };
  return { ok: true, metaDescription: generateAutoMetaFromProduct(product) };
}

/**
 * Aplica una descripción genérica a TODOS los productos que no tengan
 * description y/o metaDescription. Por cada producto coge una plantilla
 * aleatoria de su categoría (fallback a "default") y sustituye los
 * placeholders. Persiste cada producto individualmente — si uno falla
 * el resto sigue.
 *
 * Modos:
 *   - `mode: "missing"` (default): solo rellena los vacíos.
 *   - `mode: "all"`: sobreescribe TODAS las descripciones, incluso las
 *     que el admin ya editó. Útil para repoblar tras añadir plantillas
 *     nuevas. Respeta `isCustomized = true` para no destruir trabajo
 *     manual.
 */
export async function bulkGenerateDescriptionsAction(
  mode: "missing" | "all" = "missing",
): Promise<
  | { ok: true; updated: number; skipped: number; total: number }
  | { ok: false; error: string }
> {
  await requireSession();
  const { db } = await import("@/lib/db");
  const { pickTemplateForCategory, applyTemplate, generateAutoMetaFromProduct } =
    await import("@/lib/products/description");

  const where =
    mode === "all"
      ? { isCustomized: false } // no toca lo que el admin marcó como custom
      : {
          isCustomized: false,
          OR: [
            { description: null },
            { description: "" },
            { metaDescription: null },
            { metaDescription: "" },
          ],
        };

  const products = await db.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      colorName: true,
      description: true,
      metaDescription: true,
      brand: { select: { name: true } },
      category: { select: { name: true, slug: true } },
    },
  });

  let updated = 0;
  let skipped = 0;
  for (const p of products) {
    try {
      const template = await pickTemplateForCategory(p.category.slug);
      const productInfo = {
        name: p.name,
        colorName: p.colorName,
        brand: p.brand,
        category: p.category,
      };

      const data: { description?: string; metaDescription?: string } = {};
      const needsDesc =
        mode === "all" || !p.description || p.description.trim() === "";
      const needsMeta =
        mode === "all" || !p.metaDescription || p.metaDescription.trim() === "";

      if (needsDesc && template) {
        data.description = applyTemplate(template.body, productInfo);
      }
      if (needsMeta) {
        data.metaDescription = template?.metaShort
          ? applyTemplate(template.metaShort, productInfo)
          : generateAutoMetaFromProduct(productInfo);
      }

      if (Object.keys(data).length === 0) {
        skipped++;
        continue;
      }
      await db.product.update({ where: { id: p.id }, data });
      updated++;
    } catch (err) {
      console.error(`[bulkGenerateDescriptions] ${p.id} falló:`, err);
      skipped++;
    }
  }

  revalidatePath("/admin/productos");
  return { ok: true, updated, skipped, total: products.length };
}

