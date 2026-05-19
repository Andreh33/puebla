/**
 * GET /api/import/jobs/[id]
 *
 * Devuelve el estado actual del ImportJob para el polling del cliente.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const job = await db.importJob.findUnique({
    where: { id },
    select: {
      id: true,
      source: true,
      status: true,
      mode: true,
      fileName: true,
      totalRows: true,
      processedRows: true,
      createdRows: true,
      updatedRows: true,
      errorRows: true,
      errors: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job no encontrado" }, { status: 404 });
  }

  return NextResponse.json(job);
}
