import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";
// Esta ruta NO debe cachearse: es la que invalida cachés ajenas.
export const dynamic = "force-dynamic";

/**
 * Revalidación on-demand. Útil para:
 *   - Integraciones externas (Sanity-like, webhooks de proveedores).
 *   - Server actions del admin que necesiten purgar páginas concretas.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}`. Si la env no está
 * configurada, la ruta queda permanentemente deshabilitada (cierre fail-safe).
 *
 * Body JSON:
 *   { path?: string | string[]; tag?: string | string[] }
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { path?: string | string[]; tag?: string | string[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const paths = Array.isArray(body.path) ? body.path : body.path ? [body.path] : [];
  const tags = Array.isArray(body.tag) ? body.tag : body.tag ? [body.tag] : [];

  if (paths.length === 0 && tags.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Se requiere `path` o `tag`" },
      { status: 400 },
    );
  }

  for (const p of paths) revalidatePath(p);
  for (const t of tags) revalidateTag(t);

  return NextResponse.json({
    ok: true,
    revalidated: { paths, tags },
    now: Date.now(),
  });
}

// GET para health-check rápido (sin secret expuesto).
export async function GET() {
  return NextResponse.json({
    ok: true,
    info: "POST con Bearer CRON_SECRET y body { path?, tag? } para revalidar.",
  });
}
