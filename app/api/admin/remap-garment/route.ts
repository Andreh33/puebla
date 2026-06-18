/**
 * POST /api/admin/remap-garment?from=chaqueta&to=sudadera
 *
 * Reclasifica en bloque el `garmentType` de los productos: cambia TODOS los que
 * tienen `from` a `to`. Útil para mover una prenda oculta (p. ej. "chaqueta",
 * que está oculta del filtro/menú) a una visible (p. ej. "sudadera").
 *
 * El filtro de prenda público (/[genero]/textil?prenda=…) se rige por
 * garmentType, así que con esto los productos pasan a aparecer bajo la prenda
 * destino. NO toca la categoría del árbol (admin), solo el garmentType.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 * Respuesta: { ok: true, from, to, updated: <nº de productos> }
 */
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { GARMENT_TYPES } from "@/lib/categories/garment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = new Set<string>(GARMENT_TYPES);

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

  const url = new URL(req.url);
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();

  if (!VALID.has(from) || !VALID.has(to)) {
    return NextResponse.json(
      {
        ok: false,
        error: `from/to deben ser garmentType válidos (from="${from}", to="${to}").`,
        validos: [...VALID],
      },
      { status: 400 },
    );
  }
  if (from === to) {
    return NextResponse.json({ ok: false, error: "from y to son iguales" }, { status: 400 });
  }

  const res = await db.product.updateMany({
    where: { garmentType: from },
    data: { garmentType: to },
  });

  // El filtro de prenda usa garmentType → refrescamos las páginas de textil.
  for (const gen of ["hombre", "mujer", "nino", "nina", "bebe"]) {
    revalidatePath(`/${gen}/textil`);
  }
  revalidatePath("/catalogo");
  revalidatePath("/");

  return NextResponse.json({ ok: true, from, to, updated: res.count });
}
