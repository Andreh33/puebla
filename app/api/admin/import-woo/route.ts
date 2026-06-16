/**
 * POST /api/admin/import-woo
 *
 * Recibe un lote de WooProductGroup (serializado como JSON) y los importa en
 * la DB de producción usando la lógica ya probada de processGroup + TaxonomyCache.
 * Las imágenes se ignoran aquí (van por script separado).
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 *
 * GET /api/admin/import-woo
 * Verifica el estado de la BD (sin modificarla): total productos, con imagen,
 * y una muestra de los últimos 6 creados.
 */
import { NextResponse, type NextRequest } from "next/server";
import { Decimal } from "decimal.js";
import { db } from "@/lib/db";
import { processGroup, TaxonomyCache } from "@/lib/importer/process-woocommerce-job";
import type { ImportMode } from "@/lib/importer/process-woocommerce-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no configurado en este entorno" },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}

// ---------------------------------------------------------------------------
// Revivir Decimal desde JSON (vienen como string)
// ---------------------------------------------------------------------------

function revDec(v: unknown): Decimal | null {
  if (v == null || v === "") return null;
  try {
    return new Decimal(v as string | number);
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reviveGroup(g: any) {
  return {
    parent: {
      ...g.parent,
      retailPrice: revDec(g.parent.retailPrice),
      salePrice: revDec(g.parent.salePrice),
      costPrice: revDec(g.parent.costPrice),
      weight: revDec(g.parent.weight),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    variations: (g.variations ?? []).map((v: any) => ({
      ...v,
      retailPrice: revDec(v.retailPrice),
      salePrice: revDec(v.salePrice),
      costPrice: revDec(v.costPrice),
    })),
  };
}

// ---------------------------------------------------------------------------
// POST — importa un lote de grupos
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON inválido" }, { status: 400 });
  }

  const rawGroups: unknown[] = Array.isArray(body.groups) ? body.groups : [];
  const mode: ImportMode = body.mode ?? "create_update";
  const defaultStatus: "DRAFT" | "ACTIVE" | "INACTIVE" = body.defaultStatus ?? "DRAFT";

  const groups = rawGroups.map(reviveGroup);

  let processed = 0;
  let created = 0;
  let updated = 0;
  const errors: { row: number; code: string; message: string }[] = [];

  const taxonomy = new TaxonomyCache();

  try {
    await db.$transaction(
      async (tx) => {
        for (const group of groups) {
          const result = await processGroup(tx, taxonomy, group, { mode, defaultStatus });
          processed += 1;
          if (result.created) created += 1;
          if (result.updated) updated += 1;
          for (const e of result.errors) {
            errors.push(e);
          }
          // result.images se ignora — las fotos van por script separado
        }
      },
      { maxWait: 15000, timeout: 120000 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Toda la transacción del lote falló — devolver info en lugar de 500 ciego
    for (const g of groups) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (g as any).parent;
      errors.push({
        row: p?.rowNumber ?? 0,
        code: p?.sku ?? p?.wooId ?? "UNKNOWN",
        message: `Transacción de lote fallida: ${message}`,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        processed: 0,
        created: 0,
        updated: 0,
        errorCount: errors.length,
        errors: errors.slice(0, 50),
        message,
      },
      { status: 200 }, // devolvemos 200 para que el feeder pueda leer el body y reintentar
    );
  }

  const errorCount = errors.length;
  return NextResponse.json({
    ok: true,
    processed,
    created,
    updated,
    errorCount,
    errors: errors.slice(0, 50),
  });
}

// ---------------------------------------------------------------------------
// GET — verifica estado de la BD sin modificarla
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  const total = await db.product.count();
  const withImg = await db.product.count({ where: { mainImageUrl: { not: null } } });

  // Desglose por status (para PROBAR que el catálogo importado sigue en DRAFT)
  const statusGroups = await db.product.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(
    statusGroups.map((s) => [s.status, s._count._all]),
  );
  const wooFilter = { externalId: { startsWith: "woocommerce:" } } as const;
  const wooImported = await db.product.count({ where: wooFilter });
  const wooActive = await db.product.count({
    where: { ...wooFilter, status: "ACTIVE" },
  });
  const wooWithImg = await db.product.count({
    where: { ...wooFilter, mainImageUrl: { not: null } },
  });

  const sample = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      name: true,
      sku: true,
      gender: true,
      footwearType: true,
      garmentType: true,
      mainImageUrl: true,
      primaryCategory: { select: { slug: true } },
      categories: { select: { category: { select: { slug: true } } } },
    },
  });

  return NextResponse.json({
    ok: true,
    totalProducts: total,
    withMainImage: withImg,
    byStatus,
    wooImported,
    wooActive,
    wooWithImg,
    sample: sample.map((p) => ({
      name: p.name,
      sku: p.sku,
      gender: p.gender,
      footwearType: p.footwearType,
      garmentType: p.garmentType,
      mainImageUrl: p.mainImageUrl,
      primary: p.primaryCategory?.slug ?? null,
      categories: p.categories.map((c) => c.category.slug),
    })),
  });
}
