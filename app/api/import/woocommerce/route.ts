/**
 * POST /api/import/woocommerce
 *
 * Recibe un fichero CSV exportado por WooCommerce (multipart/form-data) +
 * opciones de import (mode, defaultStatus). Crea un ImportJob en estado
 * PENDING y dispara `processWooCommerceImportJob` con `after()` para que
 * corra en background tras devolver la response.
 *
 * El CSV real del cliente pesa ~3.3 MB y crecerá: aceptamos hasta 20 MB.
 *
 * Devuelve `{ jobId }` para el polling desde el cliente.
 */

import { NextResponse, after } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImportOptionsSchema } from "@/lib/validators";
import { processWooCommerceImportJob } from "@/lib/importer/process-woocommerce-job";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// El procesado vive DENTRO de la misma function execution vía `after()`.
// Necesitamos 300s porque el CSV puede tener 5k+ filas y la descarga de
// imágenes desde el CDN del antiguo WordPress es lenta.
export const maxDuration = 300;

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB — el export real pesa ~3.3 MB

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
      {
        error: `El archivo excede el máximo de 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      },
      { status: 413 },
    );
  }
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Sólo se aceptan ficheros .csv (export WooCommerce)" },
      { status: 415 },
    );
  }

  const optionsRaw = form.get("options");
  let optionsJson: unknown = {};
  if (optionsRaw && typeof optionsRaw === "string") {
    try {
      optionsJson = JSON.parse(optionsRaw);
    } catch {
      return NextResponse.json({ error: "Opciones de importación inválidas (JSON malformado)" }, { status: 400 });
    }
  }
  const optionsParsed = ImportOptionsSchema.safeParse(optionsJson);
  if (!optionsParsed.success) {
    return NextResponse.json({ error: "Opciones de importación inválidas" }, { status: 400 });
  }
  const options = optionsParsed.data;

  const dir = path.join(tmpdir(), "zs-imports");
  await mkdir(dir, { recursive: true });
  const safeBaseName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = path.join(dir, `${Date.now()}-${safeBaseName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const job = await db.importJob.create({
    data: {
      source: "WOOCOMMERCE",
      status: "PENDING",
      mode: options.mode,
      fileUrl: filePath,
      fileName: file.name,
      options: options as unknown as Prisma.InputJsonValue,
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  after(async () => {
    const t0 = Date.now();
    console.log(
      `[import:woo] job ${job.id} → arranque after() · file=${file.name} · size=${(file.size / 1024).toFixed(1)} KB`,
    );
    try {
      await processWooCommerceImportJob(job.id);
      console.log(
        `[import:woo] job ${job.id} → done en ${((Date.now() - t0) / 1000).toFixed(1)} s`,
      );
    } catch (err) {
      const e = err as Error;
      console.error(
        `[import:woo] job ${job.id} FAILED tras ${((Date.now() - t0) / 1000).toFixed(1)} s:`,
        e,
      );
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
          console.error(`[import:woo] no pude persistir FAILED:`, dbErr);
        });
    }
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
