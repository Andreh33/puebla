/**
 * POST /api/import/xlsx
 *
 * Recibe un fichero .xlsx (multipart/form-data) + opciones de import,
 * crea un `ImportJob` en estado PENDING y dispara `processImportJob`
 * fire-and-forget para procesar en background.
 *
 * Devuelve { jobId } al cliente, que hará polling a /api/import/jobs/[id].
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImportOptionsSchema } from "@/lib/validators";
import { processImportJob } from "@/lib/importer/process-job";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30; // segundos para la creación del job; el procesado es asíncrono

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Se esperaba multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo 'file'" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `El archivo excede el máximo de 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` },
      { status: 413 },
    );
  }
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Sólo se aceptan ficheros .xlsx" },
      { status: 415 },
    );
  }

  const optionsRaw = form.get("options");
  const options = ImportOptionsSchema.parse(
    optionsRaw && typeof optionsRaw === "string" ? JSON.parse(optionsRaw) : {},
  );

  // Guardar en /tmp local. En producción Vercel, /tmp es escribible (ephemeral)
  // y suficiente para que `processImportJob` lo lea hasta finalizar.
  const dir = path.join(tmpdir(), "zs-imports");
  await mkdir(dir, { recursive: true });
  const safeBaseName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = path.join(dir, `${Date.now()}-${safeBaseName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const job = await db.importJob.create({
    data: {
      source: "XLSX",
      status: "PENDING",
      mode: options.mode,
      fileUrl: filePath,
      fileName: file.name,
      options: options as unknown as Prisma.InputJsonValue,
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  // Fire-and-forget: no await, atrapamos errores y los persistimos en el job
  void (async () => {
    try {
      await processImportJob(job.id);
    } catch (err) {
      // processImportJob ya persiste FAILED si lanza; este catch es defensivo
      console.error(`[import:xlsx] job ${job.id} failed`, err);
    }
  })();

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
