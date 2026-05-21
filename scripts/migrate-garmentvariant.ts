/**
 * Bloque 6 §18 Fase 3.5 — backfill de Product.garmentVariant usando
 * inferGarmentVariant (lib/categories/garment.ts).
 *
 * IDEMPOTENTE: SOLO escribe donde garmentVariant IS NULL y garmentType ∈
 * {camiseta, pantalon, mallas} (gating). Productos con garmentVariant ya
 * asignado (incl. correcciones manuales) NO se tocan. No toca garmentType,
 * categoryId, primaryCategoryId, pivote, ProductSize ni el FTS.
 *
 *   npx tsx --env-file=.env.dev.local scripts/migrate-garmentvariant.ts --dry-run
 *   npx tsx --env-file=.env.dev.local scripts/migrate-garmentvariant.ts
 *   (Fase 4 / prod, opt-in explícito): ... scripts/migrate-garmentvariant.ts --confirm-prod
 */
import { PrismaClient } from "@prisma/client";
import { inferGarmentVariant, GARMENT_VARIANTS, type GarmentVariant } from "../lib/categories/garment";
import * as fs from "fs";

const DRY_RUN = process.argv.includes("--dry-run");
const CONFIRM_PROD = process.argv.includes("--confirm-prod");
const BATCH_SIZE = 100;
const BASE_TYPES = ["camiseta", "pantalon", "mallas"];
const CSV_PATH = "scripts/garment-variant-errors.csv";
const db = new PrismaClient();

function parseHost(url: string): string {
  return (url.match(/@([^/]+)\//) || [])[1] || "(desconocido)";
}

/** dev (still-voice) siempre OK. prod (green-dream) SOLO con --confirm-prod. */
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
  if (!CONFIRM_PROD) {
    console.error(`⛔ ABORTADO: host desconocido (${host}). Esperado: still-voice (dev).`);
    process.exit(1);
  }
  console.warn(`⚠️  host desconocido (${host}) permitido por --confirm-prod`);
  return { host, isProd: false };
}

async function main() {
  const t0 = Date.now();
  const { host, isProd } = guardHost();
  console.log("=== Backfill garmentVariant ===");
  console.log(`Host: ${host} (${isProd ? "PROD" : "DEV"})`);
  console.log(`Modo: ${DRY_RUN ? "--dry-run" : "REAL"}\n`);

  // Target idempotente: garmentVariant NULL + garmentType en familias con variante.
  const targets = await db.product.findMany({
    where: { garmentVariant: null, garmentType: { in: BASE_TYPES } },
    select: { id: true, name: true, gender: true, garmentType: true },
  });
  console.log(
    `Target: garmentType ∈ {camiseta,pantalon,mallas} con garmentVariant NULL → ${targets.length} productos\n`,
  );

  // Total por garmentType base (en BD), para validar el gating en el reporte.
  const baseGroups = await db.product.groupBy({
    by: ["garmentType"],
    where: { garmentType: { in: BASE_TYPES } },
    _count: { _all: true },
  });
  const baseTotal: Record<string, number> = {};
  for (const g of baseGroups) if (g.garmentType) baseTotal[g.garmentType] = g._count._all;

  const counts: Record<string, number> = {};
  const samples: Record<string, string[]> = {};
  const classifiedByBase: Record<string, number> = { camiseta: 0, pantalon: 0, mallas: 0 };
  const ops: { id: string; variant: GarmentVariant }[] = [];
  const errorRows: { id: string; name: string; garmentType: string; reason: string }[] = [];

  for (const p of targets) {
    const gt = p.garmentType as string;
    const variant = inferGarmentVariant(p.name, gt);
    if (variant) {
      counts[variant] = (counts[variant] || 0) + 1;
      classifiedByBase[gt] = (classifiedByBase[gt] || 0) + 1;
      (samples[variant] = samples[variant] || []).push(`[${p.gender}] (${gt}) ${p.name}`);
      ops.push({ id: p.id, variant });
    } else {
      counts.NULL = (counts.NULL || 0) + 1;
      (samples.NULL = samples.NULL || []).push(`[${p.gender}] (${gt}) ${p.name}`);
      errorRows.push({ id: p.id, name: p.name, garmentType: gt, reason: "no_variant_token" });
    }
  }

  console.log("=== Clasificación ===");
  for (const v of GARMENT_VARIANTS) console.log(`  ${v.padEnd(15)}: ${counts[v] || 0}`);
  console.log(`  ${"NULL".padEnd(15)}: ${counts.NULL || 0}  (sin patrón detectado)`);
  console.log(`  ─────────────────`);
  console.log(`  Total candidatos: ${targets.length}`);

  console.log("\n=== Distribución por garmentType base (gating) ===");
  for (const t of BASE_TYPES) {
    console.log(`  ${t.padEnd(9)}: ${baseTotal[t] || 0} total → ${classifiedByBase[t]} con variant`);
  }

  if (DRY_RUN) {
    console.log("\n=== Muestras (hasta 5 por variante detectada) ===");
    for (const v of GARMENT_VARIANTS) {
      const arr = samples[v] || [];
      if (!arr.length) continue;
      console.log(`-- ${v} (${arr.length}) --`);
      for (const s of arr.slice(0, 5)) console.log(`   ${s}`);
    }
    console.log(`\n-- NULL (primeros 15 de ${(samples.NULL || []).length}) --`);
    for (const s of (samples.NULL || []).slice(0, 15)) console.log(`   ${s}`);
  }

  // CSV de errores (NULL). Sobrescribe si existe.
  const csv =
    "productId,name,garmentType,reason\n" +
    errorRows.map((e) => `${e.id},"${e.name.replace(/"/g, '""')}",${e.garmentType},${e.reason}`).join("\n") +
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
        batch.map((op) => db.product.update({ where: { id: op.id }, data: { garmentVariant: op.variant } })),
      );
      done += batch.length;
      console.log(`  lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} (acum ${done})`);
    }
    const after = await db.product.count({ where: { garmentVariant: { not: null } } });
    console.log(`  REAL: ${ops.length} UPDATEs ejecutadas`);
    console.log(`  (control: garmentVariant NOT NULL después: ${after})`);
  }

  console.log(`\nCSV errores generado: ${CSV_PATH} (${errorRows.length} productos)`);
  console.log(`\n=== FIN ${DRY_RUN ? "dry-run (no se escribió nada a la BD)" : "real"} · ${Date.now() - t0}ms ===`);
  if (DRY_RUN) console.log("Para aplicar de verdad: npx tsx --env-file=.env.dev.local scripts/migrate-garmentvariant.ts");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
