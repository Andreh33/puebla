/**
 * POST /api/admin/push-image?productId=X&position=N&originalUrl=URL&setMain=0|1
 *
 * Recibe los BYTES de una imagen (cuerpo binario) y la sube a Vercel Blob +
 * crea la fila ProductImage. Sirve para migrar fotos cuyo origen (Cloudflare de
 * la web vieja) bloquea la IP del datacenter de Vercel: el orquestador local
 * descarga la imagen desde una IP no bloqueada y empuja aquí los bytes, de modo
 * que el fetch externo nunca ocurre en el servidor.
 *
 * Idempotente: si ya existe una ProductImage con ese (productId, originalUrl),
 * no hace nada. Si `setMain=1` y el producto no tenía principal, fija
 * mainImageUrl y lo pasa de DRAFT a ACTIVE.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { uploadProductImage } from "@/lib/blob/upload";

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

export async function POST(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const productId = (url.searchParams.get("productId") ?? "").trim();
  const originalUrl = (url.searchParams.get("originalUrl") ?? "").trim();
  const position = Number(url.searchParams.get("position") ?? "0") || 0;
  const setMain = url.searchParams.get("setMain") === "1";

  if (!productId || !originalUrl) {
    return NextResponse.json({ ok: false, error: "Falta productId u originalUrl" }, { status: 400 });
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, status: true },
  });
  if (!product) {
    return NextResponse.json({ ok: false, error: "Producto no encontrado" }, { status: 404 });
  }

  // Idempotencia: no re-subir una imagen ya migrada.
  const already = await db.productImage.findFirst({
    where: { productId, originalUrl },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const ab = await req.arrayBuffer();
  const buffer = Buffer.from(ab);
  if (buffer.length === 0) {
    return NextResponse.json({ ok: false, error: "Cuerpo vacío" }, { status: 400 });
  }

  const up = await uploadProductImage(buffer, {
    productId: product.id,
    alt: product.name,
    sourceType: "url-external",
    originalUrl,
    position,
  });

  if (setMain) {
    await db.product.update({
      where: { id: product.id },
      data: {
        mainImageUrl: up.url,
        ...(product.status === "DRAFT" ? { status: "ACTIVE", publishedAt: new Date() } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true, url: up.url });
}
