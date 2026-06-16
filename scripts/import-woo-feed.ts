/**
 * scripts/import-woo-feed.ts
 *
 * Feeder local: parsea el CSV WooCommerce y envía los grupos al endpoint
 * protegido /api/admin/import-woo en lotes. Idempotente: se puede relanzar.
 *
 * Uso:
 *   SETUP_TOKEN=<token> npx tsx scripts/import-woo-feed.ts \
 *     --csv wp/wc-product-export-19-5-2026-1779208641288.csv \
 *     [--limit N] [--chunk N]
 *
 * Variables de entorno:
 *   SETUP_TOKEN  — obligatorio
 *   IMPORT_BASE  — base URL (default https://zonasport.vercel.app)
 */

import path from "node:path";
import { parseWooCommerceFile } from "../lib/importer/woocommerce";
import { classifyToTree } from "../lib/importer/classify-to-tree";

// ---------------------------------------------------------------------------
// Parseo de argumentos CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): {
  csv: string;
  limit: number | null;
  chunk: number;
} {
  const args = argv.slice(2);
  const get = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1]! : null;
  };

  const csvRel =
    get("--csv") ?? "wp/wc-product-export-19-5-2026-1779208641288.csv";
  const csv = path.isAbsolute(csvRel)
    ? csvRel
    : path.join(process.cwd(), csvRel);

  const limitStr = get("--limit");
  const limit = limitStr != null ? parseInt(limitStr, 10) : null;

  const chunkStr = get("--chunk");
  const chunk = chunkStr != null ? parseInt(chunkStr, 10) : 40;

  return { csv, limit, chunk };
}

// ---------------------------------------------------------------------------
// Lógica principal
// ---------------------------------------------------------------------------

async function main() {
  const { csv, limit, chunk } = parseArgs(process.argv);

  const BASE =
    process.env.IMPORT_BASE ?? "https://zonasport.vercel.app";
  const TOKEN = process.env.SETUP_TOKEN;

  if (!TOKEN) {
    console.error(
      "ERROR: SETUP_TOKEN no está definido. Ejecútalo con:\n" +
        "  SETUP_TOKEN=<token> npx tsx scripts/import-woo-feed.ts ...",
    );
    process.exit(1);
  }

  console.log(`\n=== Zona Sport — WooCommerce Feeder ===`);
  console.log(`Base URL : ${BASE}`);
  console.log(`CSV      : ${csv}`);
  console.log(`Chunk    : ${chunk}`);
  if (limit != null) console.log(`Limit    : ${limit} grupos (modo prueba)`);
  console.log();

  // 1. Parsear CSV
  console.log("Parseando CSV...");
  const { groups: allGroups, errors: parseErrors, totalRows } = await parseWooCommerceFile(csv);
  console.log(`  Filas CSV           : ${totalRows}`);
  console.log(`  Grupos (productos)  : ${allGroups.length}`);
  console.log(`  Errores de parseo   : ${parseErrors.length}`);
  if (parseErrors.length > 0) {
    for (const e of parseErrors.slice(0, 5)) {
      console.log(`    [${e.code}] fila ${e.row}: ${e.message}`);
    }
    if (parseErrors.length > 5)
      console.log(`    ... y ${parseErrors.length - 5} más`);
  }
  console.log();

  // 2. Aplicar límite si se pidió
  const groups = limit != null ? allGroups.slice(0, limit) : allGroups;
  if (limit != null) {
    console.log(`Procesando los primeros ${groups.length} grupos (--limit ${limit})\n`);
  }

  // 3. Muestra de verificación — primeros 8 grupos con classifyToTree
  const previewN = Math.min(8, groups.length);
  console.log(`--- Muestra de clasificación (primeros ${previewN} grupos) ---`);
  for (let i = 0; i < previewN; i++) {
    const g = groups[i]!;
    const p = g.parent;
    const tree = classifyToTree(p.name, p.gender, p.brand);
    console.log(`[${i + 1}] ${p.name}`);
    console.log(
      `     gender=${p.gender}  brand=${p.brand}  sku=${p.sku || "(sin sku)"}`,
    );
    console.log(
      `     categorySlugs  : [${tree.categorySlugs.join(", ") || "—"}]`,
    );
    console.log(`     primarySlug    : ${tree.primarySlug ?? "—"}`);
    console.log(
      `     footwearType   : ${tree.footwearType ?? "—"}`,
    );
    console.log(
      `     garmentType    : ${tree.garmentType ?? "—"}`,
    );
    console.log();
  }

  if (groups.length === 0) {
    console.log("No hay grupos para importar. Fin.");
    return;
  }

  // 4. Trocear y enviar lotes
  const totalChunks = Math.ceil(groups.length / chunk);
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  console.log(
    `--- Enviando ${groups.length} grupos en ${totalChunks} lotes de ${chunk} ---\n`,
  );

  for (let i = 0; i < groups.length; i += chunk) {
    const batchIndex = Math.floor(i / chunk) + 1;
    const batchGroups = groups.slice(i, i + chunk);

    let res: { ok: boolean; created: number; updated: number; errorCount: number; errors?: unknown[] } | null = null;

    // Intento 1
    const attempt = async () => {
      const r = await fetch(`${BASE}/api/admin/import-woo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          groups: batchGroups,
          mode: "create_update",
          defaultStatus: "DRAFT",
        }),
      });
      const text = await r.text();
      try {
        return JSON.parse(text) as typeof res;
      } catch {
        throw new Error(`Respuesta no-JSON (${r.status}): ${text.slice(0, 200)}`);
      }
    };

    try {
      res = await attempt();
    } catch (err1) {
      console.warn(
        `  Lote ${batchIndex}/${totalChunks} — error en intento 1: ${err1 instanceof Error ? err1.message : err1}`,
      );
      // Reintento único
      try {
        res = await attempt();
      } catch (err2) {
        console.error(
          `  Lote ${batchIndex}/${totalChunks} — fallido definitivamente: ${err2 instanceof Error ? err2.message : err2}`,
        );
        totalErrors += batchGroups.length;
        continue;
      }
    }

    if (!res) {
      console.error(`  Lote ${batchIndex}/${totalChunks} — respuesta vacía`);
      totalErrors += batchGroups.length;
      continue;
    }

    if (!res.ok) {
      console.error(
        `  Lote ${batchIndex}/${totalChunks} — servidor devolvió ok=false · errores=${res.errorCount ?? "?"}`,
      );
      totalErrors += batchGroups.length;
      continue;
    }

    totalCreated += res.created ?? 0;
    totalUpdated += res.updated ?? 0;
    totalErrors += res.errorCount ?? 0;

    console.log(
      `  Lote ${batchIndex}/${totalChunks} · +${res.created} creados · ~${res.updated} actualizados · ${res.errorCount} errores`,
    );
  }

  console.log(`\n=== RESULTADO FINAL ===`);
  console.log(`  CREADOS     : ${totalCreated}`);
  console.log(`  ACTUALIZADOS: ${totalUpdated}`);
  console.log(`  ERRORES     : ${totalErrors}`);
  console.log(`  TOTAL FILAS CSV: ${totalRows}`);
  console.log(`  GRUPOS procesados: ${groups.length} de ${allGroups.length}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
