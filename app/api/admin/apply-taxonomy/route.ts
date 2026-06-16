/**
 * POST /api/admin/apply-taxonomy
 *
 * Hace upsert del árbol de categorías canónico (TAXONOMY_TREE) en la DB de
 * producción. Idempotente: se puede llamar varias veces sin efecto adverso.
 * También borra el RedirectRule `/bebe` si existía (ya existe la categoría
 * real `/bebe` tras el upsert, por lo que la redirección sería un bucle).
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}` (env var en Vercel).
 *
 * Respuesta: { ok: true, upserted: <número de nodos procesados> }
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { TAXONOMY_TREE } from "@/lib/categories/taxonomy-tree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no configurado en este entorno" },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  const slugToId: Record<string, string> = {};

  // 1. Upsert raíces (nodos sin parentSlug) primero
  for (const n of TAXONOMY_TREE.filter((t) => !t.parentSlug)) {
    const c = await db.category.upsert({
      where: { slug: n.slug },
      update: {
        name: n.name,
        position: n.position,
        metaTitle: n.metaTitle,
        metaDescription: n.metaDescription,
        parentId: null,
      },
      create: {
        slug: n.slug,
        name: n.name,
        parentId: null,
        position: n.position,
        metaTitle: n.metaTitle,
        metaDescription: n.metaDescription,
      },
    });
    slugToId[n.slug] = c.id;
  }

  // 2. Upsert hijas (nodos con parentSlug)
  for (const n of TAXONOMY_TREE.filter((t) => t.parentSlug)) {
    const c = await db.category.upsert({
      where: { slug: n.slug },
      update: {
        name: n.name,
        parentId: slugToId[n.parentSlug!],
        position: n.position,
        metaTitle: n.metaTitle,
        metaDescription: n.metaDescription,
      },
      create: {
        slug: n.slug,
        name: n.name,
        parentId: slugToId[n.parentSlug!],
        position: n.position,
        metaTitle: n.metaTitle,
        metaDescription: n.metaDescription,
      },
    });
    slugToId[n.slug] = c.id;
  }

  // 3. Borrar redirect /bebe si existía (la categoría ya es real, no redirige)
  await db.redirectRule.deleteMany({ where: { from: "/bebe" } });

  return NextResponse.json({ ok: true, upserted: Object.keys(slugToId).length });
}
