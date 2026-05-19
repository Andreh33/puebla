/**
 * GET /api/cron/refresh-amazon
 *
 * Refresca precio y disponibilidad de los productos source=AMAZON.
 * Procesa en bloques de 10 ASINs (límite PA-API). Nunca devuelve 500 sin log.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  getItems,
  AmazonNotConfiguredError,
  AmazonApiError,
  buildAffiliateUrl,
} from "@/lib/amazon/paapi-client";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_PRODUCTS_PER_RUN = 200;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron/refresh-amazon] CRON_SECRET no configurado");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.AMAZON_ENABLED !== "true") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "AMAZON_ENABLED != true",
    });
  }

  try {
    const products = await db.product.findMany({
      where: { source: "AMAZON", externalId: { not: null } },
      select: { id: true, externalId: true, isCustomized: true },
      orderBy: { updatedAt: "asc" },
      take: MAX_PRODUCTS_PER_RUN,
    });

    if (products.length === 0) {
      return NextResponse.json({ ok: true, refreshed: 0, message: "Sin productos Amazon" });
    }

    const asins = products
      .map((p) => p.externalId!)
      .filter((a) => /^[A-Z0-9]{10}$/.test(a));

    let refreshed = 0;
    const errors: { asin: string; message: string }[] = [];

    for (const batch of chunk(asins, 10)) {
      try {
        const items = await getItems(batch);
        for (const item of items) {
          const target = products.find((p) => p.externalId === item.asin);
          if (!target) continue;
          try {
            const data: Record<string, unknown> = {
              externalUrl: buildAffiliateUrl(item.asin),
            };
            if (!target.isCustomized && item.price != null) {
              data.retailPrice = item.price.toFixed(2);
            }
            await db.product.update({ where: { id: target.id }, data });
            refreshed += 1;
          } catch (err) {
            errors.push({
              asin: item.asin,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } catch (err) {
        for (const a of batch) {
          errors.push({
            asin: a,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      refreshed,
      total: asins.length,
      errors: errors.slice(0, 50),
    });
  } catch (err) {
    if (err instanceof AmazonNotConfiguredError) {
      console.warn("[cron/refresh-amazon]", err.message);
      return NextResponse.json({ ok: true, skipped: true, reason: err.message });
    }
    if (err instanceof AmazonApiError) {
      console.error("[cron/refresh-amazon] AmazonApiError", err.cause);
      return NextResponse.json(
        { ok: false, error: "Amazon API error" },
        { status: 502 },
      );
    }
    console.error("[cron/refresh-amazon] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 200 }, // 200 para no romper retries del scheduler — log queda en consola
    );
  }
}
