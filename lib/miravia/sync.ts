/**
 * Zona Sport â€” sincronización Miravia.
 *
 * Crea un ImportJob source=MIRAVIA y recorre el catálogo aplicando upsert
 * por (source=MIRAVIA, externalId). "1 color = 1 producto" â€” si el feed
 * agrupa colores en un mismo registro, hay que desnormalizar en el adapter.
 *
 *  - Idempotente: re-ejecutar el sync no duplica productos.
 *  - Respeta `isCustomized` (no sobrescribe name/slug/retailPrice si
 *    el admin marcó el producto como personalizado).
 *  - Descarga la primera imagen vía /api/upload-from-url (opcional;
 *    en entorno cron/headless se necesita CRON_INTERNAL_URL para llamarse a
 *    sí mismo).
 */

import "server-only";
import { db } from "@/lib/db";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";
import type { Prisma } from "@prisma/client";
import type { Gender } from "@prisma/client";
import {
  isMiraviaConfigured,
  MiraviaNotConfiguredError,
  type MiraviaItem,
  type MiraviaProvider,
} from "./provider";
import { createMiraviaCsvProvider } from "./adapters/csv";
import { createMiraviaJsonProvider } from "./adapters/json";

export interface ImportJobResult {
  jobId: string;
  total: number;
  created: number;
  updated: number;
  errors: number;
  dryRun: boolean;
}

export interface RunMiraviaSyncOptions {
  dryRun?: boolean;
  provider?: MiraviaProvider; // para tests / casos custom
  createdBy?: string | null;
}

// ---------------------------------------------------------------------------
// Provider auto-resolver basado en env vars
// ---------------------------------------------------------------------------

async function resolveProvider(): Promise<MiraviaProvider> {
  if (!isMiraviaConfigured()) {
    throw new MiraviaNotConfiguredError(
      "MIRAVIA_ENABLED debe ser 'true' y MIRAVIA_FEED_URL debe estar definido",
    );
  }
  const url = process.env.MIRAVIA_FEED_URL!;
  const format = (process.env.MIRAVIA_FEED_FORMAT || "csv").toLowerCase();

  // Mapping personalizado guardado en Setting "miravia.csvMapping"
  let mapping: Record<string, string> | undefined;
  try {
    const setting = await db.setting.findUnique({
      where: { key: "miravia.csvMapping" },
    });
    if (setting && setting.value && typeof setting.value === "object") {
      mapping = setting.value as Record<string, string>;
    }
  } catch {
    // ignora â€” DB puede no estar disponible en algunos entornos
  }

  if (format === "csv") {
    return createMiraviaCsvProvider({ source: url, mapping });
  }
  if (format === "json") {
    return createMiraviaJsonProvider({ source: url });
  }
  if (format === "xml") {
    const { createMiraviaXmlProvider } = await import("./adapters/xml");
    return createMiraviaXmlProvider({ source: url });
  }
  throw new MiraviaNotConfiguredError(`MIRAVIA_FEED_FORMAT inválido: ${format}`);
}

// ---------------------------------------------------------------------------
// Helpers brand/category con caché en memoria
// ---------------------------------------------------------------------------

class TaxonomyCache {
  private brands = new Map<string, string>();
  private categories = new Map<string, string>();

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
    const uniq = await uniqueSlug(
      slug,
      async (s) => (await tx.brand.count({ where: { slug: s } })) > 0,
    );
    const created = await tx.brand.create({
      data: { name: key, slug: uniq },
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
    const uniq = await uniqueSlug(
      slug,
      async (s) => (await tx.category.count({ where: { slug: s } })) > 0,
    );
    const created = await tx.category.create({
      data: { name: key, slug: uniq },
      select: { id: true },
    });
    this.categories.set(key, created.id);
    return created.id;
  }
}

async function buildProductSlug(
  tx: Prisma.TransactionClient,
  name: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyEs(name);
  return uniqueSlug(base, async (s) => {
    const found = await tx.product.findUnique({ where: { slug: s }, select: { id: true } });
    if (!found) return false;
    if (excludeId && found.id === excludeId) return false;
    return true;
  });
}

function coerceGender(g: string | undefined): Gender {
  if (!g) return "NO_ESPECIFICADO";
  const upper = g.toUpperCase();
  if (["HOMBRE", "MUJER", "UNISEX", "NINO", "NINA", "BEBE"].includes(upper)) {
    return upper as Gender;
  }
  return "NO_ESPECIFICADO";
}

// ---------------------------------------------------------------------------
// Upsert de un MiraviaItem
// ---------------------------------------------------------------------------

interface UpsertOutcome {
  created: boolean;
  updated: boolean;
  productId?: string;
  error?: string;
}

async function upsertItem(
  tx: Prisma.TransactionClient,
  taxonomy: TaxonomyCache,
  item: MiraviaItem,
): Promise<UpsertOutcome> {
  try {
    const brandId = await taxonomy.getBrandId(tx, item.brand);
    const categoryId = await taxonomy.getCategoryId(tx, item.category);

    const existing = await tx.product.findUnique({
      where: { source_externalId: { source: "MIRAVIA", externalId: item.externalId } },
      select: { id: true, name: true, isCustomized: true },
    });

    const retail = item.retailPrice.toFixed(2);
    const cost = item.costPrice != null ? item.costPrice.toFixed(2) : null;
    const gender = coerceGender(item.gender);

    let productId: string;
    let created = false;
    let updated = false;

    if (!existing) {
      const slug = await buildProductSlug(tx, item.name);
      const product = await tx.product.create({
        data: {
          slug,
          name: item.name,
          shortName: item.name.slice(0, 120),
          description: item.description,
          brandId,
          categoryId,
          source: "MIRAVIA",
          externalId: item.externalId,
          modelCode: item.modelCode,
          colorName: item.colorName,
          colorHex: item.colorHex,
          gender,
          sportUse: item.sportUse,
          composition: item.composition,
          costPrice: cost,
          retailPrice: retail,
          status: "DRAFT",
          tags: ["miravia"],
        },
        select: { id: true },
      });
      productId = product.id;
      created = true;
    } else {
      productId = existing.id;
      const data: Prisma.ProductUpdateInput = {
        brand: { connect: { id: brandId } },
        category: { connect: { id: categoryId } },
        modelCode: item.modelCode,
        colorName: item.colorName,
        colorHex: item.colorHex,
        gender,
        sportUse: item.sportUse,
        composition: item.composition,
        costPrice: cost,
      };
      if (!existing.isCustomized) {
        data.name = item.name;
        data.description = item.description;
        data.retailPrice = retail;
        if (existing.name !== item.name) {
          data.slug = await buildProductSlug(tx, item.name, existing.id);
        }
      }
      await tx.product.update({ where: { id: existing.id }, data });
      updated = true;
    }

    // Sizes (idempotente: upsert por (productId, size))
    for (const s of item.sizes) {
      await tx.productSize.upsert({
        where: { productId_size: { productId, size: s.size } },
        create: {
          productId,
          size: s.size,
          ean: s.ean || null,
          stock: s.stock ?? 0,
        },
        update: {
          ean: s.ean || null,
          stock: s.stock ?? 0,
        },
      });
    }

    await tx.productAudit.create({
      data: {
        productId,
        action: "imported",
        changes: {
          source: "MIRAVIA",
          externalId: item.externalId,
          retail,
          sizes: item.sizes.length,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { created, updated, productId };
  } catch (err) {
    return {
      created: false,
      updated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Descarga de imagen principal vía /api/upload-from-url
// ---------------------------------------------------------------------------

async function downloadFirstImage(
  productId: string,
  item: MiraviaItem,
  internalBaseUrl: string | null,
  cronSecret: string | null,
): Promise<void> {
  if (!internalBaseUrl || item.imageUrls.length === 0) return;
  try {
    const url = item.imageUrls[0]!;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (cronSecret) headers["x-cron-secret"] = cronSecret;
    const res = await fetch(`${internalBaseUrl}/api/upload-from-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        alt: item.name,
        productId,
        type: "product",
      }),
    });
    const json = await res.json();
    if (res.ok && json.ok && json.data?.url) {
      await db.product.update({
        where: { id: productId },
        data: { mainImageUrl: json.data.url },
      });
    }
  } catch (err) {
    console.warn(`[miravia/sync] fallo imagen producto ${productId}`, err);
  }
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

export async function runMiraviaSync(
  opts: RunMiraviaSyncOptions = {},
): Promise<ImportJobResult> {
  const provider = opts.provider ?? (await resolveProvider());

  const job = await db.importJob.create({
    data: {
      source: "MIRAVIA",
      status: "RUNNING",
      startedAt: new Date(),
      createdBy: opts.createdBy ?? null,
      options: { dryRun: !!opts.dryRun } as unknown as Prisma.InputJsonValue,
    },
  });

  let total = 0;
  let created = 0;
  let updated = 0;
  let errors = 0;
  const errorList: { row: number; code: string; message: string }[] = [];

  const taxonomy = new TaxonomyCache();
  const internalBase = process.env.MIRAVIA_INTERNAL_URL || process.env.NEXT_PUBLIC_SITE_URL || null;
  const cronSecret = process.env.CRON_SECRET || null;

  try {
    for await (const item of provider.fetchCatalog()) {
      total += 1;

      if (opts.dryRun) {
        const existing = await db.product.findUnique({
          where: { source_externalId: { source: "MIRAVIA", externalId: item.externalId } },
          select: { id: true },
        });
        if (existing) updated += 1;
        else created += 1;
        continue;
      }

      let outcome: UpsertOutcome | null = null;
      try {
        outcome = await db.$transaction(
          (tx) => upsertItem(tx, taxonomy, item),
          { maxWait: 10000, timeout: 30000 },
        );
      } catch (err) {
        outcome = {
          created: false,
          updated: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      if (outcome.error) {
        errors += 1;
        if (errorList.length < 500) {
          errorList.push({
            row: total,
            code: item.externalId,
            message: outcome.error,
          });
        }
        continue;
      }
      if (outcome.created) created += 1;
      if (outcome.updated) updated += 1;

      if (outcome.productId) {
        await downloadFirstImage(outcome.productId, item, internalBase, cronSecret);
      }

      if (total % 50 === 0) {
        await db.importJob.update({
          where: { id: job.id },
          data: {
            totalRows: total,
            processedRows: total,
            createdRows: created,
            updatedRows: updated,
            errorRows: errors,
          },
        });
      }
    }

    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: "DONE",
        totalRows: total,
        processedRows: total,
        createdRows: created,
        updatedRows: updated,
        errorRows: errors,
        errors: errorList as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    return {
      jobId: job.id,
      total,
      created,
      updated,
      errors,
      dryRun: !!opts.dryRun,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorList.push({ row: 0, code: "FATAL", message });
    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        totalRows: total,
        processedRows: total,
        createdRows: created,
        updatedRows: updated,
        errorRows: errors,
        errors: errorList as unknown as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
