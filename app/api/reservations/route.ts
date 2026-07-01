/**
 * POST /api/reservations (público)
 *
 * Registra una reserva por WhatsApp cuando el cliente pulsa "Reservar por
 * WhatsApp" (producto o carrito). Capta la INTENCIÓN de reservar; el mensaje se
 * envía ya dentro de WhatsApp (fuera de nuestro alcance). Rate-limit por IP para
 * evitar spam. Nunca lanza: si algo falla, responde 200 silencioso (el cliente
 * no debe notar nada; su navegación a WhatsApp continúa).
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: true }); // silencioso
  }
  const b = (json ?? {}) as Record<string, unknown>;

  const ip = getClientIp(req);
  const rl = rateLimit(`reservation:${ip}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!rl.ok) return NextResponse.json({ ok: true }); // silencioso ante abuso

  const kind = str(b.kind) === "cart" ? "cart" : "product";
  const summary = str(b.summary, 2000) ?? (kind === "cart" ? "Reserva de carrito" : "Reserva de producto");
  const amountNum = typeof b.amount === "number" && Number.isFinite(b.amount) ? b.amount : null;
  const itemsCount =
    typeof b.itemsCount === "number" && Number.isFinite(b.itemsCount) ? Math.trunc(b.itemsCount) : null;

  try {
    await db.whatsappReservation.create({
      data: {
        kind,
        productName: str(b.productName),
        sku: str(b.sku, 120),
        size: str(b.size, 40),
        itemsCount,
        amount: amountNum != null ? amountNum.toFixed(2) : null,
        summary,
        sourcePage: str(b.sourcePage, 500),
      },
    });
  } catch (err) {
    console.warn("[api/reservations] no se pudo registrar:", (err as Error).message);
  }
  return NextResponse.json({ ok: true });
}
