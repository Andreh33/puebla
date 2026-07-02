/**
 * POST /api/promo/validate (público)
 *
 * Valida un código y devuelve el descuento en € para un `subtotal` (bruto, IVA
 * incl.) dado. Solo para MOSTRAR el descuento en el carrito; la validación que
 * manda es la de create-checkout (recalcula con los precios reales). Rate-limit
 * por IP para evitar fuerza bruta de códigos.
 */
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validatePromoCode } from "@/lib/promo/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida." }, { status: 400 });
  }
  const b = (json ?? {}) as Record<string, unknown>;
  const code = typeof b.code === "string" ? b.code : "";
  const subtotal = typeof b.subtotal === "number" && Number.isFinite(b.subtotal) ? b.subtotal : 0;

  const ip = getClientIp(req);
  const rl = rateLimit(`promo:${ip}`, { limit: 30, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Prueba más tarde." }, { status: 429 });
  }

  const res = await validatePromoCode(code, subtotal);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error });
  return NextResponse.json({ ok: true, code: res.code, discount: res.discount });
}
