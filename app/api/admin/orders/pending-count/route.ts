import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Sondeo del panel: nº de pedidos ONLINE creados después de `since`. Lo consume
// el aviso de "pedido nuevo" (campana + alerta) del admin. Autenticado por
// sesión (como el resto de /api que llama el navegador del admin).
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

  // Solo pedidos de la web (no ventas del TPV, que hace la propia tienda) y no
  // cancelados. `createdAt > since` capta lo que entra tras abrir el panel.
  const where = {
    deliveryMethod: { not: "in_store" },
    status: { not: "CANCELLED" as const },
    ...(hasSince ? { createdAt: { gt: since } } : {}),
  };

  try {
    const [count, latest] = await Promise.all([
      db.order.count({ where }),
      db.order.findFirst({
        where: { deliveryMethod: { not: "in_store" } },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      }),
    ]);
    return NextResponse.json({
      count,
      latestId: latest?.id ?? null,
      latestAt: latest?.createdAt?.toISOString() ?? null,
    });
  } catch {
    // Nunca romper el poll del navegador: devolvemos 0 en caso de fallo de BD.
    return NextResponse.json({ count: 0, latestId: null, latestAt: null });
  }
}
