/**
 * POST /api/import/miravia
 * Body: { dryRun?: boolean }
 * Dispara runMiraviaSync(). Solo accesible para sesiÃ³n admin.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { runMiraviaSync } from "@/lib/miravia/sync";
import { MiraviaNotConfiguredError } from "@/lib/miravia/provider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const rl = rateLimit(`miravia-import:${session.user.id}`, {
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
    const result = await runMiraviaSync({
      dryRun,
      createdBy: session.user.id,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof MiraviaNotConfiguredError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 503 });
    }
    console.error("[api/import/miravia] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
