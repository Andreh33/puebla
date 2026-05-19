/**
 * GET /api/cron/refresh-miravia
 * Auth: Bearer CRON_SECRET. Ejecuta runMiraviaSync() y devuelve resumen.
 * Si Miravia no estÃ¡ configurado, devuelve 200 con `skipped: true`.
 */
import { NextResponse, type NextRequest } from "next/server";
import { runMiraviaSync } from "@/lib/miravia/sync";
import { MiraviaNotConfiguredError } from "@/lib/miravia/provider";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron/refresh-miravia] CRON_SECRET no configurado");
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado" },
      { status: 503 },
    );
  }
  const authz = req.headers.get("authorization");
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMiraviaSync({ dryRun: false });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    if (err instanceof MiraviaNotConfiguredError) {
      return NextResponse.json({ ok: true, skipped: true, reason: err.message });
    }
    console.error("[cron/refresh-miravia] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 200 },
    );
  }
}
