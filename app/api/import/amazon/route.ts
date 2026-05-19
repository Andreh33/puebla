/**
 * POST /api/import/amazon
 * Body: { asins: string[] }
 *
 * Crea/actualiza Product (source=AMAZON, externalId=ASIN) para cada ASIN.
 * Descarga la imagen principal vía /api/upload-from-url (Agente 7) y la
 * guarda en Blob.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { slugifyEs, uniqueSlug } from "@/lib/seo/slug";
import {
  getItems,
  buildAffiliateUrl,
  AmazonNotConfiguredError,
  AmazonApiError,
  type NormalizedAmazonItem,
} from "@/lib/amazon/paapi-client";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_BRAND = "Amazon";
const DEFAULT_CATEGORY = "Amazon";

async function ensureBrand(name: string | null): Promise<string> {
  const finalName = (name && name.trim()) || DEFAULT_BRAND;
  const slug = slugifyEs(finalName);
  const existing = await db.brand.findFirst({
    where: { OR: [{ name: finalName }, { slug }] },
    select: { id: true },
  });
  if (existing) return existing.id;
  const uniq = await uniqueSlug(
    slug,
    async (s) => (await db.brand.count({ where: { slug: s } })) > 0,
  );
  const created = await db.brand.create({
    data: { name: finalName, slug: uniq },
    select: { id: true },
  });
  return created.id;
}

async function ensureCategory(name: string | null): Promise<string> {
  const finalName = (name && name.trim()) || DEFAULT_CATEGORY;
  const slug = slugifyEs(finalName);
  const existing = await db.category.findFirst({
    where: { OR: [{ name: finalName }, { slug }] },
    select: { id: true },
  });
  if (existing) return existing.id;
  const uniq = await uniqueSlug(
    slug,
    async (s) => (await db.category.count({ where: { slug: s } })) > 0,
  );
  const created = await db.category.create({
    data: { name: finalName, slug: uniq },
    select: { id: true },
  });
  return created.id;
}

async function buildProductSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugifyEs(name);
  return uniqueSlug(base, async (s) => {
    const found = await db.product.findUnique({ where: { slug: s }, select: { id: true } });
    if (!found) return false;
    if (excludeId && found.id === excludeId) return false;
    return true;
  });
}

interface UpsertResult {
  asin: string;
  created: boolean;
  updated: boolean;
  productId?: string;
  error?: string;
}

async function downloadImageIfPossible(
  item: NormalizedAmazonItem,
  productId: string,
  origin: string,
  cookie: string,
): Promise<string | null> {
  if (!item.imageUrl) return null;
  try {
    const res = await fetch(`${origin}/api/upload-from-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        url: item.imageUrl,
        alt: item.title,
        productId,
        type: "product",
      }),
    });
    const j = await res.json();
    if (!res.ok || !j.ok) {
      console.warn(`[amazon/import] imagen ASIN ${item.asin} fallo`, j);
      return null;
    }
    return j.data?.url ?? null;
  } catch (err) {
    console.warn(`[amazon/import] imagen ASIN ${item.asin} excepción`, err);
    return null;
  }
}

async function upsertOne(
  item: NormalizedAmazonItem,
  ctx: { origin: string; cookie: string },
): Promise<UpsertResult> {
  try {
    const brandId = await ensureBrand(item.brand);
    const categoryId = await ensureCategory(item.category);

    const existing = await db.product.findUnique({
      where: { source_externalId: { source: "AMAZON", externalId: item.asin } },
      select: { id: true, slug: true, isCustomized: true, name: true },
    });

    const affiliateUrl = item.affiliateUrl || buildAffiliateUrl(item.asin);
    const retailPriceStr = (item.price ?? 0).toFixed(2);

    if (!existing) {
      const slug = await buildProductSlug(item.title);
      const product = await db.product.create({
        data: {
          slug,
          name: item.title,
          brandId,
          categoryId,
          source: "AMAZON",
          externalId: item.asin,
          externalUrl: affiliateUrl,
          colorName: "Único",
          retailPrice: retailPriceStr,
          status: "DRAFT",
          tags: ["amazon", "afiliado"],
        },
        select: { id: true },
      });

      const uploadedUrl = await downloadImageIfPossible(
        item,
        product.id,
        ctx.origin,
        ctx.cookie,
      );
      if (uploadedUrl) {
        await db.product.update({
          where: { id: product.id },
          data: { mainImageUrl: uploadedUrl },
        });
      }

      await db.productAudit.create({
        data: {
          productId: product.id,
          action: "imported",
          changes: {
            source: "AMAZON",
            asin: item.asin,
            price: retailPriceStr,
            availability: item.availability,
          },
        },
      });

      return { asin: item.asin, created: true, updated: false, productId: product.id };
    }

    // Actualizar producto existente — respeta isCustomized
    const updateData: Record<string, unknown> = {
      brandId,
      categoryId,
      externalUrl: affiliateUrl,
    };
    if (!existing.isCustomized) {
      updateData.name = item.title;
      updateData.retailPrice = retailPriceStr;
      if (existing.name !== item.title) {
        updateData.slug = await buildProductSlug(item.title, existing.id);
      }
    }
    await db.product.update({ where: { id: existing.id }, data: updateData });

    await db.productAudit.create({
      data: {
        productId: existing.id,
        action: "imported",
        changes: {
          source: "AMAZON",
          asin: item.asin,
          price: retailPriceStr,
          availability: item.availability,
        },
      },
    });

    return { asin: item.asin, created: false, updated: true, productId: existing.id };
  } catch (err) {
    return {
      asin: item.asin,
      created: false,
      updated: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const rl = rateLimit(`amazon-import:${session.user.id}`, {
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas peticiones." },
      { status: 429 },
    );
  }

  if (process.env.AMAZON_ENABLED !== "true") {
    return NextResponse.json(
      { ok: false, error: "Conector Amazon no habilitado." },
      { status: 503 },
    );
  }

  let body: { asins?: unknown };
  try {
    body = (await req.json()) as { asins?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const asins = Array.from(
    new Set(
      (Array.isArray(body.asins) ? body.asins : [])
        .map((v) => String(v).trim().toUpperCase())
        .filter((v) => /^[A-Z0-9]{10}$/.test(v)),
    ),
  ).slice(0, 10);

  if (asins.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No hay ASINs válidos" },
      { status: 400 },
    );
  }

  // Crear ImportJob para trazabilidad
  const job = await db.importJob.create({
    data: {
      source: "AMAZON",
      status: "RUNNING",
      totalRows: asins.length,
      startedAt: new Date(),
      createdBy: session.user.id,
    },
  });

  try {
    const items = await getItems(asins);
    const origin = req.nextUrl.origin;
    const cookie = req.headers.get("cookie") ?? "";

    const results: UpsertResult[] = [];
    for (const item of items) {
      const r = await upsertOne(item, { origin, cookie });
      results.push(r);
    }

    const created = results.filter((r) => r.created).length;
    const updated = results.filter((r) => r.updated).length;
    const errors = results.filter((r) => r.error);

    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: errors.length === results.length && results.length > 0 ? "FAILED" : "DONE",
        processedRows: results.length,
        createdRows: created,
        updatedRows: updated,
        errorRows: errors.length,
        errors: errors.length
          ? (errors.map((e) => ({
              row: 0,
              code: e.asin,
              message: e.error ?? "—",
            })) as unknown as object)
          : undefined,
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      created,
      updated,
      errors: errors.length,
    });
  } catch (err) {
    await db.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errors: [
          {
            row: 0,
            code: "FATAL",
            message: err instanceof Error ? err.message : String(err),
          },
        ] as unknown as object,
      },
    });
    if (err instanceof AmazonNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    if (err instanceof AmazonApiError) {
      console.error("[amazon/import] AmazonApiError", err.cause);
      return NextResponse.json(
        { ok: false, error: "Amazon devolvió un error" },
        { status: 502 },
      );
    }
    console.error("[amazon/import] error", err);
    return NextResponse.json(
      { ok: false, error: "Error desconocido" },
      { status: 500 },
    );
  }
}
