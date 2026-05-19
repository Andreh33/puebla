/**
 * Endpoint para el script local de subida de imágenes WooCommerce.
 *
 * El WP del cliente tiene Cloudflare que bloquea IPs de AWS Lambda /
 * Vercel Functions, por lo que el reprocess server-side fallaba con 403.
 * Workflow alternativo:
 *   1. Script local descarga la imagen (pasa CF como IP residencial).
 *   2. POST multipart {sku, file} a este endpoint.
 *   3. Endpoint sube al Blob de Vercel + crea ProductImage + actualiza
 *      Product.mainImageUrl + cambia status DRAFT → ACTIVE.
 *
 * Auth: Bearer ${SETUP_TOKEN}.
 *
 * GET ?limit=50 → devuelve SKUs pendientes (sin mainImageUrl) para que
 * el script local los empareje con el CSV.
 *
 * POST multipart con `sku` (string) y `file` (binary).
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uploadProductImage } from "@/lib/blob/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

export async function GET(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));

  const pending = await db.product.findMany({
    where: {
      mainImageUrl: null,
      externalId: { startsWith: "woocommerce:" },
      sku: { not: null },
    },
    select: { id: true, sku: true, name: true, status: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  const remaining = await db.product.count({
    where: {
      mainImageUrl: null,
      externalId: { startsWith: "woocommerce:" },
    },
  });

  return NextResponse.json({ ok: true, items: pending, remaining });
}

export async function POST(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  const form = await req.formData();
  const sku = (form.get("sku") as string | null)?.trim();
  const file = form.get("file");
  const originalUrl = (form.get("originalUrl") as string | null)?.trim() || null;

  if (!sku) return NextResponse.json({ error: "sku requerido" }, { status: 400 });
  if (!(file instanceof File))
    return NextResponse.json({ error: "file requerido" }, { status: 400 });

  const product = await db.product.findFirst({
    where: { sku, externalId: { startsWith: "woocommerce:" } },
    select: { id: true, status: true, name: true, mainImageUrl: true },
  });
  if (!product)
    return NextResponse.json(
      { error: "producto no encontrado por SKU", sku },
      { status: 404 },
    );
  if (product.mainImageUrl) {
    return NextResponse.json({ ok: true, skipped: "already has image" });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadProductImage(buffer, {
      productId: product.id,
      alt: product.name,
      sourceType: "url-external",
      originalUrl: originalUrl ?? undefined,
      position: 0,
    });

    await db.product.update({
      where: { id: product.id },
      data: {
        mainImageUrl: result.url,
        status: product.status === "DRAFT" ? "ACTIVE" : product.status,
        publishedAt: product.status === "DRAFT" ? new Date() : undefined,
        images: {
          create: {
            url: result.url,
            urlMedium: result.urlMedium,
            urlThumb: result.urlThumb,
            alt: product.name,
            position: 0,
            width: result.width,
            height: result.height,
            blurDataUrl: result.blurDataUrl,
            source: "url-external",
            originalUrl: originalUrl,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, url: result.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message?.slice(0, 200) ?? "upload failed" },
      { status: 500 },
    );
  }
}
