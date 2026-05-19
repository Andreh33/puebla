/**
 * POST /api/admin/setup
 *
 * Bootstrap one-shot de la DB en producción. Idempotente.
 *
 * Existe porque Vercel Marketplace (Neon) marca DATABASE_URL como Sensitive
 * y el CLI no la decripta — no se puede ejecutar `npm run seed` desde local.
 * Este endpoint corre dentro de un Vercel Function, donde la env var sí está
 * decriptada.
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}` (env var en Vercel).
 *
 * GET → status (admin existe? cuántos productos? cuántas marcas?). Útil para
 * confirmar tras un deploy sin escribir nada.
 *
 * POST → ejecuta runSeed() y devuelve el resultado.
 *
 * No se eliminan datos. Si quieres resetear, hazlo desde Neon Studio.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { runSeed } from "@/lib/seed/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const [adminCount, brandCount, categoryCount, productCount, settingCount, blogCount] =
      await Promise.all([
        db.adminUser.count(),
        db.brand.count(),
        db.category.count(),
        db.product.count(),
        db.setting.count(),
        db.blogPost.count(),
      ]);
    return NextResponse.json({
      ok: true,
      status: {
        admins: adminCount,
        brands: brandCount,
        categories: categoryCount,
        products: productCount,
        settings: settingCount,
        blogPosts: blogCount,
      },
    });
  } catch (err) {
    const message = (err as Error).message;
    return NextResponse.json(
      {
        ok: false,
        error: "DB no accesible o schema no aplicado",
        detail: message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await runSeed(db);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const e = err as Error;
    console.error("[api/admin/setup] runSeed failed:", e);
    return NextResponse.json(
      { ok: false, error: e.message, stack: e.stack?.split("\n").slice(0, 6) },
      { status: 500 },
    );
  }
}
