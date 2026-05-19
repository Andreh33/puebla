/**
 * POST /api/admin/cleanup-demos
 *
 * Borra los productos sembrados como demo + los importados del PRICAT
 * inicial. Eran datos de muestra; el catálogo real entra por WooCommerce.
 *
 * Auth: Bearer ${SETUP_TOKEN}.
 *
 * Criterio:
 *   - externalId LIKE 'demo:%'        → 24 productos del seed
 *   - externalId LIKE 'pricat:%'      → ~583 productos del primer import
 *   - Conserva intactos los WooCommerce (externalId 'woocommerce:%').
 *
 * Cascade Prisma: al borrar Product se borran sus ProductImage y
 * ProductSize automáticamente (onDelete Cascade en el schema).
 *
 * NO toca Brand ni Category — algunas pueden estar compartidas con los
 * productos WooCommerce. Si quedaran vacías el admin las borra a mano
 * desde /admin/categorias.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no configurado" },
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
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  try {
    const [before, demos, pricats] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { externalId: { startsWith: "demo:" } } }),
      db.product.count({ where: { externalId: { startsWith: "pricat:" } } }),
    ]);

    const deleted = await db.product.deleteMany({
      where: {
        OR: [
          { externalId: { startsWith: "demo:" } },
          { externalId: { startsWith: "pricat:" } },
        ],
      },
    });

    const after = await db.product.count();

    return NextResponse.json({
      ok: true,
      before,
      deleted: deleted.count,
      breakdown: { demos, pricats },
      remaining: after,
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack?.split("\n").slice(0, 6) },
      { status: 500 },
    );
  }
}
