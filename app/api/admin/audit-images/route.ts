/**
 * POST /api/admin/audit-images
 * Body (JSON): { skuImages: { "<sku>": ["url", ...] } }  — mapa de la web vieja.
 *
 * Reconcilia las fotos de cada producto de la tienda contra el mapa de la web
 * vieja. SOLO LECTURA. Devuelve:
 *  - imageCountDist: cuántos productos tienen 0, 1, 2, 3+ imágenes.
 *  - statusDist: reparto por estado.
 *  - missingVsMap: productos cuyo mapa tiene MÁS fotos (distintas) que las que
 *    tienen ahora → faltan de verdad (no debería haber tras la migración).
 *  - lowImage: productos con ≤1 imagen clasificados en:
 *      · normalSingle → el mapa también tiene ≤1 (la web vieja solo tiene 1): NORMAL.
 *      · unmatched    → el SKU NO está en el mapa (no salió del Store API): revisar.
 *      · noSku        → sin SKU, no emparejable.
 *  - unmatched: TODOS los SKU presentes en BD que NO están en el mapa (para
 *    consultarlos uno a uno en la web vieja).
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ ok: false, error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return null;
}

interface Body {
  skuImages?: Record<string, string[]>;
}

export async function POST(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const skuImages = body.skuImages ?? {};
  const mapCount = new Map<string, number>();
  for (const [sku, arr] of Object.entries(skuImages)) {
    if (Array.isArray(arr)) mapCount.set(sku, new Set(arr).size); // fotos DISTINTAS
  }

  const products = await db.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      status: true,
      mainImageUrl: true,
      externalId: true,
      _count: { select: { images: true } },
    },
  });

  const imageCountDist: Record<string, number> = {};
  const statusDist: Record<string, number> = {};
  let withSku = 0;
  let withoutSku = 0;

  let missingTotalDeficit = 0;
  const missingSample: Array<{ sku: string | null; name: string; have: number; map: number }> = [];

  let normalSingle = 0;
  let unmatchedLow = 0;
  let noSkuLow = 0;
  const unmatchedSample: Array<{ sku: string | null; name: string; have: number; status: string }> = [];

  // Todos los SKU en BD que no están en el mapa (cualquier nº de fotos) — para
  // consultarlos en la web vieja después.
  const unmatchedSkus: Array<{ sku: string; have: number }> = [];

  for (const p of products) {
    const have = p._count.images;
    const bucket = have >= 3 ? "3+" : String(have);
    imageCountDist[bucket] = (imageCountDist[bucket] ?? 0) + 1;
    statusDist[p.status] = (statusDist[p.status] ?? 0) + 1;
    if (p.sku) withSku++;
    else withoutSku++;

    const mc = p.sku ? mapCount.get(p.sku) : undefined;
    const inMap = mc != null;

    if (p.sku && !inMap) {
      unmatchedSkus.push({ sku: p.sku, have });
    }

    if (inMap && have < mc) {
      missingTotalDeficit += mc - have;
      if (missingSample.length < 40) {
        missingSample.push({ sku: p.sku, name: p.name.slice(0, 45), have, map: mc });
      }
    }

    if (have <= 1) {
      if (inMap) {
        if (mc <= have) normalSingle++;
        // si mc > have ya cuenta en missingVsMap
      } else if (p.sku) {
        unmatchedLow++;
        if (unmatchedSample.length < 40) {
          unmatchedSample.push({ sku: p.sku, name: p.name.slice(0, 45), have, status: p.status });
        }
      } else {
        noSkuLow++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    totalProducts: products.length,
    skusEnMapa: mapCount.size,
    statusDist,
    imageCountDist,
    withSku,
    withoutSku,
    missingVsMap: { totalDeficit: missingTotalDeficit, sample: missingSample },
    lowImage: { normalSingle, unmatchedWithSku: unmatchedLow, noSku: noSkuLow, unmatchedSample },
    unmatchedSkusTotal: unmatchedSkus.length,
    unmatchedSkus: unmatchedSkus.slice(0, 400),
  });
}
