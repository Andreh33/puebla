/**
 * GET /api/cron/blob-garbage-collect
 *
 * Cron job que lista blobs huérfanos (no referenciados desde DB) subidos hace
 * más de `?olderThanDays` días. Por seguridad NO borra automáticamente — solo
 * lista. El borrado lo hace un admin desde /admin/imagenes.
 *
 * Autenticación: header `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { findOrphanBlobs } from "@/lib/blob/garbage-collect";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("olderThanDays") ?? 7);
  const safeDays = Number.isFinite(days) && days >= 0 ? Math.min(days, 365) : 7;

  try {
    const orphans = await findOrphanBlobs(safeDays);
    const totalBytes = orphans.reduce((sum, o) => sum + o.size, 0);
    return NextResponse.json({
      ok: true,
      olderThanDays: safeDays,
      count: orphans.length,
      totalBytes,
      orphans: orphans.slice(0, 500), // tope de payload
    });
  } catch (err) {
    console.error("[cron/blob-gc] error", err);
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
