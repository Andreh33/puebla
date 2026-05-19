/**
 * GET /api/cron/sitemap-revalidate
 *
 * Revalida el tag "sitemap" — los endpoints /sitemap.xml, /robots.txt y
 * cualquier query cacheada bajo ese tag (Agentes 4/5/8) se regenerarán al
 * siguiente request. Auth: Bearer CRON_SECRET.
 */
import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[cron/sitemap-revalidate] CRON_SECRET no configurado");
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
    revalidateTag("sitemap");
    return NextResponse.json({
      ok: true,
      revalidatedTag: "sitemap",
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/sitemap-revalidate] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 200 },
    );
  }
}
