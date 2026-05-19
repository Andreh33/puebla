/**
 * POST /api/import/xlsx
 *
 * Recibe un fichero .xlsx (multipart/form-data) + opciones de import,
 * crea un `ImportJob` en estado PENDING y dispara `processImportJob`
 * fire-and-forget para procesar en background.
 *
 * Devuelve { jobId } al cliente, que hará polling a /api/import/jobs/[id].
 */

import { NextResponse, after } from "next/server";
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
// El procesado vive DENTRO de la misma function execution vía `after()`:
// Next.js garantiza que las tareas registradas con `after` corren después
// de devolver la response pero antes de que termine la function. Sin esto,
// el `void (async () => ...)` previo se mataba en cuanto el handler
// retornaba — el job quedaba en PENDING para siempre.
export const maxDuration = 300;

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

  // Procesado garantizado con `after()`: corre tras devolver la response al
  // cliente, pero dentro de la misma function execution (maxDuration=300).
  // Si processImportJob lanza, lo capturamos y persistimos FAILED con el
  // mensaje + stack truncado para que el cliente lo vea en el polling.
  after(async () => {
    const t0 = Date.now();
    console.log(`[import:xlsx] job ${job.id} → arranque after() · file=${file.name} · size=${(file.size / 1024).toFixed(1)} KB`);
    try {
      await processImportJob(job.id);
      console.log(`[import:xlsx] job ${job.id} → done en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } catch (err) {
      const e = err as Error;
      console.error(`[import:xlsx] job ${job.id} FAILED tras ${((Date.now() - t0) / 1000).toFixed(1)} s:`, e);
      // Persistimos el error en el job para que se vea en /api/import/jobs/[id].
      await db.importJob
        .update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            errors: [
              {
                row: 0,
                code: "PROCESS_ERROR",
                message: (e.message || "Error desconocido").slice(0, 500),
              },
              {
                row: 0,
                code: "STACK",
                message: (e.stack || "").split("\n").slice(0, 6).join(" | ").slice(0, 1500),
              },
            ] as unknown as Prisma.InputJsonValue,
          },
        })
        .catch((dbErr) => {
          console.error(`[import:xlsx] no pude persistir FAILED:`, dbErr);
        });
    }
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
