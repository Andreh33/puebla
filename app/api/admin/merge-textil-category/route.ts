/**
 * POST /api/admin/merge-textil-category?from=chaqueta&to=sudadera
 *
 * Mueve todos los productos de las categorías `{genero}-textil-{from}` a las
 * `{genero}-textil-{to}` del MISMO género, en sus tres vías de enlace:
 *   - m2m ProductCategory (categoryLinks)
 *   - Product.categoryId (FK legacy obligatoria)
 *   - Product.primaryCategoryId
 *
 * Deja las categorías `{from}` sin productos ni enlaces para que
 * `/api/admin/apply-taxonomy` las pode. Idempotente (si ya no hay nada, mueve 0).
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 */
import { NextResponse, type NextRequest } from "next/server";
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

  const url = new URL(req.url);
  const from = (url.searchParams.get("from") ?? "").trim().toLowerCase();
  const to = (url.searchParams.get("to") ?? "").trim().toLowerCase();
  const slugRe = /^[a-z0-9-]+$/;
  if (!from || !to || from === to || !slugRe.test(from) || !slugRe.test(to)) {
    return NextResponse.json({ ok: false, error: "from/to inválidos" }, { status: 400 });
  }

  const fromSuffix = `-textil-${from}`;
  const froms = await db.category.findMany({
    where: { slug: { endsWith: fromSuffix } },
    select: { id: true, slug: true },
  });

  const pares: Array<{ fromId: string; toId: string; slug: string; toSlug: string }> = [];
  const sinDestino: string[] = [];
  for (const f of froms) {
    const toSlug = f.slug.slice(0, -fromSuffix.length) + `-textil-${to}`;
    const t = await db.category.findUnique({ where: { slug: toSlug }, select: { id: true } });
    if (t) pares.push({ fromId: f.id, toId: t.id, slug: f.slug, toSlug });
    else sinDestino.push(f.slug);
  }

  let movedLinks = 0;
  let movedPrimary = 0;
  let movedLegacy = 0;
  for (const p of pares) {
    // m2m: crea el enlace a `to` para los productos enlazados a `from` (sin
    // duplicar) y borra los de `from`.
    const links = await db.productCategory.findMany({
      where: { categoryId: p.fromId },
      select: { productId: true },
    });
    if (links.length) {
      await db.productCategory.createMany({
        data: links.map((l) => ({ productId: l.productId, categoryId: p.toId })),
        skipDuplicates: true,
      });
      const del = await db.productCategory.deleteMany({ where: { categoryId: p.fromId } });
      movedLinks += del.count;
    }
    const pr = await db.product.updateMany({
      where: { primaryCategoryId: p.fromId },
      data: { primaryCategoryId: p.toId },
    });
    movedPrimary += pr.count;
    const lg = await db.product.updateMany({
      where: { categoryId: p.fromId },
      data: { categoryId: p.toId },
    });
    movedLegacy += lg.count;
  }

  return NextResponse.json({
    ok: true,
    from,
    to,
    pares: pares.length,
    sinDestino,
    movedLinks,
    movedPrimary,
    movedLegacy,
  });
}
