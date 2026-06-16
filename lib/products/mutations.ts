import "server-only";
import { Decimal } from "decimal.js";
import { db, type Prisma } from "@/lib/db";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";
import { ProductSchema, ProductSizeSchema } from "@/lib/validators";
import type { FootwearType } from "@/lib/categories/footwear";
import type { GarmentType, GarmentVariant } from "@/lib/categories/garment";
import { VARIANT_TO_TYPE } from "@/lib/categories/garment";
import { deriveGenderFromCategorySlugs } from "@/lib/products/derive-gender";
import { deriveFootwearTypeFromSlugs, deriveGarmentTypeFromSlugs } from "@/lib/products/derive-type";
import type { z } from "zod";

export type ProductInput = z.infer<typeof ProductSchema>;
export type ProductSizeInput = z.infer<typeof ProductSizeSchema>;

export interface ProductImageInput {
  url: string;
  urlThumb?: string | null;
  urlMedium?: string | null;
  blurDataUrl?: string | null;
  width?: number | null;
  height?: number | null;
  alt: string;
}

export interface ProductRelationsInput {
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  images?: ProductImageInput[];
  mainImageUrl?: string | null;
}

function diff<T extends Record<string, unknown>>(prev: T, next: T): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    const a = prev[k];
    const b = next[k];
    const aStr = a instanceof Date ? a.toISOString() : JSON.stringify(a ?? null);
    const bStr = b instanceof Date ? b.toISOString() : JSON.stringify(b ?? null);
    if (aStr !== bStr) out[k] = { from: a ?? null, to: b ?? null };
  }
  return out;
}

function toDecimal<T extends number | null | undefined>(v: T): Prisma.Decimal | null | undefined {
  if (v == null) return v as null | undefined;
  return new Decimal(v) as unknown as Prisma.Decimal;
}

async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  return uniqueSlug(base, async (s) => {
    const found = await db.product.findUnique({ where: { slug: s }, select: { id: true } });
    if (!found) return false;
    if (excludeId && found.id === excludeId) return false;
    return true;
  });
}

export async function createProduct(
  input: ProductInput,
  sizes: ProductSizeInput[] = [],
  userId?: string,
  extra: ProductRelationsInput = {},
) {
  const parsed = ProductSchema.parse(input);
  const slug = await ensureUniqueSlug(parsed.slug || slugifyEs(`${parsed.name}-${parsed.colorName}`));

  // Auto-rellenado: si la descripción y/o metaDescription vienen vacíos,
  // intentamos generarlos vía plantilla. Esto da al admin un punto de
  // partida razonable que puede editar después (un click).
  let autoDescription = parsed.description;
  let autoMeta = parsed.metaDescription;
  if (!autoDescription || !autoMeta) {
    const category = await db.category.findUnique({
      where: { id: parsed.categoryId },
      select: { slug: true, name: true },
    });
    const brand = await db.brand.findUnique({
      where: { id: parsed.brandId },
      select: { name: true },
    });
    if (category && brand) {
      const { pickTemplateForCategory, applyTemplate, generateAutoMetaFromProduct } =
        await import("@/lib/products/description");
      const template = await pickTemplateForCategory(category.slug);
      const productInfo = {
        name: parsed.name,
        colorName: parsed.colorName,
        brand,
        category: { name: category.name, slug: category.slug },
      };
      if (!autoDescription && template) {
        autoDescription = applyTemplate(template.body, productInfo);
      }
      if (!autoMeta) {
        autoMeta = template?.metaShort
          ? applyTemplate(template.metaShort, productInfo)
          : generateAutoMetaFromProduct(productInfo);
      }
    }
  }

  // Derive gender and resolve primary category from extra.categoryIds (if provided).
  let derivedGender = parsed.gender;
  let derivedFootwearType: string | null = null;
  let derivedGarmentType: string | null = null;
  let resolvedPrimaryId: string | undefined = undefined;
  let categoryRows: { id: string; slug: string }[] = [];

  if (extra.categoryIds?.length) {
    categoryRows = await db.category.findMany({
      where: { id: { in: extra.categoryIds } },
      select: { id: true, slug: true },
    });
    const validIds = categoryRows.map((c) => c.id);
    const primary = extra.primaryCategoryId ?? validIds[0] ?? undefined;
    resolvedPrimaryId = primary;
    const slugs = categoryRows.map((c) => c.slug);
    derivedGender = deriveGenderFromCategorySlugs(slugs);
    derivedFootwearType = deriveFootwearTypeFromSlugs(slugs);
    derivedGarmentType = deriveGarmentTypeFromSlugs(slugs);
  }

  const created = await db.$transaction(async (tx) => {
    const createData: Prisma.ProductCreateInput = {
      ...(parsed as Omit<typeof parsed, "brandId" | "categoryId">),
      slug,
      description: autoDescription ?? parsed.description,
      metaDescription: autoMeta ?? parsed.metaDescription,
      gender: derivedGender,
      footwearType: (derivedFootwearType ?? parsed.footwearType ?? null) as FootwearType | null,
      garmentType: (derivedGarmentType ?? parsed.garmentType ?? null) as GarmentType | null,
      retailPrice: parsed.retailPrice as unknown as Prisma.Decimal,
      costPrice: parsed.costPrice != null ? (parsed.costPrice as unknown as Prisma.Decimal) : null,
      salePrice: parsed.salePrice != null ? (parsed.salePrice as unknown as Prisma.Decimal) : null,
      taxRate: parsed.taxRate as unknown as Prisma.Decimal,
      weight: parsed.weight != null ? (parsed.weight as unknown as Prisma.Decimal) : null,
      externalUrl: parsed.externalUrl || null,
      colorHex: parsed.colorHex || null,
      publishedAt: parsed.status === "ACTIVE" ? new Date() : null,
      brand: { connect: { id: parsed.brandId } },
      category: { connect: { id: extra.categoryIds?.length && resolvedPrimaryId ? resolvedPrimaryId : parsed.categoryId } },
    };

    if (resolvedPrimaryId) {
      createData.primaryCategory = { connect: { id: resolvedPrimaryId } };
    }

    const product = await tx.product.create({ data: createData });

    if (sizes.length) {
      await tx.productSize.createMany({
        data: sizes.map((s, i) => ({
          productId: product.id,
          size: s.size,
          ean: s.ean || null,
          stock: s.stock ?? 0,
          costPrice: s.costPrice != null ? (s.costPrice as unknown as Prisma.Decimal) : null,
          retailPrice: s.retailPrice != null ? (s.retailPrice as unknown as Prisma.Decimal) : null,
          position: i,
        })),
      });
    }

    if (extra.categoryIds?.length && categoryRows.length) {
      const dedupedIds = [...new Set(categoryRows.map((c) => c.id))];
      await tx.productCategory.createMany({
        data: dedupedIds.map((categoryId) => ({ productId: product.id, categoryId })),
        skipDuplicates: true,
      });
    }

    if (extra.images?.length) {
      await tx.productImage.createMany({
        data: extra.images.map((img, i) => ({
          productId: product.id,
          url: img.url,
          urlThumb: img.urlThumb ?? null,
          urlMedium: img.urlMedium ?? null,
          blurDataUrl: img.blurDataUrl ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          alt: img.alt,
          position: i,
          source: "upload",
        })),
      });
    }

    const mainImageUrl = extra.mainImageUrl ?? extra.images?.[0]?.url ?? null;
    if (mainImageUrl) {
      await tx.product.update({ where: { id: product.id }, data: { mainImageUrl } });
    }

    await tx.productAudit.create({
      data: {
        productId: product.id,
        userId,
        action: "created",
        changes: { name: { from: null, to: product.name } } as Prisma.InputJsonValue,
      },
    });
    return product;
  });

  return created;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  sizes: ProductSizeInput[] | undefined,
  userId?: string,
  extra: ProductRelationsInput = {},
) {
  const parsed = ProductSchema.parse(input);
  const existing = await db.product.findUnique({
    where: { id },
    include: { sizes: true },
  });
  if (!existing) throw new Error("Producto no encontrado");

  const slug =
    parsed.slug && parsed.slug !== existing.slug
      ? await ensureUniqueSlug(parsed.slug, id)
      : existing.slug;

  const wasActive = existing.status === "ACTIVE";
  const willBeActive = parsed.status === "ACTIVE";

  // Resolve categories / gender from extra (if provided).
  let derivedGender = parsed.gender;
  let derivedFootwearType: string | null = null;
  let derivedGarmentType: string | null = null;
  let resolvedPrimaryId: string | undefined = undefined;
  let categoryRows: { id: string; slug: string }[] = [];

  if (extra.categoryIds !== undefined && extra.categoryIds.length > 0) {
    categoryRows = await db.category.findMany({
      where: { id: { in: extra.categoryIds } },
      select: { id: true, slug: true },
    });
    const validIds = categoryRows.map((c) => c.id);
    const primary = extra.primaryCategoryId ?? validIds[0] ?? undefined;
    resolvedPrimaryId = primary;
    const slugs = categoryRows.map((c) => c.slug);
    derivedGender = deriveGenderFromCategorySlugs(slugs);
    derivedFootwearType = deriveFootwearTypeFromSlugs(slugs);
    derivedGarmentType = deriveGarmentTypeFromSlugs(slugs);
  } else if (extra.categoryIds !== undefined && extra.categoryIds.length === 0) {
    // Explicit empty array: clear all m2m categories but leave scalar fields alone.
    // Gender stays as parsed.gender; primary stays undefined.
  }

  const updated = await db.$transaction(async (tx) => {
    const updateData: Parameters<typeof tx.product.update>[0]["data"] = {
      ...parsed,
      slug,
      gender: derivedGender,
      footwearType: (derivedFootwearType ?? parsed.footwearType ?? null) as FootwearType | null,
      garmentType: (derivedGarmentType ?? parsed.garmentType ?? null) as GarmentType | null,
      retailPrice: parsed.retailPrice as unknown as Prisma.Decimal,
      costPrice: parsed.costPrice != null ? (parsed.costPrice as unknown as Prisma.Decimal) : null,
      salePrice: parsed.salePrice != null ? (parsed.salePrice as unknown as Prisma.Decimal) : null,
      taxRate: parsed.taxRate as unknown as Prisma.Decimal,
      weight: parsed.weight != null ? (parsed.weight as unknown as Prisma.Decimal) : null,
      externalUrl: parsed.externalUrl || null,
      colorHex: parsed.colorHex || null,
      publishedAt: willBeActive && !wasActive ? new Date() : existing.publishedAt,
    };

    if (resolvedPrimaryId !== undefined) {
      updateData.categoryId = resolvedPrimaryId;
      updateData.primaryCategoryId = resolvedPrimaryId;
    }

    if (extra.mainImageUrl !== undefined) {
      updateData.mainImageUrl = extra.mainImageUrl;
    } else if (extra.images !== undefined && extra.images.length > 0) {
      updateData.mainImageUrl = extra.images[0]!.url;
    }

    const product = await tx.product.update({ where: { id }, data: updateData });

    if (sizes) {
      // Replace strategy: borrar y volver a crear
      await tx.productSize.deleteMany({ where: { productId: id } });
      if (sizes.length) {
        await tx.productSize.createMany({
          data: sizes.map((s, i) => ({
            productId: id,
            size: s.size,
            ean: s.ean || null,
            stock: s.stock ?? 0,
            costPrice: s.costPrice != null ? (s.costPrice as unknown as Prisma.Decimal) : null,
            retailPrice:
              s.retailPrice != null ? (s.retailPrice as unknown as Prisma.Decimal) : null,
            position: i,
          })),
        });
      }
    }

    if (extra.categoryIds !== undefined) {
      // Replace strategy for m2m categories
      await tx.productCategory.deleteMany({ where: { productId: id } });
      if (categoryRows.length > 0) {
        const dedupedIds = [...new Set(categoryRows.map((c) => c.id))];
        await tx.productCategory.createMany({
          data: dedupedIds.map((categoryId) => ({ productId: id, categoryId })),
          skipDuplicates: true,
        });
      }
    }

    if (extra.images !== undefined) {
      // Replace strategy for images
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (extra.images.length > 0) {
        await tx.productImage.createMany({
          data: extra.images.map((img, i) => ({
            productId: id,
            url: img.url,
            urlThumb: img.urlThumb ?? null,
            urlMedium: img.urlMedium ?? null,
            blurDataUrl: img.blurDataUrl ?? null,
            width: img.width ?? null,
            height: img.height ?? null,
            alt: img.alt,
            position: i,
            source: "upload",
          })),
        });
      }
    }

    const changes = diff(
      {
        name: existing.name,
        slug: existing.slug,
        status: existing.status,
        retailPrice: existing.retailPrice.toString(),
        brandId: existing.brandId,
        categoryId: existing.categoryId,
        colorName: existing.colorName,
      },
      {
        name: product.name,
        slug: product.slug,
        status: product.status,
        retailPrice: product.retailPrice.toString(),
        brandId: product.brandId,
        categoryId: product.categoryId,
        colorName: product.colorName,
      },
    );

    if (Object.keys(changes).length) {
      await tx.productAudit.create({
        data: {
          productId: id,
          userId,
          action:
            !wasActive && willBeActive
              ? "published"
              : wasActive && !willBeActive
                ? "unpublished"
                : "updated",
          changes: changes as Prisma.InputJsonValue,
        },
      });
    }

    return product;
  });

  return updated;
}

/** Sustituye el color viejo por el nuevo dentro del nombre (case-insensitive);
 * si el color viejo no aparece, añade el nuevo al final. */
function replaceColorInName(name: string, oldColor: string, newColor: string): string {
  if (oldColor && name.toLowerCase().includes(oldColor.toLowerCase())) {
    const re = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return name.replace(re, newColor);
  }
  return `${name} ${newColor}`;
}

export async function duplicateProduct(
  id: string,
  userId?: string,
  opts: { keepStock?: boolean; newColorName?: string; newColorHex?: string } = {},
) {
  const { keepStock = false, newColorName, newColorHex } = opts;
  const src = await db.product.findUnique({
    where: { id },
    include: { sizes: true, images: true, categories: true },
  });
  if (!src) throw new Error("Producto origen no existe");

  // Cambio de color en el propio duplicado (caso "1 color = 1 producto"): si se
  // indica color nuevo, lo sustituye en el nombre (o lo añade), resetea el hex
  // (a rellenar en la ficha) y genera slug propio. Si no, copia con sufijo "(copia)".
  const trimmedColor = newColorName?.trim();
  const useNewColor = !!trimmedColor;
  const finalColorName = useNewColor ? trimmedColor! : src.colorName;
  const finalColorHex = useNewColor ? (newColorHex?.trim() || null) : src.colorHex;
  const finalName = useNewColor
    ? replaceColorInName(src.name, src.colorName, finalColorName)
    : `${src.name} (copia)`;
  const slug = await ensureUniqueSlug(
    useNewColor ? slugifyEs(`${finalName}-${finalColorName}`) : `${src.slug}-copia`,
  );

  const cloned = await db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        slug,
        name: finalName,
        shortName: src.shortName,
        description: src.description,
        brandId: src.brandId,
        categoryId: src.categoryId,
        // Bloque 2: la categoría principal (breadcrumbs/canonical) se copia para
        // que el duplicado herede la colocación del origen.
        primaryCategoryId: src.primaryCategoryId,
        source: "LOCAL",
        externalId: null,
        externalUrl: src.externalUrl,
        modelCode: src.modelCode,
        sku: null, // sku es @unique → no se copia en duplicados; el admin asignará uno nuevo.
        colorName: finalColorName,
        colorHex: finalColorHex,
        gender: src.gender,
        sportUse: src.sportUse,
        // Clasificación de familia (Bloque 3/6): necesaria para los filtros de
        // tipo de calzado / prenda. Sin esto el duplicado quedaba sin clasificar.
        footwearType: src.footwearType,
        garmentType: src.garmentType,
        garmentVariant: src.garmentVariant,
        composition: src.composition,
        costPrice: src.costPrice,
        retailPrice: src.retailPrice,
        salePrice: src.salePrice,
        taxRate: src.taxRate,
        mainImageUrl: src.mainImageUrl,
        tags: src.tags,
        status: "DRAFT",
        stock: keepStock ? src.stock : 0,
        weight: src.weight,
        isFeatured: false,
        isCustomized: true,
        metaTitle: src.metaTitle,
        metaDescription: src.metaDescription,
      },
    });
    if (src.sizes.length) {
      await tx.productSize.createMany({
        data: src.sizes.map((s, i) => ({
          productId: product.id,
          size: s.size,
          ean: null, // EAN único — no clonar
          stock: keepStock ? s.stock : 0,
          costPrice: s.costPrice,
          retailPrice: s.retailPrice,
          position: i,
        })),
      });
    }
    if (src.images.length) {
      await tx.productImage.createMany({
        data: src.images.map((img, i) => ({
          productId: product.id,
          url: img.url,
          urlThumb: img.urlThumb,
          urlMedium: img.urlMedium,
          alt: img.alt,
          position: i,
          width: img.width,
          height: img.height,
          blurDataUrl: img.blurDataUrl,
          source: img.source,
          originalUrl: img.originalUrl,
        })),
      });
    }
    await tx.productAudit.create({
      data: {
        productId: product.id,
        userId,
        action: "duplicated",
        changes: { from: { to: src.id } } as Prisma.InputJsonValue,
      },
    });
    return product;
  });

  return cloned;
}

export async function archiveProduct(id: string, userId?: string) {
  const product = await db.product.update({
    where: { id },
    data: { status: "INACTIVE" },
  });
  await db.productAudit.create({
    data: { productId: id, userId, action: "archived" },
  });
  return product;
}

export async function deleteProduct(id: string, userId?: string) {
  // Log antes de borrar (audit cascade-deletes con producto, así que log informativo standalone)
  await db.productAudit.create({
    data: { productId: id, userId, action: "deleted" },
  });
  return db.product.delete({ where: { id } });
}

export async function bulkSetStatus(ids: string[], status: "ACTIVE" | "INACTIVE" | "DRAFT", userId?: string) {
  if (!ids.length) return 0;
  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      publishedAt: status === "ACTIVE" ? new Date() : undefined,
    },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: `bulk_${status.toLowerCase()}`,
    })),
  });
  return res.count;
}

/**
 * Bloque 8.12: pasa a DRAFT los productos SELECCIONADOS cuyo stock total = 0
 * (suma de ProductSize.stock; sin filas de talla = 0). NO toca el stock, solo el
 * status. Reversible a mano (editor o bulk "Cambiar estado" → ACTIVE). Devuelve
 * cuántos pasó a borrador. Manual y bajo demanda (no trigger/cron).
 */
export async function bulkDraftZeroStock(ids: string[], userId?: string) {
  if (!ids.length) return 0;
  const grouped = await db.productSize.groupBy({
    by: ["productId"],
    where: { productId: { in: ids } },
    _sum: { stock: true },
  });
  const stockByProduct = new Map(grouped.map((g) => [g.productId, g._sum.stock ?? 0]));
  // Sin stock = suma 0 O sin ninguna fila ProductSize (no aparece en grouped).
  const zeroStockIds = ids.filter((id) => (stockByProduct.get(id) ?? 0) <= 0);
  if (!zeroStockIds.length) return 0;
  const res = await db.product.updateMany({
    where: { id: { in: zeroStockIds } },
    data: { status: "DRAFT" },
  });
  await db.productAudit.createMany({
    data: zeroStockIds.map((productId) => ({
      productId,
      userId,
      action: "bulk_draft_zero_stock",
    })),
  });
  return res.count;
}

/**
 * Bloque 9: pasa a DRAFT TODOS los productos ACTIVE cuyo stock total = 0
 * (suma de ProductSize.stock, o sin filas de talla). Variante "global" de
 * bulkDraftZeroStock — no requiere selección previa. No toca el stock, solo el
 * status; reversible a mano. Manual y bajo demanda. Devuelve cuántos cambió.
 */
export async function draftAllZeroStock(userId?: string) {
  const active = await db.product.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  if (!active.length) return 0;
  const ids = active.map((p) => p.id);
  const grouped = await db.productSize.groupBy({
    by: ["productId"],
    where: { productId: { in: ids } },
    _sum: { stock: true },
  });
  const stockByProduct = new Map(grouped.map((g) => [g.productId, g._sum.stock ?? 0]));
  // Sin stock = suma 0 O sin ninguna fila ProductSize (no aparece en grouped).
  const zeroStockIds = ids.filter((id) => (stockByProduct.get(id) ?? 0) <= 0);
  if (!zeroStockIds.length) return 0;
  const res = await db.product.updateMany({
    where: { id: { in: zeroStockIds } },
    data: { status: "DRAFT" },
  });
  await db.productAudit.createMany({
    data: zeroStockIds.map((productId) => ({
      productId,
      userId,
      action: "bulk_draft_zero_stock",
    })),
  });
  return res.count;
}

export async function bulkSetCategory(ids: string[], categoryId: string, userId?: string) {
  if (!ids.length) return 0;
  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: { categoryId },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_category",
      changes: { categoryId: { to: categoryId } } as Prisma.InputJsonValue,
    })),
  });
  return res.count;
}

/**
 * Bloque 3: asigna footwearType en lote. Solo productos de FAMILIA CALZADO.
 * Guard autoritativo (servidor): si algún seleccionado NO es calzado (textil/
 * accesorios) o no tiene primaryCategory (sin categorizar), aborta con error
 * enumerable. Doble validación con el cliente (que también filtra por isCalzado).
 */
export async function bulkSetFootwearType(
  ids: string[],
  footwearType: FootwearType | null,
  userId?: string,
) {
  if (!ids.length) return 0;
  const nonCalzadoWhere: Prisma.ProductWhereInput = {
    id: { in: ids },
    OR: [
      { primaryCategoryId: null }, // sin categorizar (los 6 del Bloque 2)
      { primaryCategory: { slug: { not: { endsWith: "-calzado" } } } }, // textil/accesorios
    ],
  };
  const nonCalzadoSample = await db.product.findMany({
    where: nonCalzadoWhere,
    select: { id: true, name: true },
    take: 3,
  });
  if (nonCalzadoSample.length > 0) {
    const total = await db.product.count({ where: nonCalzadoWhere });
    const names = nonCalzadoSample.map((p) => p.name).join('", "');
    throw new Error(
      `${total} producto(s) seleccionado(s) no son de calzado. Ejemplos: "${names}"${total > 3 ? " …" : ""}`,
    );
  }
  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: { footwearType },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_footweartype",
      changes: { footwearType: { to: footwearType } } as Prisma.InputJsonValue,
    })),
  });
  return res.count;
}

/**
 * Bloque 6: asigna garmentType en lote. Solo productos de FAMILIA TEXTIL.
 * Guard autoritativo (servidor): si algún seleccionado NO es textil (calzado/
 * accesorios) o no tiene primaryCategory (sin categorizar), aborta con error
 * enumerable. Doble validación con el cliente (que también filtra por isTextil).
 */
export async function bulkSetGarmentType(
  ids: string[],
  garmentType: GarmentType | null,
  userId?: string,
) {
  if (!ids.length) return 0;
  const nonTextilWhere: Prisma.ProductWhereInput = {
    id: { in: ids },
    OR: [
      { primaryCategoryId: null }, // sin categorizar (los 6 del Bloque 2)
      { primaryCategory: { slug: { not: { endsWith: "-textil" } } } }, // calzado/accesorios
    ],
  };
  const nonTextilSample = await db.product.findMany({
    where: nonTextilWhere,
    select: { id: true, name: true },
    take: 3,
  });
  if (nonTextilSample.length > 0) {
    const total = await db.product.count({ where: nonTextilWhere });
    const names = nonTextilSample.map((p) => p.name).join('", "');
    throw new Error(
      `${total} producto(s) seleccionado(s) no son de textil. Ejemplos: "${names}"${total > 3 ? " …" : ""}`,
    );
  }
  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: { garmentType },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_garmenttype",
      changes: { garmentType: { to: garmentType } } as Prisma.InputJsonValue,
    })),
  });
  return res.count;
}

/**
 * Bloque 6 §18 Fase 3.5: asigna garmentVariant en lote. Guard de FAMILIA vía
 * VARIANT_TO_TYPE: la variante solo aplica si el garmentType del producto coincide
 * con la familia esperada (p.ej. manga_corta solo sobre camiseta). Limpiar (null)
 * no aplica guard. Doble validación con el cliente.
 */
export async function bulkSetGarmentVariant(
  ids: string[],
  garmentVariant: GarmentVariant | null,
  userId?: string,
) {
  if (!ids.length) return 0;

  // Si el variant es null (limpiar), no hay guard de familia.
  if (garmentVariant !== null) {
    const expectedType = VARIANT_TO_TYPE[garmentVariant];
    const wrongFamilyWhere: Prisma.ProductWhereInput = {
      id: { in: ids },
      OR: [{ garmentType: null }, { garmentType: { not: expectedType } }],
    };
    const sample = await db.product.findMany({
      where: wrongFamilyWhere,
      select: { id: true, name: true },
      take: 3,
    });
    if (sample.length > 0) {
      const total = await db.product.count({ where: wrongFamilyWhere });
      const names = sample.map((p) => p.name).join('", "');
      throw new Error(
        `${total} producto(s) seleccionado(s) no son de ${expectedType}. Ejemplos: "${names}"${total > 3 ? " …" : ""}`,
      );
    }
  }

  const res = await db.product.updateMany({
    where: { id: { in: ids } },
    data: { garmentVariant },
  });
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_garmentvariant",
      changes: { garmentVariant: { to: garmentVariant } } as Prisma.InputJsonValue,
    })),
  });
  return res.count;
}

export async function bulkAddTags(ids: string[], tags: string[], userId?: string) {
  if (!ids.length || !tags.length) return 0;
  // Prisma no permite append a string[] sin raw. Hacemos read+write.
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, tags: true },
  });
  await db.$transaction(
    products.map((p) =>
      db.product.update({
        where: { id: p.id },
        data: { tags: Array.from(new Set([...p.tags, ...tags])) },
      }),
    ),
  );
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_add_tags",
      changes: { tags: { to: tags } } as Prisma.InputJsonValue,
    })),
  });
  return products.length;
}

export async function bulkDelete(ids: string[], userId?: string) {
  if (!ids.length) return 0;
  await db.productAudit.createMany({
    data: ids.map((productId) => ({
      productId,
      userId,
      action: "bulk_deleted",
    })),
  });
  const res = await db.product.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}
