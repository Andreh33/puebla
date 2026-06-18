/**
 * POST /api/admin/reprocess-woo-images
 *
 * Procesa en chunks (50 por llamada) la descarga de imágenes para
 * productos WooCommerce que se quedaron sin `mainImageUrl` durante el
 * import original (el after() de Vercel murió antes de procesar las
 * 1361 imágenes secuencialmente).
 *
 * El cliente sube el CSV original UNA SOLA VEZ; el endpoint lo lee,
 * empareja por SKU con productos en DB que aún no tienen imagen, y
 * descarga + sube al Blob las primeras N pendientes. Devuelve
 * `{ processed, remaining }`; repetir hasta `remaining = 0`.
 *
 * Tras descargar la imagen principal, marca el producto como ACTIVE
 * (estaba DRAFT por carecer de imagen). Si la descarga falla, lo deja
 * en DRAFT y registra el error.
 *
 * Auth: Bearer ${SETUP_TOKEN}.
 */
import { NextResponse, type NextRequest } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { fetchImageBytes } from "@/lib/importer/fetch-image";
import { uploadProductImage } from "@/lib/blob/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CHUNK_SIZE = 30; // 30 imágenes × ~5 s c/u (download + sharp + blob) = ~150 s margen

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

interface WooRow {
  ID?: string;
  Tipo?: string;
  SKU?: string;
  Nombre?: string;
  Imágenes?: string;
  [key: string]: string | undefined;
}

export async function POST(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  const t0 = Date.now();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Falta el CSV" }, { status: 400 });

  const csvText = await file.text();
  const parsed = Papa.parse<WooRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0 && parsed.errors[0]) {
    console.warn(`[reprocess] CSV parse errors:`, parsed.errors.slice(0, 3));
  }

  // Map SKU → primera URL de imagen.
  const skuToImageUrl = new Map<string, string>();
  for (const row of parsed.data) {
    const sku = (row.SKU ?? "").trim();
    const imagesCol = (row["Imágenes"] ?? "").trim();
    const tipo = (row.Tipo ?? "").trim();
    // Solo padres (variable/simple), no variations.
    if (!sku || !imagesCol || tipo === "variation") continue;
    const firstUrl = imagesCol.split(",")[0]?.trim();
    if (!firstUrl || !firstUrl.startsWith("http")) continue;
    skuToImageUrl.set(sku, firstUrl);
  }

  // Productos WooCommerce sin imagen principal aún.
  const pending = await db.product.findMany({
    where: {
      mainImageUrl: null,
      externalId: { startsWith: "woocommerce:" },
      sku: { in: Array.from(skuToImageUrl.keys()) },
    },
    select: { id: true, sku: true, name: true, status: true },
    take: CHUNK_SIZE,
  });

  let processed = 0;
  let activated = 0;
  let errors = 0;
  const errorDetails: Array<{ sku: string; error: string }> = [];

  // Descarga + upload secuencial (sharp es CPU-heavy, mejor no paralelizar mucho)
  for (const product of pending) {
    if (!product.sku) continue;
    const url = skuToImageUrl.get(product.sku);
    if (!url) continue;

    try {
      const fetched = await fetchImageBytes(url);
      if (!fetched.ok) {
        throw new Error(fetched.error);
      }
      const result = await uploadProductImage(fetched.buffer, {
        productId: product.id,
        alt: product.name,
        sourceType: "url-external",
        originalUrl: url,
        position: 0,
      });
      await db.product.update({
        where: { id: product.id },
        data: {
          // uploadProductImage YA creó la fila ProductImage (se le pasó productId).
          // Aquí solo fijamos la principal y publicamos. NO recrear la imagen: ese
          // images.create duplicaba la foto (bug histórico; datos limpiados con
          // /api/admin/dedup-images el 2026-06-18).
          mainImageUrl: result.url,
          status: product.status === "DRAFT" ? "ACTIVE" : product.status,
          publishedAt:
            product.status === "DRAFT" ? new Date() : undefined,
        },
      });
      processed++;
      if (product.status === "DRAFT") activated++;
    } catch (err) {
      errors++;
      errorDetails.push({
        sku: product.sku,
        error: (err as Error).message?.slice(0, 200) ?? "unknown",
      });
    }
  }

  // Conteo de pendientes restantes para que el caller sepa si seguir.
  const remaining = await db.product.count({
    where: {
      mainImageUrl: null,
      externalId: { startsWith: "woocommerce:" },
    },
  });

  return NextResponse.json({
    ok: true,
    processed,
    activated,
    errors,
    remaining,
    durationMs: Date.now() - t0,
    sampleErrors: errorDetails.slice(0, 5),
  });
}
