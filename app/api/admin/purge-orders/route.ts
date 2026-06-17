/**
 * POST /api/admin/purge-orders   (Bearer SETUP_TOKEN)
 *
 * Borra pedidos de PRUEBA. Por seguridad exige `before` (fecha ISO): solo
 * elimina pedidos creados ANTES de esa fecha, de modo que NUNCA pueda borrar
 * pedidos reales futuros. Los OrderItem se borran en cascada (onDelete: Cascade).
 *
 * Body: { before: string (ISO), dryRun?: boolean }
 *   - dryRun:true → no borra, solo lista lo que borraría.
 *
 * Utilidad one-shot para limpiar pedidos de prueba antes del lanzamiento.
 */

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { before?: string; dryRun?: boolean } = {};
  try {
    body = (await req.json()) as { before?: string; dryRun?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.before) {
    return NextResponse.json(
      { error: "missing_before", message: "Falta 'before' (fecha ISO)." },
      { status: 400 },
    );
  }
  const before = new Date(body.before);
  if (Number.isNaN(before.getTime())) {
    return NextResponse.json(
      { error: "invalid_before", message: "Fecha 'before' no válida." },
      { status: 400 },
    );
  }

  const where = { createdAt: { lt: before } } as const;
  const matches = await db.order.findMany({
    where,
    select: {
      id: true,
      createdAt: true,
      status: true,
      total: true,
      customerName: true,
      customerEmail: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      count: matches.length,
      before: before.toISOString(),
      orders: matches,
    });
  }

  // OrderItem se elimina en cascada (relación onDelete: Cascade en el schema).
  const result = await db.order.deleteMany({ where });

  return NextResponse.json({
    deleted: result.count,
    before: before.toISOString(),
    orders: matches,
  });
}
