/**
 * Bloque 6 — backfill de Product.garmentType usando lib/categories/garment.ts.
 *
 * IDEMPOTENTE: SOLO escribe donde garmentType IS NULL y el producto es de familia
 * textil (vinculado por m2m a un nodo *-textil). Productos con garmentType ya
 * asignado (incl. correcciones manuales del bulk admin) NO se tocan → re-ejecutable
 * sin pisar nada; recogerá los 3 abrigos JOLUVI del Bloque 2 cuando se reclasifiquen
 * al textil. No toca categoryId, primaryCategoryId, el pivote, ProductSize ni el FTS.
 *
 *   npx tsx --env-file=.env.dev.local scripts/migrate-garmenttype.ts --dry-run
 *   npx tsx --env-file=.env.dev.local scripts/migrate-garmenttype.ts
 *   (Fase 4 / prod, opt-in explícito): ... scripts/migrate-garmenttype.ts --confirm-prod
 */
import { PrismaClient } from "@prisma/client";
import {
  inferGarmentType,
  matchByTokenOverride,
  matchByCategory,
  matchByToken,
  matchByFuzzy,
  GARMENT_TYPES,
  type GarmentType,
} from "../lib/categories/garment";
import * as fs from "fs";

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM_PROD = process.argv.includes("--confirm-prod");
const BATCH_SIZE = 100;
const TEXTIL_SLUGS = ["hombre-textil", "mujer-textil", "nino-textil", "nina-textil"];
const CSV_PATH = "scripts/garment-errors.csv";
const db = new PrismaClient();

function parseHost(url: string): string {
  return (url.match(/@([^/]+)\//) || [])[1] || "(desconocido)";
}

/**
 * Guarda de host. dev (still-voice) siempre OK. prod (green-dream) SOLO con
 * --confirm-prod (Fase 4). Cualquier otro host desconocido también exige
 * --confirm-prod. (Nota: el flag reconcilia la intención del diseño — usar
 * --confirm-prod contra prod en Fase 4 — con un primer check que de otro modo
 * abortaría green-dream sin escapatoria.)
 */
function guardHost(): { host: string; isProd: boolean } {
  const url = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || "";
  const host = parseHost(url);
  if (host.includes("green-dream")) {
    if (!CONFIRM_PROD) {
      console.error(`⛔ ABORTADO: host es PROD (${host}). Este script se ejecuta primero contra DEV.`);
      console.error(`   Para ejecutar contra prod (Fase 4), usa el flag explícito: --confirm-prod`);
      process.exit(1);
    }
    console.warn(`⚠️  PROD habilitado por --confirm-prod — host: ${host}`);
    return { host, isProd: true };
  }
  if (host.includes("still-voice")) return { host, isProd: false };
  // Host desconocido: exige opt-in explícito.
  if (!CONFIRM_PROD) {
    console.error(`⛔ ABORTADO: host desconocido (${host}). Esperado: still-voice (dev).`);
    process.exit(1);
  }
  console.warn(`⚠️  host desconocido (${host}) permitido por --confirm-prod`);
  return { host, isProd: false };
}

type Via = "P0" | "P1" | "P2" | "P3" | "NULL";

function classify(
  categorySlug: string | null,
  name: string,
): { type: GarmentType | null; via: Via; lowConfidence?: boolean } {
  const p0 = matchByTokenOverride(name);
  if (p0) return { type: p0, via: "P0" };
  const p1 = matchByCategory(categorySlug);
  if (p1) return { type: p1, via: "P1" };
  const p2 = matchByToken(name);
  if (p2) return { type: p2, via: "P2" };
  const p3 = matchByFuzzy(name);
  if (p3) return { type: p3, via: "P3", lowConfidence: true };
  return { type: null, via: "NULL" };
}

async function main() {
  const t0 = Date.now();
  const { host, isProd } = guardHost();
  console.log("=== Backfill garmentType ===");
  console.log(`Host: ${host} (${isProd ? "PROD" : "DEV"})`);
  console.log(`Modo: ${DRY_RUN ? "--dry-run" : "REAL"}\n`);

  // Resolver nodos textil (m2m). Si falta alguno → abortar (estado inesperado).
  const textilNodes = await db.category.findMany({
    where: { slug: { in: TEXTIL_SLUGS } },
    select: { id: true, slug: true },
  });
  const textilIds = textilNodes.map((n) => n.id);
  if (textilIds.length !== TEXTIL_SLUGS.length) {
    console.error(
      `⛔ ABORTADO: nodos textil esperados=${TEXTIL_SLUGS.length}, encontrados=${textilIds.length} ` +
        `(${textilNodes.map((n) => n.slug).join(", ") || "ninguno"})`,
    );
    process.exit(1);
  }

  // Target idempotente: textil con garmentType IS NULL.
  const targets = await db.product.findMany({
    where: {
      garmentType: null,
      categories: { some: { categoryId: { in: textilIds } } },
    },
    select: {
      id: true,
      name: true,
      gender: true,
      categoryId: true,
      category: { select: { slug: true } },
    },
  });
  console.log(`Target: productos textil con garmentType IS NULL → ${targets.length} productos\n`);

  const counts: Record<Via, number> = { P0: 0, P1: 0, P2: 0, P3: 0, NULL: 0 };
  const byType: Record<string, number> = {};
  const samplesByVia: Record<Via, string[]> = { P0: [], P1: [], P2: [], P3: [], NULL: [] };
  const ops: { id: string; type: GarmentType }[] = [];
  const errorRows: {
    id: string; name: string; categoryId: string; categorySlug: string; via: Via; reason: string;
  }[] = [];

  for (const p of targets) {
    const slug = p.category?.slug ?? null;
    const { type, via, lowConfidence } = classify(slug, p.name);
    counts[via]++;
    // sanity: la composición manual debe coincidir con inferGarmentType.
    const composed = inferGarmentType({ categorySlug: slug, name: p.name }) ?? null;
    if (type !== composed) throw new Error(`Desajuste pasadas vs inferGarmentType en ${p.id}`);

    if (samplesByVia[via].length < 20) {
      samplesByVia[via].push(
        `[${p.gender}] (${slug ?? "?"}) ${p.name} → ${type ?? "???"}${lowConfidence ? " [low_confidence]" : ""}`,
      );
    }
    if (type) {
      byType[type] = (byType[type] || 0) + 1;
      ops.push({ id: p.id, type });
    }
    if (via === "NULL" || lowConfidence) {
      errorRows.push({
        id: p.id,
        name: p.name,
        categoryId: p.categoryId,
        categorySlug: slug ?? "",
        via,
        reason: via === "NULL" ? "no_token_no_category" : "fuzzy_low_confidence",
      });
    }
  }

  console.log("=== Clasificación ===");
  console.log(`  P0 (override):   ${counts.P0}`);
  console.log(`  P1 (categoría):  ${counts.P1}`);
  console.log(`  P2 (token):      ${counts.P2}`);
  console.log(`  P3 (fuzzy):      ${counts.P3}    [low_confidence, CSV adjunto]`);
  console.log(`  NULL:            ${counts.NULL}    [no clasificables]`);
  console.log(`  ─────────────────────`);
  console.log(`  Total:           ${targets.length}`);

  console.log("\n=== Distribución por garmentType resultante ===");
  for (const t of GARMENT_TYPES) if (byType[t]) console.log(`  ${String(byType[t]).padStart(4)} ${t}`);

  if (DRY_RUN) {
    console.log("\n=== Muestra de clasificación (primeros 20 de cada vía) ===");
    for (const via of ["P0", "P1", "P2", "P3", "NULL"] as Via[]) {
      for (const line of samplesByVia[via]) console.log(`[${via}] ${line}`);
    }
  }

  // CSV de errores (NULL + P3 low_confidence). Sobrescribe si existe.
  const csv =
    "productId,name,categoryId,categorySlug,via,reason\n" +
    errorRows
      .map((e) => `${e.id},"${e.name.replace(/"/g, '""')}",${e.categoryId},${e.categorySlug},${e.via},${e.reason}`)
      .join("\n") +
    (errorRows.length ? "\n" : "");
  fs.writeFileSync(CSV_PATH, csv);

  console.log("\n=== Aplicación ===");
  if (DRY_RUN) {
    console.log("  --dry-run: 0 escrituras");
  } else {
    let done = 0;
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE);
      await db.$transaction(
        batch.map((op) => db.product.update({ where: { id: op.id }, data: { garmentType: op.type } })),
      );
      done += batch.length;
      console.log(`  lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} (acum ${done})`);
    }
    const after = await db.product.count({
      where: { garmentType: { not: null }, categories: { some: { categoryId: { in: textilIds } } } },
    });
    console.log(`  REAL: ${ops.length} UPDATEs ejecutadas`);
    console.log(`  (control: garmentType NOT NULL en textil después: ${after})`);
  }

  console.log(`\nCSV errores generado: ${CSV_PATH} (${errorRows.length} productos)`);
  console.log(`\n=== FIN ${DRY_RUN ? "dry-run (no se escribió nada a la BD)" : "real"} · ${Date.now() - t0}ms ===`);
  if (DRY_RUN) console.log("Para aplicar de verdad: npx tsx --env-file=.env.dev.local scripts/migrate-garmenttype.ts");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
