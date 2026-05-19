/**
 * Zona Sport — procesador de jobs de importación XLSX (PRICAT).
 *
 * Estrategia:
 *   1. Marca el job RUNNING y registra startedAt.
 *   2. Itera el xlsx agrupando por `productKey` (modelo+Cód.color).
 *   3. Procesa los grupos en bloques de hasta BLOCK_SIZE filas dentro de
 *      transacciones cortas, para no exceder timeouts y mantener idempotencia.
 *   4. Upsert de Brand y Category por slug (creando si faltan).
 *   5. Upsert de Product por (source=LOCAL, externalId="pricat:<modelo>-<codcolor>").
 *      - Si `isCustomized`, no sobrescribe campos protegidos (name, slug, description,
 *        mainImageUrl, retailPrice, salePrice).
 *   6. Upsert de ProductSize por (productId, size).
 *   7. Audit log con la acción "imported" y diff básico.
 *   8. Acumula contadores (created/updated/error) y persiste estado periódicamente.
 *   9. Marca DONE/FAILED al final.
 */

import { Decimal } from "decimal.js";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";
import {
  iterPricatProductGroups,
  countPricatRows,
} from "./xlsx";
import type { NormalizedPricatRow } from "./normalize";

const BLOCK_SIZE = 50; // grupos de producto procesados por transacción
const PROGRESS_FLUSH_EVERY = 100; // filas

export type ImportMode = "create_update" | "create_only" | "update_only";

export interface ProcessJobOptions {
  dryRun?: boolean;
  onProgress?: (state: {
    processedRows: number;
    createdRows: number;
    updatedRows: number;
    errorRows: number;
    totalRows: number;
  }) => void;
}

export interface ImportError {
  row: number;
  code: string;
  message: string;
}

interface JobOptionsPayload {
  mode?: ImportMode;
  defaultStatus?: "DRAFT" | "ACTIVE" | "INACTIVE";
  defaultCategorySlug?: string;
}

// ---------------------------------------------------------------------------
// Cache en memoria de Brand/Category para evitar N consultas
// ---------------------------------------------------------------------------

class TaxonomyCache {
  private brands = new Map<string, string>(); // name → id
  private categories = new Map<string, string>(); // name → id

  async getBrandId(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const key = name.trim();
    if (!key) throw new Error("Marca vacía");
    const cached = this.brands.get(key);
    if (cached) return cached;

    const slug = slugifyEs(key);
    const existing = await tx.brand.findFirst({
      where: { OR: [{ name: key }, { slug }] },
      select: { id: true, name: true },
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
    const key = name.trim();
    if (!key) throw new Error("Categoría vacía");
    const cached = this.categories.get(key);
    if (cached) return cached;

    const slug = slugifyEs(key);
    const existing = await tx.category.findFirst({
      where: { OR: [{ name: key }, { slug }] },
      select: { id: true, name: true },
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

  async resolveDefaultCategoryId(
    tx: Prisma.TransactionClient,
    slug: string | undefined,
  ): Promise<string | null> {
    if (!slug) return null;
    const found = await tx.category.findUnique({ where: { slug }, select: { id: true } });
    return found?.id ?? null;
  }
}

// ---------------------------------------------------------------------------
// Util: Decimal → Prisma.Decimal-compatible (Prisma acepta strings y decimal.js)
// ---------------------------------------------------------------------------

function dec(v: Decimal | null | undefined): Prisma.Decimal | null {
  if (!v) return null;
  // Prisma acepta strings y los convierte internamente; decimal.js también encaja.
  return v.toFixed(2) as unknown as Prisma.Decimal;
}

// ---------------------------------------------------------------------------
// Genera slug único de producto consultando la BD
// ---------------------------------------------------------------------------

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
// Diff helper (campos clave para audit)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Procesa un grupo (1 producto + N tallas) dentro de una transacción
// ---------------------------------------------------------------------------

interface GroupResult {
  created: boolean;
  updated: boolean;
  errors: ImportError[];
  // Para post-procesado de imágenes después de la transacción
  productId: string | null;
  productName: string;
  imageUrl: string | null;
  externalId: string;
}

async function processGroup(
  tx: Prisma.TransactionClient,
  taxonomy: TaxonomyCache,
  rows: NormalizedPricatRow[],
  options: {
    mode: ImportMode;
    defaultStatus: "DRAFT" | "ACTIVE" | "INACTIVE";
    defaultCategoryId: string | null;
  },
): Promise<GroupResult> {
  const head = rows[0];
  if (!head) {
    return {
      created: false,
      updated: false,
      errors: [],
      productId: null,
      productName: "",
      imageUrl: null,
      externalId: "",
    };
  }
  const meta = {
    productName: head.name,
    imageUrl: head.imageUrl,
    externalId: head.externalId,
  };

  // Filas error inyectadas por el reader: registrar y salir
  if (head.name.startsWith("__ERROR__:")) {
    return {
      created: false,
      updated: false,
      errors: [
        {
          row: head.rowNumber,
          code: head.modelArticleCode || "—",
          message: head.name.replace("__ERROR__:", "Fila inválida: "),
        },
      ],
      productId: null,
      ...meta,
    };
  }

  const errors: ImportError[] = [];

  if (!head.brand) {
    errors.push({
      row: head.rowNumber,
      code: head.modelArticleCode,
      message: "Marca vacía",
    });
    return { created: false, updated: false, errors, productId: null, ...meta };
  }
  if (!head.type && !options.defaultCategoryId) {
    errors.push({
      row: head.rowNumber,
      code: head.modelArticleCode,
      message: "Tipo (categoría) vacío y sin defaultCategory configurada",
    });
    return { created: false, updated: false, errors, productId: null, ...meta };
  }
  if (head.retailPrice === null) {
    errors.push({
      row: head.rowNumber,
      code: head.modelArticleCode,
      message: "PVP no parseable o vacío",
    });
    return { created: false, updated: false, errors, productId: null, ...meta };
  }

  const brandId = await taxonomy.getBrandId(tx, head.brand);
  const categoryId =
    options.defaultCategoryId ?? (await taxonomy.getCategoryId(tx, head.type));

  // Estado: si CUALQUIER fila del grupo está "B", el producto se marca INACTIVE
  const anyInactive = rows.some((r) => r.status === "INACTIVE");
  const effectiveStatus = anyInactive ? "INACTIVE" : options.defaultStatus;

  // Stock estimado: sumamos tallas (sin stock real en PRICAT → 0)
  const stockTotal = 0;

  // Buscar existente por @@unique([source, externalId])
  const existing = await tx.product.findUnique({
    where: {
      source_externalId: {
        source: "LOCAL",
        externalId: head.externalId,
      },
    },
  });

  if (!existing && options.mode === "update_only") {
    return { created: false, updated: false, errors, productId: null, ...meta };
  }
  if (existing && options.mode === "create_only") {
    return {
      created: false,
      updated: false,
      errors,
      productId: existing.id,
      ...meta,
    };
  }

  // Construir payload base
  const baseData = {
    brandId,
    categoryId,
    source: "LOCAL" as const,
    externalId: head.externalId,
    modelCode: head.modelCode,
    colorName: head.colorName,
    gender: head.gender,
    sportUse: head.sportUse || null,
    composition: head.composition || null,
    costPrice: dec(head.costPrice),
    retailPrice: dec(head.retailPrice) ?? ("0.00" as unknown as Prisma.Decimal),
    status: effectiveStatus,
    stock: stockTotal,
  };

  let productId: string;
  let created = false;
  let updated = false;

  if (!existing) {
    const slug = await buildUniqueProductSlug(tx, head.name);
    const createdProduct = await tx.product.create({
      data: {
        ...baseData,
        name: head.name,
        slug,
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
          source: "LOCAL",
          externalId: head.externalId,
          name: head.name,
          brand: head.brand,
          category: head.type,
          retailPrice: head.retailPrice?.toFixed(2) ?? null,
          status: effectiveStatus,
        }) as unknown as Prisma.InputJsonValue,
      },
    });
  } else {
    // Producto existe. Si isCustomized, NO sobreescribimos campos protegidos.
    const updateData: Prisma.ProductUpdateInput = {
      brand: { connect: { id: brandId } },
      category: { connect: { id: categoryId } },
      modelCode: baseData.modelCode,
      colorName: baseData.colorName,
      gender: baseData.gender,
      sportUse: baseData.sportUse,
      composition: baseData.composition,
      costPrice: baseData.costPrice,
      status: baseData.status,
    };

    if (!existing.isCustomized) {
      updateData.name = head.name;
      updateData.retailPrice = baseData.retailPrice;
      // Slug solo si el nombre cambia y no hay colisión
      if (existing.name !== head.name) {
        updateData.slug = await buildUniqueProductSlug(tx, head.name, existing.id);
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

  // Procesar tallas: cada fila del grupo es una talla (o "única" → sin sizes)
  const sizesInRow = rows.filter((r) => r.size).map((r) => r);

  if (sizesInRow.length === 0) {
    // producto sin tallas: garantizamos que no hay ProductSize ligados a este Product
    // (no borramos para evitar cascadas accidentales; simplemente no añadimos).
  } else {
    for (const r of sizesInRow) {
      const sizeRetail = r.retailPrice ? dec(r.retailPrice) : null;
      const sizeCost = r.costPrice ? dec(r.costPrice) : null;
      try {
        await tx.productSize.upsert({
          where: {
            productId_size: { productId, size: r.size },
          },
          create: {
            productId,
            size: r.size,
            ean: r.ean,
            stock: 0,
            costPrice: sizeCost,
            retailPrice: sizeRetail,
          },
          update: {
            ean: r.ean,
            costPrice: sizeCost,
            retailPrice: sizeRetail,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push({
          row: r.rowNumber,
          code: r.modelArticleCode,
          message: `Error guardando talla "${r.size}": ${msg}`,
        });
      }
    }
  }

  return { created, updated, errors, productId, ...meta };
}

// ---------------------------------------------------------------------------
// Post-procesado de imágenes (fuera de la transacción del bloque).
// Para cada producto con imageUrl, descarga la imagen del proveedor,
// la procesa (sharp 3 variantes + LQIP) y la sube a Vercel Blob.
// Si tiene éxito: setea mainImageUrl y publica el producto (ACTIVE).
// Si falla: el producto se queda en DRAFT — el cliente quiere "100% ese
// producto o no lo pongas".
// Concurrencia limitada para no saturar el origen.
// ---------------------------------------------------------------------------

interface ImagePostProcessingItem {
  productId: string;
  productName: string;
  imageUrl: string;
  externalId: string;
}

interface ImagePostProcessingResult {
  succeeded: number;
  failed: number;
  errors: ImportError[];
}

async function processImageBatch(
  items: ImagePostProcessingItem[],
  concurrency: number,
  publishOnSuccess: boolean,
): Promise<ImagePostProcessingResult> {
  if (items.length === 0) {
    return { succeeded: 0, failed: 0, errors: [] };
  }

  // Imports tardíos: estos módulos solo se cargan si hay imágenes que procesar,
  // evitando que el script CLI falle por BlobConfigError si no se va a usar.
  const { fetchImageBytes } = await import("./fetch-image");
  const { uploadProductImage, BlobConfigError } = await import("@/lib/blob/upload");
  const { db } = await import("@/lib/db");

  const result: ImagePostProcessingResult = { succeeded: 0, failed: 0, errors: [] };

  // Pool de workers con concurrencia limitada.
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

        // uploadProductImage procesa con sharp + sube Blob + crea ProductImage
        const uploaded = await uploadProductImage(fetched.buffer, {
          productId: it.productId,
          alt: it.productName,
          sourceType: "url-external",
          originalUrl: fetched.finalUrl,
        });

        // Actualiza el Product con la URL principal y publica si está configurado.
        await db.product.update({
          where: { id: it.productId },
          data: {
            mainImageUrl: uploaded.url,
            ...(publishOnSuccess
              ? { status: "ACTIVE", publishedAt: new Date() }
              : {}),
          },
        });

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
        // Si es BlobConfigError, abortamos el resto: no tiene sentido seguir.
        if (err instanceof BlobConfigError) {
          cursor = items.length;
          return;
        }
      }
    }
  };

  for (let i = 0; i < Math.min(concurrency, items.length); i += 1) {
    workers.push(work());
  }
  await Promise.all(workers);
  return result;
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

export async function processImportJob(
  jobId: string,
  opts: ProcessJobOptions = {},
): Promise<void> {
  const log = (msg: string) => {
    console.log(`[import:process ${jobId}] ${msg}`);
  };

  // Breadcrumbs persistidos en `errors[]` con code "INFO". El cliente los
  // muestra junto a los errores reales para diagnosticar dónde se atascó
  // un job sin tener que mirar logs de Vercel.
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
  const defaultCategorySlug = optsPayload.defaultCategorySlug;

  const filePath = job.fileUrl;
  await breadcrumb("INFO", `Leyendo fichero: ${filePath}`);

  // Marcar RUNNING + total
  let totalRows = 0;
  try {
    totalRows = await countPricatRows(filePath);
    await breadcrumb("INFO", `Filas contadas: ${totalRows}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`FAIL countPricatRows: ${message}`);
    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        startedAt: new Date(),
        finishedAt: new Date(),
        errors: [
          ...breadcrumbs,
          { row: 0, code: "FILE", message: `No se pudo abrir el fichero: ${message}` },
        ] as unknown as Prisma.InputJsonValue,
      },
    });
    return;
  }

  await db.importJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      totalRows,
      processedRows: 0,
      createdRows: 0,
      updatedRows: 0,
      errorRows: 0,
      // No vaciamos errors[]: conservamos los breadcrumbs INFO de arranque
      // para que se vean en el polling. Los errores reales se acumulan
      // encima vía flushProgress.
      errors: breadcrumbs as unknown as Prisma.InputJsonValue,
    },
  });
  await breadcrumb("INFO", `Estado RUNNING · iniciando procesado de ${totalRows} filas`);

  let processedRows = 0;
  let createdRows = 0;
  let updatedRows = 0;
  let errorRows = 0;
  const errors: ImportError[] = [];
  const MAX_STORED_ERRORS = 500;

  const taxonomy = new TaxonomyCache();

  // Resolver categoría por defecto si se indicó
  let defaultCategoryId: string | null = null;
  if (defaultCategorySlug) {
    defaultCategoryId = await db.category.findUnique({
      where: { slug: defaultCategorySlug },
      select: { id: true },
    }).then((c) => c?.id ?? null);
  }

  const flushProgress = async (force = false) => {
    if (!force && processedRows % PROGRESS_FLUSH_EVERY !== 0) return;
    if (!opts.dryRun) {
      await db.importJob.update({
        where: { id: jobId },
        data: {
          processedRows,
          createdRows,
          updatedRows,
          errorRows,
          errors: errors.slice(0, MAX_STORED_ERRORS) as unknown as Prisma.InputJsonValue,
        },
      });
    }
    opts.onProgress?.({ processedRows, createdRows, updatedRows, errorRows, totalRows });
  };

  // Iterar grupos y procesar en bloques transaccionales
  let buffer: { productKey: string; rows: NormalizedPricatRow[] }[] = [];
  let bufferRows = 0;

  const flushBuffer = async () => {
    if (buffer.length === 0) return;
    if (opts.dryRun) {
      for (const group of buffer) {
        processedRows += group.rows.length;
        // contar como "create" en dry-run sólo si NO existe
        const exists = await db.product.findUnique({
          where: {
            source_externalId: { source: "LOCAL", externalId: group.rows[0]!.externalId },
          },
          select: { id: true },
        });
        if (exists) updatedRows += 1;
        else createdRows += 1;
      }
      buffer = [];
      bufferRows = 0;
      await flushProgress(true);
      return;
    }

    // Imágenes a procesar después del commit de la transacción (FUERA de la tx,
    // porque la descarga http puede tardar y no debemos bloquear conexiones).
    const pendingImages: ImagePostProcessingItem[] = [];

    try {
      await db.$transaction(
        async (tx) => {
          for (const group of buffer) {
            const result = await processGroup(tx, taxonomy, group.rows, {
              mode,
              defaultStatus,
              defaultCategoryId,
            });
            processedRows += group.rows.length;
            if (result.created) createdRows += 1;
            if (result.updated) updatedRows += 1;
            if (result.errors.length > 0) {
              errorRows += result.errors.length;
              for (const e of result.errors) {
                if (errors.length < MAX_STORED_ERRORS) errors.push(e);
              }
            }
            if (result.productId && result.imageUrl) {
              pendingImages.push({
                productId: result.productId,
                productName: result.productName,
                imageUrl: result.imageUrl,
                externalId: result.externalId,
              });
            }
          }
        },
        { maxWait: 15000, timeout: 60000 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Si la transacción del bloque falla entero, registramos un único error por bloque
      for (const group of buffer) {
        errors.push({
          row: group.rows[0]?.rowNumber ?? 0,
          code: group.rows[0]?.modelArticleCode ?? "—",
          message: `Transacción de bloque fallida: ${message}`,
        });
        errorRows += group.rows.length;
        processedRows += group.rows.length;
      }
    }

    // Procesar imágenes en paralelo (concurrencia limitada) tras commit del bloque.
    // El cliente exige "100% ese producto si no, no lo pongas": solo publicamos
    // (ACTIVE) los productos cuya imagen oficial se descargó con éxito. Resto
    // se queda en DRAFT.
    if (pendingImages.length > 0) {
      const imgResult = await processImageBatch(pendingImages, 5, true);
      if (imgResult.errors.length > 0) {
        for (const e of imgResult.errors) {
          if (errors.length < MAX_STORED_ERRORS) errors.push(e);
        }
      }
      if (imgResult.failed > 0) {
        console.warn(
          `[import-job] bloque: ${imgResult.succeeded} imgs OK · ${imgResult.failed} fallidas (productos quedan en DRAFT)`,
        );
      }
    }

    buffer = [];
    bufferRows = 0;
    await flushProgress(true);
  };

  try {
    for await (const group of iterPricatProductGroups(filePath)) {
      buffer.push(group);
      bufferRows += group.rows.length;
      if (buffer.length >= BLOCK_SIZE || bufferRows >= BLOCK_SIZE * 2) {
        await flushBuffer();
      }
    }
    await flushBuffer();

    await db.importJob.update({
      where: { id: jobId },
      data: {
        status: opts.dryRun ? "DONE" : "DONE",
        processedRows,
        createdRows,
        updatedRows,
        errorRows,
        errors: errors as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
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
