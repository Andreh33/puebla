/**
 * POST /api/import/movalia
 * Body: { dryRun?: boolean }
 * Dispara runMovaliaSync(). Solo accesible para sesión admin.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { runMovaliaSync } from "@/lib/movalia/sync";
import { MovaliaNotConfiguredError } from "@/lib/movalia/provider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const rl = rateLimit(`movalia-import:${session.user.id}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas peticiones." },
      { status: 429 },
    );
  }

  let body: { dryRun?: unknown };
  try {
    body = (await req.json()) as { dryRun?: unknown };
  } catch {
    body = {};
  }
  const dryRun = body.dryRun === true;

  try {
    const result = await runMovaliaSync({
      dryRun,
      createdBy: session.user.id,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof MovaliaNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    console.error("[api/import/movalia] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
