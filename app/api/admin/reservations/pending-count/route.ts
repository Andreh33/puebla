import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Sondeo del panel: nº de reservas por WhatsApp creadas después de `since`. Lo
// consume el aviso verde de "reserva nueva". Autenticado por sesión.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;
  const hasSince = since != null && !Number.isNaN(since.getTime());

  try {
    const count = await db.whatsappReservation.count({
      where: hasSince ? { createdAt: { gt: since } } : {},
    });
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
