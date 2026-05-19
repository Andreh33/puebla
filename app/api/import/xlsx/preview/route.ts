/**
 * POST /api/import/xlsx/preview
 *
 * Recibe un fichero xlsx en multipart/form-data y devuelve las primeras 10
 * filas normalizadas para mostrarlas como vista previa antes de lanzar el job.
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { auth } from "@/lib/auth";
import { previewPricatRows } from "@/lib/importer/xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo 'file'" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Archivo inválido o demasiado grande" },
      { status: 413 },
    );
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "Sólo se aceptan ficheros .xlsx" }, { status: 415 });
  }

  const dir = path.join(tmpdir(), "zs-imports-preview");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-preview.xlsx`);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  try {
    const rows = await previewPricatRows(filePath, 10);
    return NextResponse.json({
      rows: rows.map((r) => ({
        rowNumber: r.rowNumber,
        externalId: r.externalId,
        modelArticleCode: r.modelArticleCode,
        modelCode: r.modelCode,
        name: r.name,
        brand: r.brand,
        category: r.type,
        colorName: r.colorName,
        size: r.size,
        gender: r.gender,
        retailPrice: r.retailPrice?.toFixed(2) ?? null,
        costPrice: r.costPrice?.toFixed(2) ?? null,
        ean: r.ean,
        status: r.status,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `No se pudo leer el archivo: ${message}` },
      { status: 422 },
    );
  } finally {
    void unlink(filePath).catch(() => undefined);
  }
}
