/**
 * Zona Sport — procesador de jobs de importación WooCommerce CSV.
 *
 * Análogo a `process-job.ts` (PRICAT), pero con las particularidades del
 * export nativo de WooCommerce:
 *
 *   1. Lee el CSV completo con `parseWooCommerceFile` (es streaming, pero
 *      acumula resultados en memoria — para 3 MB / 5k filas es OK).
 *   2. Por cada grupo (Padre variable + variations | simple) hace upsert de
 *      Brand y Category por slug, luego upsert de Product por
 *      (source=LOCAL, externalId=`woocommerce:<wooId>`).
 *   3. Las filas variation se convierten en ProductSize por
 *      (productId, size).
 *   4. Las imágenes se descargan/suben FUERA de la transacción de cada
 *      bloque, igual que el flujo PRICAT, con concurrencia limitada.
 *   5. Persiste breadcrumbs en `ImportJob.errors[]` con code "INFO" para
 *      que el cliente vea el progreso en tiempo real en
 *      `/admin/importar/woocommerce`.
 *
 * Idempotencia: el upsert por (source, externalId) garantiza que se puede
 * relanzar el job sobre el mismo CSV sin duplicar productos.
 */

import { Decimal } from "decimal.js";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";
import { parseWooCommerceFile } from "./woocommerce";
import type { WooNormalizedParent, WooNormalizedVariation, WooProductGroup } from "./woocommerce";
import { classifyToTree } from "./classify-to-tree";

const BLOCK_SIZE = 30; // grupos procesados en una transacción
const MAX_STORED_ERRORS = 500;

export type ImportMode = "create_update" | "create_only" | "update_only";

interface JobOptionsPayload {
  mode?: ImportMode;
  defaultStatus?: "DRAFT" | "ACTIVE" | "INACTIVE";
  defaultCategorySlug?: string;
}

interface ImportError {
  row: number;
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Cache Brand/Category (igual estrategia que PRICAT)
// ---------------------------------------------------------------------------

class TaxonomyCache {
  private brands = new Map<string, string>();
  private categories = new Map<string, string>();
  private treeBySlug = new Map<string, string>();

  async getBrandId(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const key = name.trim() || "Sin Marca";
    const cached = this.brands.get(key);
    if (cached) return cached;

    const slug = slugifyEs(key);
    const existing = await tx.brand.findFirst({
      where: { OR: [{ name: key }, { slug }] },
      select: { id: true },
    });
    if (existing) {
      this.brands.set(key, existing.id);
      return existing.id;
    }
    const uniqueBrandSlug = await uniqueSlug(
      slug,
      async (s) => (await tx.brand.count({ where: { slug: s } })) > 0,
    );
    const created = await tx.brand.create({
      data: { name: key, slug: uniqueBrandSlug },
      select: { id: true },
    });
    this.brands.set(key, created.id);
    return created.id;
  }

  async getCategoryId(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const key = name.trim() || "Sin Categoría";
    const cached = this.categories.get(key);
    if (cached) return cached;

    const slug = slugifyEs(key);
    const existing = await tx.category.findFirst({
      where: { OR: [{ name: key }, { slug }] },
      select: { id: true },
    });
    if (existing) {
      this.categories.set(key, existing.id);
      return existing.id;
    }
    const uniqueCategorySlug = await uniqueSlug(
      slug,
      async (s) => (await tx.category.count({ where: { slug: s } })) > 0,
    );
    const created = await tx.category.create({
      data: { name: key, slug: uniqueCategorySlug },
      select: { id: true },
    });
    this.categories.set(key, created.id);
    return created.id;
  }

  async resolveTreeSlugs(tx: Prisma.TransactionClient, slugs: string[]): Promise<Map<string, string>> {
    // devuelve slug→id solo de las que existan; cachea
    const out = new Map<string, string>();
    const missing = slugs.filter((s) => !this.treeBySlug.has(s));
    if (missing.length) {
      const found = await tx.category.findMany({ where: { slug: { in: missing } }, select: { id: true, slug: true } });
      for (const c of found) this.treeBySlug.set(c.slug, c.id);
    }
    for (const s of slugs) { const id = this.treeBySlug.get(s); if (id) out.set(s, id); }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dec(v: Decimal | null | undefined): Prisma.Decimal | null {
  if (!v) return null;
  return v.toFixed(2) as unknown as Prisma.Decimal;
}

function buildDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    const a = after[k];
    const b = before ? before[k] : undefined;
    const norm = (v: unknown) => (v === undefined || v === null ? null : String(v));
    if (norm(a) !== norm(b)) diff[k] = { from: b ?? null, to: a ?? null };
  }
  return diff;
}

async function buildUniqueProductSlug(
  tx: Prisma.TransactionClient,
  name: string,
  excludeProductId?: string,
): Promise<string> {
  const base = slugifyEs(name);
  return uniqueSlug(base, async (s) => {
    const found = await tx.product.findUnique({ where: { slug: s }, select: { id: true } });
    if (!found) return false;
    if (excludeProductId && found.id === excludeProductId) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Procesa un grupo Padre + variations dentro de la transacción
// ---------------------------------------------------------------------------

interface GroupResult {
  created: boolean;
  updated: boolean;
  errors: ImportError[];
  productId: string | null;
  productName: string;
  images: { url: string; position: number }[];
  externalId: string;
}

async function processGroup(
  tx: Prisma.TransactionClient,
  taxonomy: TaxonomyCache,
  group: WooProductGroup,
  options: { mode: ImportMode; defaultStatus: "DRAFT" | "ACTIVE" | "INACTIVE" },
): Promise<GroupResult> {
  const p = group.parent;
  const errors: ImportError[] = [];
  const meta = {
    productName: p.name,
    images: [
      ...(p.mainImageUrl ? [{ url: p.mainImageUrl, position: 0 }] : []),
      ...p.extraImageUrls.map((u, i) => ({ url: u, position: i + 1 })),
    ],
    externalId: p.externalId,
  };

  if (!p.name) {
    errors.push({
      row: p.rowNumber,
      code: "NO_NAME",
      message: `Fila ${p.rowNumber}: producto sin nombre`,
    });
    return { created: false, updated: false, errors, productId: null, ...meta };
  }
  if (!p.retailPrice) {
    errors.push({
      row: p.rowNumber,
      code: "NO_PRICE",
      message: `Fila ${p.rowNumber}: producto "${p.sku}" sin precio normal ni en variations`,
    });
    return { created: false, updated: false, errors, productId: null, ...meta };
  }

  const brandId = await taxonomy.getBrandId(tx, p.brand);

  // Clasificación en la taxonomía canónica nueva
  const tree = classifyToTree(p.name, p.gender, p.brand);
  const treeIds = tree.categorySlugs.length ? await taxonomy.resolveTreeSlugs(tx, tree.categorySlugs) : new Map<string, string>();
  const primaryId = tree.primarySlug ? treeIds.get(tree.primarySlug) ?? null : null;
  // categoryId legacy: la principal del árbol si existe; si no, fallback al método viejo (getCategoryId por nombre)
  // para no romper el FK requerido.
  const categoryId = primaryId ?? (await taxonomy.getCategoryId(tx, p.category));

  // Si el padre estaba publicado en Woo pero el operador pide DRAFT, respetamos.
  // Si el padre estaba en DRAFT/INACTIVE en Woo, sobrescribe a INACTIVE/DRAFT.
  const effectiveStatus =
    p.status === "INACTIVE" ? "INACTIVE" : options.defaultStatus;

  // Stock = suma de variations (si simple, ya viene en p.stock)
  const stockTotal = p.isSimple
    ? p.stock
    : group.variations.reduce((sum, v) => sum + (v.stock || 0), 0);

  const existing = await tx.product.findUnique({
    where: { source_externalId: { source: "LOCAL", externalId: p.externalId } },
  });

  if (!existing && options.mode === "update_only") {
    return { created: false, updated: false, errors, productId: null, ...meta };
  }
  if (existing && options.mode === "create_only") {
    return { created: false, updated: false, errors, productId: existing.id, ...meta };
  }

  // Payload común
  const commonData = {
    brandId,
    categoryId,
    primaryCategoryId: primaryId,
    footwearType: tree.footwearType,
    garmentType: tree.garmentType,
    source: "LOCAL" as const,
    externalId: p.externalId,
    modelCode: p.modelCode,
    sku: p.sku || null,
    colorName: p.colorName,
    gender: p.gender,
    costPrice: dec(p.costPrice),
    retailPrice: dec(p.retailPrice) ?? ("0.00" as unknown as Prisma.Decimal),
    salePrice: dec(p.salePrice),
    status: effectiveStatus,
    stock: stockTotal,
    weight: p.weight ? (p.weight.toFixed(3) as unknown as Prisma.Decimal) : null,
    tags: p.tags,
  };

  let productId: string;
  let created = false;
  let updated = false;

  if (!existing) {
    const slug = await buildUniqueProductSlug(tx, p.name);
    const createdProduct = await tx.product.create({
      data: {
        ...commonData,
        name: p.name,
        slug,
        shortName: p.shortName,
        description: p.description,
      },
      select: { id: true },
    });
    productId = createdProduct.id;
    created = true;

    await tx.productAudit.create({
      data: {
        productId,
        action: "imported",
        changes: buildDiff(null, {
          source: "WOOCOMMERCE",
          externalId: p.externalId,
          name: p.name,
          brand: p.brand,
          category: p.category,
          retailPrice: p.retailPrice?.toFixed(2) ?? null,
          status: effectiveStatus,
        }) as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    // Si el producto ya existe con isCustomized, no tocamos nombre/desc/slug/precios.
    const updateData: Prisma.ProductUpdateInput = {
      brand: { connect: { id: brandId } },
      category: { connect: { id: categoryId } },
      primaryCategory: primaryId ? { connect: { id: primaryId } } : { disconnect: true },
      footwearType: commonData.footwearType,
      garmentType: commonData.garmentType,
      modelCode: commonData.modelCode,
      sku: commonData.sku,
      colorName: commonData.colorName,
      gender: commonData.gender,
      costPrice: commonData.costPrice,
      stock: commonData.stock,
      weight: commonData.weight,
      tags: { set: commonData.tags },
      status: commonData.status,
    };

    if (!existing.isCustomized) {
      updateData.name = p.name;
      updateData.shortName = p.shortName;
      updateData.description = p.description;
      updateData.retailPrice = commonData.retailPrice;
      updateData.salePrice = commonData.salePrice;
      if (existing.name !== p.name) {
        updateData.slug = await buildUniqueProductSlug(tx, p.name, existing.id);
      }
    }

    const after = await tx.product.update({
      where: { id: existing.id },
      data: updateData,
      select: { id: true, name: true, retailPrice: true, status: true },
    });
    productId = after.id;
    updated = true;

    await tx.productAudit.create({
      data: {
        productId,
        action: "imported",
        changes: buildDiff(
          {
            name: existing.name,
            retailPrice: existing.retailPrice?.toString() ?? null,
            status: existing.status,
          },
          {
            name: after.name,
            retailPrice: after.retailPrice?.toString() ?? null,
            status: after.status,
          },
        ) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // M2M ProductCategory: enlaza el producto con las categorías del árbol canónico.
  // REPLACE idempotente: borra el m2m previo y recrea. Si el producto es UNCLASSIFIED
  // (treeIds vacío), no toca m2m — queda en DRAFT para revisión manual del admin.
  const idsToLink = Array.from(treeIds.values());
  if (idsToLink.length) {
    await tx.productCategory.deleteMany({ where: { productId } });
    await tx.productCategory.createMany({
      data: idsToLink.map((categoryId) => ({ productId, categoryId })),
      skipDuplicates: true,
    });
  }

  // Tallas (solo si NO es simple)
  if (!p.isSimple && group.variations.length > 0) {
    for (const v of group.variations) {
      if (!v.size) continue;
      try {
        await tx.productSize.upsert({
          where: { productId_size: { productId, size: v.size } },
          create: {
            productId,
            size: v.size,
            ean: v.ean,
            stock: v.stock || 0,
            costPrice: dec(v.costPrice),
            retailPrice: dec(v.retailPrice),
          },
          update: {
            ean: v.ean,
            stock: v.stock || 0,
            costPrice: dec(v.costPrice),
            retailPrice: dec(v.retailPrice),
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          row: v.rowNumber,
          code: v.sku,
          message: `Error guardando talla "${v.size}": ${msg}`,
        });
      }
    }
  }

  return { created, updated, errors, productId, ...meta };
}

// ---------------------------------------------------------------------------
// Post-procesado de imágenes (fuera de la transacción)
// ---------------------------------------------------------------------------

interface ImageItem {
  productId: string;
  productName: string;
  imageUrl: string;
  position: number;
  isPrimary: boolean;
  externalId: string;
}

async function processImageBatch(
  items: ImageItem[],
  concurrency: number,
  publishOnSuccess: boolean,
): Promise<{ succeeded: number; failed: number; errors: ImportError[] }> {
  if (items.length === 0) return { succeeded: 0, failed: 0, errors: [] };

  const { fetchImageBytes } = await import("./fetch-image");
  const { uploadProductImage, BlobConfigError } = await import("@/lib/blob/upload");
  const { db } = await import("@/lib/db");

  const result = { succeeded: 0, failed: 0, errors: [] as ImportError[] };
  let cursor = 0;
  const workers: Promise<void>[] = [];

  const work = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      const it = items[idx]!;
      try {
        const fetched = await fetchImageBytes(it.imageUrl);
        if (!fetched.ok) {
          result.failed += 1;
          result.errors.push({
            row: 0,
            code: it.externalId,
            message: `Imagen no descargable (${it.imageUrl}): ${fetched.error}`,
          });
          continue;
        }
        const uploaded = await uploadProductImage(fetched.buffer, {
          productId: it.productId,
          alt: it.productName,
          sourceType: "url-external",
          originalUrl: fetched.finalUrl,
          position: it.position,
        });

        if (it.isPrimary) {
          await db.product.update({
            where: { id: it.productId },
            data: {
              mainImageUrl: uploaded.url,
              ...(publishOnSuccess ? { status: "ACTIVE", publishedAt: new Date() } : {}),
            },
          });
        }
        result.succeeded += 1;
      } catch (err) {
        result.failed += 1;
        const msg =
          err instanceof BlobConfigError
            ? "Vercel Blob no configurado (falta BLOB_READ_WRITE_TOKEN)"
            : err instanceof Error
              ? err.message
              : String(err);
        result.errors.push({
          row: 0,
          code: it.externalId,
          message: `Subida fallida: ${msg}`,
        });
        if (err instanceof BlobConfigError) {
          cursor = items.length;
          return;
        }
      }
    }
  };

  for (let i = 0; i < Math.min(concurrency, items.length); i += 1) workers.push(work());
  await Promise.all(workers);
  return result;
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

export async function processWooCommerceImportJob(jobId: string): Promise<void> {
  const log = (msg: string) => {
    console.log(`[import:woo ${jobId}] ${msg}`);
  };

  const breadcrumbs: ImportError[] = [];
  const breadcrumb = async (code: string, message: string) => {
    log(`${code}: ${message}`);
    breadcrumbs.push({ row: 0, code, message: message.slice(0, 300) });
    await db.importJob
      .update({
        where: { id: jobId },
        data: { errors: breadcrumbs as unknown as Prisma.InputJsonValue },
      })
      .catch(() => {});
  };

  await breadcrumb("INFO", `Job arrancado · ${new Date().toISOString()}`);

  const job = await db.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`ImportJob ${jobId} no existe`);
  if (!job.fileUrl) throw new Error(`ImportJob ${jobId} sin fileUrl`);

  const optsPayload: JobOptionsPayload =
    (job.options as JobOptionsPayload | null | undefined) ?? {};
  const mode: ImportMode = optsPayload.mode ?? "create_update";
  const defaultStatus = optsPayload.defaultStatus ?? "DRAFT";

  await breadcrumb("INFO", `Leyendo fichero: ${job.fileUrl}`);

  let parsedGroups: WooProductGroup[] = [];
  let parseErrors: ImportError[] = [];
  let totalRows = 0;
  try {
    const parsed = await parseWooCommerceFile(job.fileUrl);
    parsedGroups = parsed.groups;
    parseErrors = parsed.errors;
    totalRows = parsed.totalRows;
    await breadcrumb(
      "INFO",
      `Filas parseadas: ${totalRows} · Productos lógicos: ${parsedGroups.length} · Variations huérfanas/errores: ${parseErrors.length}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`FAIL parse: ${message}`);
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        startedAt: new Date(),
        finishedAt: new Date(),
        errors: [
          ...breadcrumbs,
          { row: 0, code: "FILE", message: `No se pudo leer el CSV: ${message}` },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    return;
  }

  // RUNNING + total
  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      totalRows: parsedGroups.length,
      processedRows: 0,
      createdRows: 0,
      updatedRows: 0,
      errorRows: 0,
      errors: breadcrumbs as unknown as Prisma.InputJsonValue,
    },
  });
  await breadcrumb(
    "INFO",
    `Estado RUNNING · ${parsedGroups.length} productos a procesar`,
  );

  let processedRows = 0;
  let createdRows = 0;
  let updatedRows = 0;
  let errorRows = 0;
  const errors: ImportError[] = [...breadcrumbs];
  // Inyectamos errores del parseo iniciales
  for (const e of parseErrors) {
    if (errors.length < MAX_STORED_ERRORS) errors.push(e);
  }
  errorRows += parseErrors.length;

  const taxonomy = new TaxonomyCache();

  const flushProgress = async () => {
    await db.importJob
      .update({
        where: { id: jobId },
        data: {
          processedRows,
          createdRows,
          updatedRows,
          errorRows,
          errors: errors.slice(0, MAX_STORED_ERRORS) as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => {});
  };

  try {
    // Procesado en bloques: una transacción cada BLOCK_SIZE grupos.
    for (let i = 0; i < parsedGroups.length; i += BLOCK_SIZE) {
      const slice = parsedGroups.slice(i, i + BLOCK_SIZE);
      const pendingImages: ImageItem[] = [];

      try {
        await db.$transaction(
          async (tx) => {
            for (const group of slice) {
              const result = await processGroup(tx, taxonomy, group, {
                mode,
                defaultStatus,
              });
              processedRows += 1;
              if (result.created) createdRows += 1;
              if (result.updated) updatedRows += 1;
              if (result.errors.length > 0) {
                errorRows += result.errors.length;
                for (const e of result.errors) {
                  if (errors.length < MAX_STORED_ERRORS) errors.push(e);
                }
              }
              if (result.productId && result.images.length > 0) {
                result.images.forEach((img, idx) => {
                  pendingImages.push({
                    productId: result.productId!,
                    productName: result.productName,
                    imageUrl: img.url,
                    position: img.position,
                    isPrimary: idx === 0,
                    externalId: result.externalId,
                  });
                });
              }
            }
          },
          { maxWait: 15000, timeout: 60000 },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        for (const group of slice) {
          errors.push({
            row: group.parent.rowNumber,
            code: group.parent.sku || group.parent.wooId,
            message: `Transacción de bloque fallida: ${message}`,
          });
        }
        errorRows += slice.length;
        processedRows += slice.length;
      }

      await breadcrumb(
        "INFO",
        `Bloque ${Math.floor(i / BLOCK_SIZE) + 1} · procesados ${processedRows}/${parsedGroups.length} (creados: ${createdRows}, actualizados: ${updatedRows})`,
      );

      // Imágenes: lanzamos descarga en background tras el commit del bloque.
      // Limitamos concurrencia para no saturar el origen.
      if (pendingImages.length > 0) {
        // Marcamos breadcrumb para que el cliente vea actividad
        await breadcrumb(
          "INFO",
          `Descargando ${pendingImages.length} imágenes del bloque ${Math.floor(i / BLOCK_SIZE) + 1}…`,
        );
        const imgResult = await processImageBatch(pendingImages, 4, true);
        if (imgResult.errors.length > 0) {
          for (const e of imgResult.errors) {
            if (errors.length < MAX_STORED_ERRORS) errors.push(e);
          }
        }
        await breadcrumb(
          "INFO",
          `Imágenes bloque: OK=${imgResult.succeeded} · KO=${imgResult.failed}`,
        );
      }

      await flushProgress();
    }

    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "DONE",
        processedRows,
        createdRows,
        updatedRows,
        errorRows,
        errors: errors as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
    await breadcrumb(
      "INFO",
      `Job DONE · ${createdRows} creados · ${updatedRows} actualizados · ${errorRows} errores`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push({ row: 0, code: "FATAL", message });
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        processedRows,
        createdRows,
        updatedRows,
        errorRows,
        errors: errors as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

// Marca para evitar unused-import lint warning del tipo
export type { WooNormalizedParent, WooNormalizedVariation };
