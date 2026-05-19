/**
 * POST /api/import/woocommerce/preview
 *
 * Devuelve las primeras 10 filas "parent" normalizadas para mostrar como
 * vista previa antes de lanzar el job.
 */

import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { auth } from "@/lib/auth";
import { previewWooCommerceFile } from "@/lib/importer/woocommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

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
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Sólo se aceptan ficheros .csv" }, { status: 415 });
  }

  const dir = path.join(tmpdir(), "zs-imports-preview");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-preview.csv`);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  try {
    const rows = await previewWooCommerceFile(filePath, 10);
    return NextResponse.json({
      rows: rows.map((r) => ({
        rowNumber: r.rowNumber,
        wooId: r.wooId,
        sku: r.sku,
        name: r.name,
        brand: r.brand,
        category: r.category,
        colorName: r.colorName,
        gender: r.gender,
        retailPrice: r.retailPrice?.toFixed(2) ?? null,
        salePrice: r.salePrice?.toFixed(2) ?? null,
        status: r.status,
        mainImageUrl: r.mainImageUrl,
        imagesCount: r.mainImageUrl ? 1 + r.extraImageUrls.length : 0,
        isSimple: r.isSimple,
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
