/**
 * scripts/feed-split-descriptions.ts
 *
 * Aplica las descripciones REALES de la web antigua (CSV WooCommerce) a los
 * productos de producción, casando por wooId (externalId = woocommerce:<id>):
 *   - description          (ficha, debajo del precio) ← "Descripción corta"  (verbatim)
 *   - technicalDescription (ficha, abajo del todo)    ← "Descripción" larga   (verbatim)
 *   - metaDescription (SEO) ← "Descripción corta" recortada a ~160
 *
 * Sin generación: los productos sin corta se quedan sin texto debajo del precio.
 * El servidor solo toca productos con isCustomized:false. Idempotente.
 *
 * Uso:
 *   npx tsx scripts/feed-split-descriptions.ts --dry-run
 *   SETUP_TOKEN=<token> npx tsx scripts/feed-split-descriptions.ts
 */
import path from "node:path";
import { parseWooCommerceFile } from "../lib/importer/woocommerce";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  const get = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1]! : null;
  };
  const csvRel = get("--csv") ?? "wp/wc-product-export-16-6-2026-1781596350587.csv";
  const csv = path.isAbsolute(csvRel) ? csvRel : path.join(process.cwd(), csvRel);
  const chunkStr = get("--chunk");
  const chunk = chunkStr != null ? parseInt(chunkStr, 10) : 100;
  const limitStr = get("--limit");
  const limit = limitStr != null ? parseInt(limitStr, 10) : null;
  return { csv, chunk, limit, dryRun: args.includes("--dry-run") };
}

function toPlain(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toMeta(src: string | null): string | null {
  if (!src) return null;
  const plain = toPlain(src);
  if (!plain) return null;
  if (plain.length <= 160) return plain;
  return plain.slice(0, 157).replace(/\s+\S*$/, "").trim() + "…";
}

type DescItem = {
  wooId: string;
  description?: string;
  technicalDescription?: string;
  metaDescription?: string;
};

interface BatchResult {
  ok?: boolean;
  updated?: number;
  notFoundOrCustom?: number;
  skipped?: number;
  errorCount?: number;
}

async function main() {
  const { csv, chunk, limit, dryRun } = parseArgs(process.argv);
  const BASE = process.env.IMPORT_BASE ?? "https://zonasport.vercel.app";
  const TOKEN = process.env.SETUP_TOKEN;

  console.log(`\n=== Zona Sport — Feeder corta/larga ===`);
  console.log(`CSV  : ${csv}`);
  console.log(`Modo : ${dryRun ? "DRY-RUN (no envía nada)" : `ENVIAR a ${BASE}`}\n`);

  if (!dryRun && !TOKEN) {
    console.error("ERROR: falta SETUP_TOKEN. Usa --dry-run para previsualizar.");
    process.exit(1);
  }

  console.log("Parseando CSV...");
  const { groups, errors: parseErrors, totalRows } = await parseWooCommerceFile(csv);
  console.log(`  Filas CSV          : ${totalRows}`);
  console.log(`  Grupos (productos) : ${groups.length}`);
  console.log(`  Errores de parseo  : ${parseErrors.length}`);

  let items: DescItem[] = [];
  let withShort = 0;
  let withLong = 0;
  for (const g of groups) {
    const p = g.parent;
    if (!p.wooId) continue;
    const short = p.shortDescription?.trim() || null; // corta → debajo del precio
    const long = p.description?.trim() || null; // larga → abajo del todo
    if (short) withShort += 1;
    if (long) withLong += 1;
    const item: DescItem = { wooId: p.wooId };
    if (short) item.description = short;
    if (long) item.technicalDescription = long;
    const meta = toMeta(short ?? long);
    if (meta) item.metaDescription = meta;
    if (item.description || item.technicalDescription || item.metaDescription) {
      items.push(item);
    }
  }
  if (limit != null) items = items.slice(0, limit);

  console.log(`  Con corta (description)         : ${withShort}`);
  console.log(`  Con larga (technicalDescription): ${withLong}`);
  console.log(`  Items a enviar                  : ${items.length}\n`);

  const sampleN = Math.min(3, items.length);
  console.log(`--- Muestra (${sampleN}) ---`);
  for (let i = 0; i < sampleN; i++) {
    const it = items[i]!;
    const corta = (it.description ?? "(sin)").slice(0, 90).replace(/\s+/g, " ");
    const larga = (it.technicalDescription ?? "(sin)").slice(0, 90).replace(/\s+/g, " ");
    console.log(`[${i + 1}] wooId=${it.wooId}`);
    console.log(`    arriba (corta): ${corta}…`);
    console.log(`    abajo (larga) : ${larga}…`);
  }
  console.log();

  if (dryRun) {
    console.log("DRY-RUN: no se ha enviado nada. Quita --dry-run y define SETUP_TOKEN para aplicar.");
    return;
  }

  const totalChunks = Math.ceil(items.length / chunk);
  let updated = 0, notFound = 0, skipped = 0, errs = 0;
  console.log(`--- Enviando ${items.length} items en ${totalChunks} lotes de ${chunk} ---\n`);

  for (let i = 0; i < items.length; i += chunk) {
    const batchIndex = Math.floor(i / chunk) + 1;
    const batch = items.slice(i, i + chunk);
    const send = async (): Promise<BatchResult> => {
      const r = await fetch(`${BASE}/api/admin/import-woo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body: JSON.stringify({ action: "set_descriptions", items: batch }),
      });
      const text = await r.text();
      try {
        return JSON.parse(text) as BatchResult;
      } catch {
        throw new Error(`Respuesta no-JSON (${r.status}): ${text.slice(0, 200)}`);
      }
    };

    let res: BatchResult | null = null;
    try {
      res = await send();
    } catch (e1) {
      console.warn(`  Lote ${batchIndex}/${totalChunks} intento 1 falló: ${e1 instanceof Error ? e1.message : e1}`);
      try {
        res = await send();
      } catch (e2) {
        console.error(`  Lote ${batchIndex}/${totalChunks} FALLIDO: ${e2 instanceof Error ? e2.message : e2}`);
        errs += batch.length;
        continue;
      }
    }

    if (!res?.ok) {
      console.error(`  Lote ${batchIndex}/${totalChunks} ok=false`);
      errs += batch.length;
      continue;
    }
    updated += res.updated ?? 0;
    notFound += res.notFoundOrCustom ?? 0;
    skipped += res.skipped ?? 0;
    errs += res.errorCount ?? 0;
    console.log(`  Lote ${batchIndex}/${totalChunks} · ~${res.updated} actualizados · ${res.notFoundOrCustom} sin casar/custom · ${res.errorCount} errores`);
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  ACTUALIZADOS     : ${updated}`);
  console.log(`  SIN CASAR/CUSTOM : ${notFound}`);
  console.log(`  OMITIDOS         : ${skipped}`);
  console.log(`  ERRORES          : ${errs}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
