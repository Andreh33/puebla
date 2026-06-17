/**
 * POST /api/import/xlsx  (importador UNIVERSAL de tablas)
 *
 * Pese al nombre histórico "xlsx", este endpoint acepta CUALQUIER tabla:
 *   .xlsx .xls .xlsb .ods .fods .csv .tsv .txt  (hasta 20 MB).
 *
 * Flujo:
 *   1. Guarda el fichero en /tmp (ephemeral en Vercel).
 *   2. `readTable` → cabeceras + formato detectado.
 *   3. `detectFeedKind(headers)` → enruta:
 *        · "woocommerce" → processWooCommerceImportJob
 *        · "pricat" | "generic" → processImportJob (pipeline PRICAT)
 *   4. Crea un ImportJob (source XLSX o WOOCOMMERCE) y procesa con `after()`.
 *
 * Persistimos formato + feedKind como breadcrumb INFO en errors[] para que el
 * cliente lo vea en el polling ("Formato: xlsx · Feed: woocommerce · 1362 filas").
 */

import { NextResponse, after } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ImportOptionsSchema } from "@/lib/validators";
import { processImportJob } from "@/lib/importer/process-job";
import { processWooCommerceImportJob } from "@/lib/importer/process-woocommerce-job";
import { readTable, isSupportedTableExtension } from "@/lib/importer/read-table";
import { detectFeedKind } from "@/lib/importer/detect-feed";
import type { Prisma, ImportSource } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// El procesado vive DENTRO de la misma function execution vía `after()`:
// Next.js garantiza que las tareas registradas con `after` corren después de
// devolver la response pero antes de que termine la function. maxDuration=300
// porque catálogos grandes + descarga de imágenes son lentos.
export const maxDuration = 300;

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

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
      { error: `El archivo excede el máximo de 20MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` },
      { status: 413 },
    );
  }
  if (!isSupportedTableExtension(file.name)) {
    return NextResponse.json(
      {
        error:
          "Formato no soportado. Acepta: .xlsx, .xls, .xlsb, .ods, .fods, .csv, .tsv, .txt",
      },
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

  // Guardar en /tmp local (escribible y suficiente para que el procesador lo lea).
  const dir = path.join(tmpdir(), "zs-imports");
  await mkdir(dir, { recursive: true });
  const safeBaseName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = path.join(dir, `${Date.now()}-${safeBaseName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Autodetección de tipo de feed leyendo solo las cabeceras del fichero.
  let feedKind: "pricat" | "woocommerce" | "generic" = "pricat";
  let format = "desconocido";
  let detectedRows = 0;
  try {
    const table = await readTable(buffer, file.name);
    format = table.format;
    detectedRows = table.rows.length;
    feedKind = detectFeedKind(table.headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `No se pudo leer el archivo: ${message}` },
      { status: 422 },
    );
  }

  const source: ImportSource = feedKind === "woocommerce" ? "WOOCOMMERCE" : "XLSX";
  const breadcrumb = {
    row: 0,
    code: "INFO",
    message: `Formato: ${format} · Feed: ${feedKind} · ${detectedRows} filas`,
  };

  const job = await db.importJob.create({
    data: {
      source,
      status: "PENDING",
      mode: options.mode,
      fileUrl: filePath,
      fileName: file.name,
      options: options as unknown as Prisma.InputJsonValue,
      errors: [breadcrumb] as unknown as Prisma.InputJsonValue,
      createdBy: session.user.id,
    },
    select: { id: true },
  });

  // Procesado garantizado con `after()`: corre tras devolver la response, pero
  // dentro de la misma function execution (maxDuration=300). Enrutamos según
  // el feed detectado. Si el procesador lanza, persistimos FAILED + stack.
  after(async () => {
    const t0 = Date.now();
    console.log(
      `[import:tabla] job ${job.id} → arranque after() · file=${file.name} · format=${format} · feed=${feedKind} · size=${(file.size / 1024).toFixed(1)} KB`,
    );
    try {
      if (feedKind === "woocommerce") {
        await processWooCommerceImportJob(job.id);
      } else {
        await processImportJob(job.id);
      }
      console.log(
        `[import:tabla] job ${job.id} → done en ${((Date.now() - t0) / 1000).toFixed(1)} s`,
      );
    } catch (err) {
      const e = err as Error;
      console.error(
        `[import:tabla] job ${job.id} FAILED tras ${((Date.now() - t0) / 1000).toFixed(1)} s:`,
        e,
      );
      await db.importJob
        .update({
          where: { id: job.id },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            errors: [
              breadcrumb,
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
          console.error(`[import:tabla] no pude persistir FAILED:`, dbErr);
        });
    }
  });

  return NextResponse.json({ jobId: job.id, feedKind, format }, { status: 202 });
}

// Nota sobre breadcrumbs: tanto processImportJob como processWooCommerceImportJob
// reescriben errors[] al arrancar (con sus propios breadcrumbs INFO). El INFO de
// "Formato/Feed" que persistimos aquí es visible mientras el job está PENDING y
// queda registrado en el log de arranque; los procesadores añaden los suyos
// encima en cuanto pasan a RUNNING.
