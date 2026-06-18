/**
 * POST /api/admin/import-galleries
 *
 * Migra las FOTOS DE GALERÍA de la web vieja (WooCommerce) a los productos de la
 * web nueva, emparejando por SKU. Para cada producto añade las imágenes que le
 * FALTAN respecto a las de la tienda antigua.
 *
 * Cuerpo (JSON):  { "skuImages": { "<sku>": ["url1", "url2", ...], ... } }
 *   — las URLs en el orden de WooCommerce (la primera es la destacada/principal).
 *   Se obtienen del Store API público:  /wp-json/wc/store/v1/products
 *
 * Query:
 *   ?images=50  máx. imágenes a procesar por llamada (default 50, tope 120)
 *   ?dry=1      no descarga nada; solo informa de cuántas faltan (para dimensionar)
 *
 * Comportamiento por producto:
 *   - Si YA tiene imagen principal: añade solo las de galería extra (salta la 1ª de
 *     Woo, que es la destacada = la que ya tiene). Idempotente: las ya migradas se
 *     detectan por `originalUrl` y no se repiten.
 *   - Si NO tiene imagen principal: sube todas; la 1ª pasa a principal y el producto
 *     a ACTIVE (estaba DRAFT por no tener foto).
 *
 * Chunked: procesa hasta `images` por llamada y devuelve `{ processed, failed,
 * remaining }`. Repetir mientras `processed > 0`. Reutiliza el pipeline existente
 * (`fetchImageBytes` + `uploadProductImage` → sharp + Vercel Blob); `uploadProductImage`
 * crea la fila `ProductImage` cuando se le pasa `productId`.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { fetchImageBytes } from "@/lib/importer/fetch-image";
import { uploadProductImage } from "@/lib/blob/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CONCURRENCY = 4;

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

interface WorkItem {
  productId: string;
  name: string;
  src: string;
  position: number;
  setMain: boolean;
  draft: boolean;
}

export async function POST(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  const t0 = Date.now();
  const url = new URL(req.url);
  const maxImages = Math.max(1, Math.min(120, Number(url.searchParams.get("images") ?? "50") || 50));
  const dry = url.searchParams.get("dry") === "1";

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido en el cuerpo" }, { status: 400 });
  }
  const skuImages = body.skuImages ?? {};
  const skus = Object.keys(skuImages).filter(
    (s) => Array.isArray(skuImages[s]) && skuImages[s].length > 0,
  );
  if (skus.length === 0) {
    return NextResponse.json({ ok: false, error: "skuImages vacío" }, { status: 400 });
  }

  // Productos emparejables por SKU, con sus imágenes actuales (para deduplicar).
  const products = await db.product.findMany({
    where: { sku: { in: skus } },
    select: {
      id: true,
      sku: true,
      name: true,
      mainImageUrl: true,
      status: true,
      images: { select: { originalUrl: true, position: true } },
    },
  });

  // Lista global de imágenes que faltan (estado actual de la BD).
  const work: WorkItem[] = [];
  for (const p of products) {
    if (!p.sku) continue;
    const srcs = skuImages[p.sku] ?? [];
    if (srcs.length === 0) continue;

    const haveOrig = new Set(
      p.images.map((i) => i.originalUrl).filter((u): u is string => !!u),
    );
    const hasMain = !!p.mainImageUrl;
    // Si ya tiene principal, la 1ª de Woo (destacada) ya está → saltar.
    const candidates = (hasMain ? srcs.slice(1) : srcs).filter((s) => !haveOrig.has(s));
    if (candidates.length === 0) continue;

    let nextPos = p.images.reduce((m, i) => Math.max(m, i.position), -1) + 1;
    candidates.forEach((src, idx) => {
      work.push({
        productId: p.id,
        name: p.name,
        src,
        position: nextPos++,
        setMain: !hasMain && idx === 0,
        draft: p.status === "DRAFT",
      });
    });
  }

  const totalRemaining = work.length;

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      skusEnviados: skus.length,
      productosEmparejados: products.length,
      fotosQueFaltan: totalRemaining,
    });
  }

  const batch = work.slice(0, maxImages);

  let processed = 0;
  let failed = 0;
  const sampleErrors: Array<{ src: string; error: string }> = [];
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= batch.length) return;
      const it = batch[idx]!;
      try {
        const fetched = await fetchImageBytes(it.src);
        if (!fetched.ok) {
          failed++;
          if (sampleErrors.length < 6) sampleErrors.push({ src: it.src, error: fetched.error });
          continue;
        }
        // uploadProductImage crea la fila ProductImage (productId presente).
        const up = await uploadProductImage(fetched.buffer, {
          productId: it.productId,
          alt: it.name,
          sourceType: "url-external",
          originalUrl: it.src,
          position: it.position,
        });
        if (it.setMain) {
          await db.product.update({
            where: { id: it.productId },
            data: {
              mainImageUrl: up.url,
              ...(it.draft ? { status: "ACTIVE", publishedAt: new Date() } : {}),
            },
          });
        }
        processed++;
      } catch (err) {
        failed++;
        if (sampleErrors.length < 6) {
          sampleErrors.push({ src: it.src, error: (err as Error).message?.slice(0, 160) ?? "?" });
        }
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batch.length) }, () => worker()));

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    remaining: Math.max(0, totalRemaining - processed),
    productosEmparejados: products.length,
    durationMs: Date.now() - t0,
    sampleErrors,
  });
}
