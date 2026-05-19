/**
 * POST /api/admin/clean-descriptions
 *
 * Recorre productos cuya descripción contenga el patrón sucio de spans de
 * scraping AI (data-url="ca://", role="button", tabindex="0") y aplica
 * `cleanDescription()` para limpiarla in-place. NO toca productos
 * con isCustomized=true ni los que ya están limpios.
 *
 * Auth: Bearer ${SETUP_TOKEN}.
 *
 * Devuelve { scanned, dirty, cleaned, skipped } para verificación.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cleanDescription, hasDirtySpans } from "@/lib/products/clean-description";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 200;

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

  let scanned = 0;
  let dirty = 0;
  let cleaned = 0;
  let skipped = 0;
  let cursor: string | undefined;
  const t0 = Date.now();

  // Paginación por cursor (id) para soportar catálogos grandes sin
  // cargar todo en memoria.
  while (true) {
    const rows: Array<{ id: string; description: string | null; isCustomized: boolean }> =
      await db.product.findMany({
        where: { description: { not: null } },
        select: { id: true, description: true, isCustomized: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
    if (rows.length === 0) break;

    for (const p of rows) {
      scanned++;
      if (!hasDirtySpans(p.description)) continue;
      dirty++;
      if (p.isCustomized) {
        skipped++;
        continue;
      }
      const next = cleanDescription(p.description);
      if (next !== p.description) {
        await db.product.update({
          where: { id: p.id },
          data: { description: next },
        });
        cleaned++;
      }
    }

    cursor = rows[rows.length - 1]!.id;
    if (rows.length < BATCH) break;
  }

  return NextResponse.json({
    ok: true,
    scanned,
    dirty,
    cleaned,
    skipped,
    durationMs: Date.now() - t0,
  });
}
