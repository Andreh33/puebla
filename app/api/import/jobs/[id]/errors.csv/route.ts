/**
 * GET /api/import/jobs/[id]/errors.csv
 *
 * Descarga el listado de errores del job como CSV.
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface JobError {
  row: number;
  code: string;
  message: string;
}

function escapeCsv(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;
  const job = await db.importJob.findUnique({
    where: { id },
    select: { id: true, errors: true, fileName: true },
  });
  if (!job) return new Response("Job no encontrado", { status: 404 });

  const errs = Array.isArray(job.errors) ? (job.errors as unknown as JobError[]) : [];
  const header = "fila;codigo;mensaje\n";
  const body = errs
    .map((e) => `${escapeCsv(e.row)};${escapeCsv(e.code)};${escapeCsv(e.message)}`)
    .join("\n");

  // BOM UTF-8 para que Excel abra bien los acentos
  const csv = "﻿" + header + body;
  const safeName = (job.fileName ?? `job-${id}`).replace(/[^\w.\-]+/g, "_");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="errores-${safeName}.csv"`,
    },
  });
}
