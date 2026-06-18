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
import { revalidatePath } from "next/cache";
import { Decimal } from "decimal.js";
import { db } from "@/lib/db";
import { processGroup, TaxonomyCache } from "@/lib/importer/process-woocommerce-job";
import type { ImportMode } from "@/lib/importer/process-woocommerce-job";
import {
  deriveFootwearTypeFromSlugs,
  deriveGarmentTypeFromSlugs,
  deriveGarmentVariantFromSlugs,
} from "@/lib/products/derive-type";

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

  // Reconciliación: descatalogar (→ INACTIVE) los productos WooCommerce que ya no
  // están en el CSV definitivo. NO borra. Guard: aborta si keepWooIds < 100 para
  // no desactivar el catálogo entero por un payload truncado.
  if (body.action === "deactivate_missing") {
    const keepWooIds: string[] = Array.isArray(body.keepWooIds) ? body.keepWooIds.map(String) : [];
    if (keepWooIds.length < 100) {
      return NextResponse.json({ ok: false, error: "keepWooIds sospechosamente corto — abortado por seguridad" }, { status: 400 });
    }
    const keepExternalIds = keepWooIds.map((id) => `woocommerce:${id}`);
    const where = {
      AND: [
        { externalId: { startsWith: "woocommerce:" } },
        { externalId: { notIn: keepExternalIds } },
        { status: { not: "INACTIVE" as const } },
      ],
    };
    const toDeactivate = await db.product.findMany({ where, select: { name: true, sku: true, externalId: true } });
    const result = await db.product.updateMany({ where, data: { status: "INACTIVE" } });
    return NextResponse.json({ ok: true, deactivated: result.count, items: toDeactivate });
  }

  // Publicación masiva: pasa a ACTIVE los productos WooCommerce en DRAFT que
  // tengan foto. Los sin foto se quedan en DRAFT; los INACTIVE (descatalogados)
  // NO se tocan. Devuelve el desglose para saber qué quedó fuera y cuántos
  // publicados están sin stock (se muestran como "agotado", es intencional).
  if (body.action === "publish_catalog") {
    const base = { externalId: { startsWith: "woocommerce:" }, status: "DRAFT" as const };
    const [noPhoto, keptDraftNoStock] = await Promise.all([
      db.product.count({ where: { ...base, mainImageUrl: null } }),
      db.product.count({ where: { ...base, mainImageUrl: { not: null }, stock: { lte: 0 } } }),
    ]);
    // Regla del cliente: solo entra en tienda lo que tiene foto Y stock (>0).
    const result = await db.product.updateMany({
      where: { ...base, mainImageUrl: { not: null }, stock: { gt: 0 } },
      data: { status: "ACTIVE", publishedAt: new Date() },
    });
    // Invalida la caché de TODA la web pública para que el catálogo aparezca ya
    // (sin esperar al ISR). Revalida todas las rutas bajo el layout raíz.
    revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      published: result.count,
      keptDraftNoPhoto: noPhoto,
      keptDraftNoStock,
    });
  }

  // Regla del cliente: si un producto no tiene stock, NO debe estar en la tienda.
  // Pasa a DRAFT los productos ACTIVE sin stock (se ocultan del público). Es
  // reversible: si vuelven a tener stock y se publican, reaparecen.
  if (body.action === "draft_zero_stock") {
    const where = {
      AND: [
        { externalId: { startsWith: "woocommerce:" } },
        { status: "ACTIVE" as const },
        { stock: { lte: 0 } },
      ],
    };
    const result = await db.product.updateMany({ where, data: { status: "DRAFT" } });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, drafted: result.count });
  }

  // Asignación manual de categorías por SKU (productos que el clasificador no
  // pudo ubicar). Reutiliza la misma lógica de resolución árbol→IDs que el
  // import (processGroup): resuelve los slugs canónicos a categoryIds, reemplaza
  // el m2m ProductCategory, y fija primaryCategoryId + categoryId (legacy) al id
  // del primarySlug. Deriva footwearType/garmentType/garmentVariant de los slugs.
  // NO toca status (siguen DRAFT) ni mainImageUrl. Cada item se aísla en su
  // propia transacción para que un slug irresoluble no tumbe el resto.
  if (body.action === "set_categories") {
    type SetItem = { sku: string; categorySlugs: string[]; primarySlug: string };
    const items: SetItem[] = Array.isArray(body.items) ? body.items : [];
    const taxonomy = new TaxonomyCache();
    const results: Array<
      | { sku: string; ok: true; primary: string; n: number }
      | { sku: string; ok: false; error: string }
    > = [];

    for (const item of items) {
      const sku = String(item?.sku ?? "");
      const categorySlugs = Array.isArray(item?.categorySlugs)
        ? item.categorySlugs.map(String)
        : [];
      const primarySlug = String(item?.primarySlug ?? "");

      if (!sku) {
        results.push({ sku, ok: false, error: "sku vacío" });
        continue;
      }
      if (!primarySlug || categorySlugs.length === 0) {
        results.push({ sku, ok: false, error: "categorySlugs/primarySlug requeridos" });
        continue;
      }
      if (!categorySlugs.includes(primarySlug)) {
        results.push({ sku, ok: false, error: `primarySlug "${primarySlug}" no está en categorySlugs` });
        continue;
      }

      try {
        await db.$transaction(
          async (tx) => {
            const product = await tx.product.findFirst({
              where: { sku, externalId: { startsWith: "woocommerce:" } },
              select: { id: true },
            });
            if (!product) {
              results.push({ sku, ok: false, error: "not found" });
              return;
            }

            const treeIds = await taxonomy.resolveTreeSlugs(tx, categorySlugs);
            const missing = categorySlugs.filter((s) => !treeIds.has(s));
            if (missing.length > 0) {
              results.push({ sku, ok: false, error: `slug(s) no resuelven: ${missing.join(", ")}` });
              return;
            }
            const primaryId = treeIds.get(primarySlug);
            if (!primaryId) {
              results.push({ sku, ok: false, error: `primarySlug "${primarySlug}" no resuelve` });
              return;
            }

            // Reemplaza el m2m: borra el anterior y crea los nuevos.
            await tx.productCategory.deleteMany({ where: { productId: product.id } });
            await tx.productCategory.createMany({
              data: Array.from(treeIds.values()).map((categoryId) => ({
                productId: product.id,
                categoryId,
              })),
              skipDuplicates: true,
            });

            await tx.product.update({
              where: { id: product.id },
              data: {
                primaryCategoryId: primaryId,
                categoryId: primaryId, // legacy FK requerido
                footwearType: deriveFootwearTypeFromSlugs(categorySlugs),
                garmentType: deriveGarmentTypeFromSlugs(categorySlugs),
                garmentVariant: deriveGarmentVariantFromSlugs(categorySlugs),
                // Marca la corrección manual para que el próximo re-import NO la
                // pise (processGroup respeta isCustomized en categorías/tipos).
                isCustomized: true,
              },
            });

            results.push({ sku, ok: true, primary: primarySlug, n: categorySlugs.length });
          },
          { maxWait: 15000, timeout: 30000 },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ sku, ok: false, error: message });
      }
    }

    return NextResponse.json({ ok: true, results });
  }

  // Re-siembra el banco de plantillas de descripción: borra TODAS las
  // DescriptionTemplate actuales y re-inserta el banco ampliado de
  // lib/seed/description-templates.ts. Idempotente (deja la BD igual al banco).
  if (body.action === "reseed_description_templates") {
    const { DESCRIPTION_TEMPLATES } = await import("@/lib/seed/description-templates");
    // Atómico: delete + create en una sola transacción. Si el create falla, el
    // delete se revierte y la tabla NO queda vacía.
    await db.$transaction([
      db.descriptionTemplate.deleteMany({}),
      db.descriptionTemplate.createMany({
        data: DESCRIPTION_TEMPLATES.map((t) => ({
          slug: t.slug,
          label: t.label,
          categorySlug: t.categorySlug,
          body: t.body,
          metaShort: t.metaShort ?? null,
          position: t.position,
          isActive: true,
        })),
        skipDuplicates: true,
      }),
    ]);
    const count = await db.descriptionTemplate.count();
    return NextResponse.json({ ok: true, count });
  }

  // Genera descripción (y meta si está vacía) en LOTE para productos SIN
  // descripción. Reutiliza el motor por id (los productos están guardados).
  // Filtra description vacío/null + isCustomized:false. Llamar en bucle hasta
  // que `remaining` sea 0 (como el feeder del import).
  if (body.action === "generate_descriptions") {
    const limit =
      Number.isFinite(body.limit) && body.limit > 0 ? Math.min(Math.floor(body.limit), 500) : 150;
    const { generateAutoDescription } = await import("@/lib/products/description");

    const where = {
      isCustomized: false,
      OR: [{ description: null }, { description: "" }],
    };

    const products = await db.product.findMany({
      where,
      select: { id: true, metaDescription: true },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    let updated = 0;
    for (const p of products) {
      try {
        const result = await generateAutoDescription(p.id);
        if (!result) continue;
        const data: { description: string; metaDescription?: string } = {
          description: result.description,
        };
        if (!p.metaDescription || p.metaDescription.trim() === "") {
          data.metaDescription = result.metaDescription;
        }
        await db.product.update({ where: { id: p.id }, data });
        updated += 1;
      } catch (err) {
        console.error(`[generate_descriptions] ${p.id} falló:`, err);
      }
    }

    const remaining = await db.product.count({ where });
    if (updated > 0) revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, updated, remaining });
  }

  // Aplica las descripciones REALES de la web antigua (CSV WooCommerce) por wooId:
  //  - description (ficha)    ← descripción larga del CSV
  //  - metaDescription (SEO)  ← "descripción corta" del CSV (ya recortada en el feeder)
  // Casa por externalId = `woocommerce:<wooId>` y SOLO actualiza productos con
  // isCustomized:false (respeta lo editado a mano). Escribe únicamente los campos
  // presentes en cada item. Idempotente: relanzable.
  if (body.action === "set_descriptions") {
    type DescItem = { wooId?: string | number; description?: string; metaDescription?: string };
    const items: DescItem[] = Array.isArray(body.items) ? body.items : [];
    let updated = 0;
    let notFoundOrCustom = 0;
    let skipped = 0;
    const errors: Array<{ wooId: string; error: string }> = [];

    for (const item of items) {
      const wooId = String(item?.wooId ?? "").trim();
      if (!wooId) {
        skipped += 1;
        continue;
      }
      const data: { description?: string; metaDescription?: string } = {};
      if (typeof item.description === "string" && item.description.trim()) {
        data.description = item.description;
      }
      if (typeof item.metaDescription === "string" && item.metaDescription.trim()) {
        data.metaDescription = item.metaDescription;
      }
      if (Object.keys(data).length === 0) {
        skipped += 1;
        continue;
      }
      try {
        const res = await db.product.updateMany({
          where: { externalId: `woocommerce:${wooId}`, isCustomized: false },
          data,
        });
        if (res.count > 0) updated += res.count;
        else notFoundOrCustom += 1;
      } catch (err) {
        errors.push({ wooId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (updated > 0) revalidatePath("/", "layout");
    return NextResponse.json({
      ok: true,
      updated,
      notFoundOrCustom,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    });
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
