/**
 * POST /api/admin/clean-product-names
 *
 * Recorre productos cuyo `name` o `shortName` contengan tags HTML (de
 * feeds antiguos como WooCommerce que dejaron `<strong>...</strong>` o
 * spans de scraping AI dentro del nombre) y los normaliza a texto plano
 * vía `stripHtml`. Idempotente. Devuelve { scanned, cleaned, skipped }.
 *
 * Auth: Bearer ${SETUP_TOKEN}.
 *
 * Respeta `isCustomized = true` para no pisar nombres editados a mano.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  stripHtml,
  cleanProductName,
  sanitizeHtml,
  decodeEntities,
} from "@/lib/utils/html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH = 300;

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) return NextResponse.json({ error: "no token" }, { status: 503 });
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/, "");
  if (got !== expected)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

function hasHtml(s: string | null | undefined): boolean {
  if (!s) return false;
  return /<[a-z][^>]*>|&[a-z]+;|&#\d+;/i.test(s);
}

export async function POST(req: NextRequest) {
  const unauth = checkAuth(req);
  if (unauth) return unauth;

  let scanned = 0;
  let cleaned = 0;
  let skipped = 0;
  let cursor: string | undefined;
  const t0 = Date.now();
  const samples: Array<{ from: string; to: string }> = [];

  while (true) {
    const rows: Array<{
      id: string;
      name: string;
      shortName: string | null;
      description: string | null;
      metaDescription: string | null;
      isCustomized: boolean;
    }> = await db.product.findMany({
      select: {
        id: true,
        name: true,
        shortName: true,
        description: true,
        metaDescription: true,
        isCustomized: true,
      },
      orderBy: { id: "asc" },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;

    for (const p of rows) {
      scanned++;
      // - name / shortName / metaDescription: texto plano (stripHtml).
      // - description: HTML semántico permitido (sanitizeHtml mantiene
      //   ul/li/strong/em/h2…h6 y limpia atributos basura + scripts).
      const data: {
        name?: string;
        shortName?: string | null;
        description?: string;
        metaDescription?: string | null;
      } = {};

      if (hasHtml(p.name)) {
        const next = cleanProductName(p.name);
        if (next && next !== p.name) data.name = next;
      }
      if (hasHtml(p.shortName)) {
        const next = stripHtml(p.shortName);
        if (next !== p.shortName) data.shortName = next || null;
      }
      // Descripción: sanitize si tiene atributos basura (data-url,
      // tabindex, role="button") o scripts/style. NO la stripeamos
      // porque queremos preservar la estructura semántica HTML.
      if (
        p.description &&
        /<(?:script|style|iframe)\b|data-url\s*=|role\s*=\s*"button"|tabindex\s*=\s*"0"/i.test(
          p.description,
        )
      ) {
        const next = sanitizeHtml(p.description);
        if (next !== p.description) data.description = next;
      }
      if (hasHtml(p.metaDescription)) {
        const next = stripHtml(p.metaDescription);
        if (next !== p.metaDescription) data.metaDescription = next || null;
      }

      if (Object.keys(data).length === 0) continue;
      if (p.isCustomized) {
        skipped++;
        continue;
      }

      await db.product.update({ where: { id: p.id }, data });
      if (samples.length < 8 && data.name) {
        samples.push({
          from: p.name.slice(0, 100),
          to: data.name.slice(0, 100),
        });
      }
      cleaned++;
    }

    cursor = rows[rows.length - 1]!.id;
    if (rows.length < BATCH) break;
  }

  // Marcas con entidades HTML sin decodificar ("Go&amp;win" → "Go&win").
  let brandsFixed = 0;
  const brandRows = await db.brand.findMany({
    select: { id: true, name: true, slug: true },
  });
  for (const b of brandRows) {
    if (!/&[a-z]+;|&#\d+;/i.test(b.name)) continue;
    const fixed = decodeEntities(b.name);
    if (fixed && fixed !== b.name) {
      // El name de Brand es @unique; si ya existe otra con el name
      // decodificado, no lo tocamos para evitar colisión.
      const clash = await db.brand.findFirst({
        where: { name: fixed, id: { not: b.id } },
        select: { id: true },
      });
      if (!clash) {
        await db.brand.update({ where: { id: b.id }, data: { name: fixed } });
        brandsFixed++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    brandsFixed,
    scanned,
    cleaned,
    skipped,
    samples,
    durationMs: Date.now() - t0,
  });
}
