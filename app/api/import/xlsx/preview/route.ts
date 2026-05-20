/**
 * POST /api/import/xlsx/preview  (preview UNIVERSAL)
 *
 * Recibe cualquier tabla (.xlsx .xls .xlsb .ods .fods .csv .tsv .txt) en
 * multipart/form-data y devuelve las primeras 10 filas normalizadas para la
 * vista previa, junto al feed detectado.
 *
 * Enruta según el feed:
 *   - "woocommerce" → previewWooCommerceFile (parents → forma PreviewRow).
 *   - "pricat" | "generic" → previewPricatRows.
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { auth } from "@/lib/auth";
import { previewPricatRows } from "@/lib/importer/xlsx";
import { previewWooCommerceFile } from "@/lib/importer/woocommerce";
import { readTable, isSupportedTableExtension } from "@/lib/importer/read-table";
import { detectFeedKind } from "@/lib/importer/detect-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

interface PreviewRow {
  rowNumber: number;
  externalId: string;
  modelArticleCode: string;
  modelCode: string;
  name: string;
  brand: string;
  category: string;
  colorName: string;
  size: string;
  gender: string;
  retailPrice: string | null;
  costPrice: string | null;
  ean: string | null;
  status: string;
}

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
  if (!isSupportedTableExtension(file.name)) {
    return NextResponse.json(
      {
        error:
          "Formato no soportado. Acepta: .xlsx, .xls, .xlsb, .ods, .fods, .csv, .tsv, .txt",
      },
      { status: 415 },
    );
  }

  const dir = path.join(tmpdir(), "zs-imports-preview");
  await mkdir(dir, { recursive: true });
  const safeBaseName = file.name.replace(/[^\w.\-]+/g, "_");
  const filePath = path.join(dir, `${Date.now()}-${safeBaseName}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  try {
    // Detectar feed por cabeceras
    const table = await readTable(buffer, file.name);
    const feedKind = detectFeedKind(table.headers);

    let rows: PreviewRow[];
    if (feedKind === "woocommerce") {
      const parents = await previewWooCommerceFile(filePath, 10);
      rows = parents.map((p) => ({
        rowNumber: p.rowNumber,
        externalId: p.externalId,
        modelArticleCode: p.sku,
        modelCode: p.modelCode,
        name: p.name,
        brand: p.brand,
        category: p.category,
        colorName: p.colorName,
        size: "",
        gender: p.gender,
        retailPrice: p.retailPrice?.toFixed(2) ?? null,
        costPrice: p.costPrice?.toFixed(2) ?? null,
        ean: null,
        status: p.status,
      }));
    } else {
      const pricat = await previewPricatRows(filePath, 10);
      rows = pricat.map((r) => ({
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
      }));
    }

    return NextResponse.json({ rows, feedKind, format: table.format });
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
