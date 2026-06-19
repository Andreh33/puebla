/**
 * POST /api/track — registra una visita de página (analítica propia).
 *
 * Lo llama el cliente (components/public/TrackPageView) en cada cambio de ruta,
 * SOLO si el usuario consintió la categoría "analytics". Agrega por (path, day):
 * 1 fila por ruta y día (upsert con increment). Best-effort: nunca devuelve
 * error al usuario (responde 204 siempre) para no afectar a la navegación.
 *
 * No rastrea /admin ni /api (se filtran aquí y en el cliente).
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Día actual (medianoche) en horario peninsular, como Date (YYYY-MM-DD UTC). */
function madridDay(): Date {
  // "en-CA" => "YYYY-MM-DD"; new Date("YYYY-MM-DD") = medianoche UTC de ese día.
  const ymd = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  return new Date(ymd);
}

/** Normaliza el path: sin query/hash, sin barra final (salvo "/"), máx 512. */
function normalizePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let p = raw.trim();
  if (!p.startsWith("/")) return null;
  p = p.split("?")[0]!.split("#")[0]!;
  if (p.startsWith("/admin") || p.startsWith("/api")) return null;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p.length > 512) p = p.slice(0, 512);
  return p || "/";
}

export async function POST(req: NextRequest) {
  let body: { path?: unknown } = {};
  try {
    body = (await req.json()) as { path?: unknown };
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const path = normalizePath(body.path);
  if (!path) return new NextResponse(null, { status: 204 });

  try {
    const day = madridDay();
    await db.pageView.upsert({
      where: { path_day: { path, day } },
      create: { path, day, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch {
    // El tracking NUNCA debe romper nada: si la tabla no existe aún o falla la
    // DB, lo ignoramos en silencio (responde 204 igualmente).
  }

  return new NextResponse(null, { status: 204 });
}
