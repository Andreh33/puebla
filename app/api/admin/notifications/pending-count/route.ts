import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Contador persistente: no depende de cuándo se abrió el panel. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const summary = await db.marketplaceRemovalNotification.aggregate({
      where: { resolvedAt: null },
      _count: { _all: true },
      _max: { lastSoldAt: true },
    });
    return NextResponse.json({
      count: summary._count._all,
      lastSoldAt: summary._max.lastSoldAt?.toISOString() ?? null,
    });
  } catch {
    // Un 503 hace que el watcher conserve el último contador conocido. Devolver
    // 0 ocultaría avisos persistentes durante una caída temporal de Neon.
    return NextResponse.json({ error: "No se pudo consultar el contador." }, { status: 503 });
  }
}
