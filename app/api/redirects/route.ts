import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bumpHit, drainHits, loadRedirectsFromDb, shouldFlushHits } from "@/lib/redirects";

export const runtime = "nodejs";
// Cacheada con tag `redirects`. La invalida `revalidateTag('redirects')` desde
// las server actions del admin.
export const revalidate = 60;

/**
 * GET — devuelve la lista de redirecciones activas para que el middleware
 * (edge) pueda armar su cache local.
 * POST — registra hits del middleware. Body: `{ id: string }` o `{ ids: string[] }`.
 */
export async function GET() {
  const rules = await loadRedirectsFromDb(db);
  return NextResponse.json(
    { rules },
    {
      headers: {
        "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { id?: string; ids?: string[] };
    const ids = body.ids ?? (body.id ? [body.id] : []);
    for (const id of ids) bumpHit(id);

    if (shouldFlushHits()) {
      const batch = drainHits();
      // Persistimos sin bloquear: lo encolamos pero esperamos por correctitud.
      await Promise.all(
        batch.map(({ id, hits }) =>
          db.redirectRule.update({
            where: { id },
            data: { hits: { increment: hits } },
          }).catch(() => {}),
        ),
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
