/**
 * POST /api/admin/dedup-images[?dry=1]
 *
 * Elimina filas ProductImage DUPLICADAS dentro de un mismo producto (misma `url`
 * = mismo Blob = misma foto). Causa típica: el doble-create de `reprocess-woo-images`
 * (llamaba a uploadProductImage —que ya crea la fila— y además hacía images.create),
 * que dejó la foto principal repetida en muchos productos.
 *
 * Conserva la de menor `position` (y a igualdad, la más antigua) y borra el resto.
 * NO borra el Blob (la url sigue referenciada por la fila conservada) ni toca
 * `mainImageUrl` (apunta a esa misma url, que se mantiene).
 *
 * ?dry=1 → solo cuenta, no borra. Auth: Bearer ${SETUP_TOKEN}.
 */
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  const dry = new URL(req.url).searchParams.get("dry") === "1";

  // Orden estable: dentro de cada producto, la 1ª aparición (menor position, luego
  // más antigua) es la que se CONSERVA; las siguientes con misma url se borran.
  const imgs = await db.productImage.findMany({
    select: { id: true, productId: true, url: true },
    orderBy: [{ productId: "asc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  const seen = new Set<string>();
  const toDelete: string[] = [];
  const affected = new Set<string>();
  for (const im of imgs) {
    const key = `${im.productId}|${im.url}`;
    if (seen.has(key)) {
      toDelete.push(im.id);
      affected.add(im.productId);
    } else {
      seen.add(key);
    }
  }

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      totalImagenes: imgs.length,
      duplicadas: toDelete.length,
      productosAfectados: affected.size,
    });
  }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 200) {
    const r = await db.productImage.deleteMany({ where: { id: { in: toDelete.slice(i, i + 200) } } });
    deleted += r.count;
  }

  revalidatePath("/catalogo");
  for (const g of ["hombre", "mujer", "nino", "nina"]) {
    revalidatePath(`/${g}/textil`);
    revalidatePath(`/${g}/calzado`);
  }

  return NextResponse.json({
    ok: true,
    deleted,
    productosAfectados: affected.size,
    totalImagenes: imgs.length,
  });
}
