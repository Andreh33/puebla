/**
 * Bloque 3 — auto-mapeo de Product.footwearType usando lib/categories/footwear.ts.
 *
 * Idempotente: SOLO toca productos de familia calzado (primaryCategory.slug LIKE
 * '%-calzado') con footwearType IS NULL. No toca textil/accesorios, ni ProductSize,
 * ni categoryId, ni el FTS, ni productos sin categorizar (primaryCategoryId NULL).
 *
 *   npx tsx --env-file=.env.local scripts/migrate-footweartype.ts --dry-run
 *   npx tsx --env-file=.env.local scripts/migrate-footweartype.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  inferFootwearType,
  matchBySportUse,
  matchByName,
  matchByBrandModel,
  FOOTWEAR_TYPES,
} from "../lib/categories/footwear";
import * as fs from "fs";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;
const db = new PrismaClient();

function guardHost(): string {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  const host = (url.match(/@([^/]+)\//) || [])[1] || "(desconocido)";
  if (!host.includes("still-voice-al8sapxi")) {
    console.error(`STOP — host NO es la branch dev: ${host}`);
    process.exit(1);
  }
  return host;
}

async function main() {
  const t0 = Date.now();
  const host = guardHost();
  console.log("=== migrate-footweartype.ts" + (DRY_RUN ? " --dry-run ===" : " === (MODO REAL)"));
  console.log("Modo:", DRY_RUN ? "SIMULACIÓN (no se escribe nada a la BD)" : "REAL (escribe a la BD)");
  console.log("Branch host:", host, "(dev confirmado)\n");

  // STEP 1 — Carga (solo calzado con footwearType NULL)
  const totalCalzado = Number(
    (await db.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*)::int as c FROM "Product" p JOIN "Category" c ON c.id=p."primaryCategoryId" WHERE c.slug LIKE '%-calzado'`,
    ))[0].c,
  );
  const rows = await db.$queryRawUnsafe<{ id: string; name: string; sportUse: string | null; brand: string | null }[]>(
    `SELECT p.id, p.name, p."sportUse", b.name as brand
     FROM "Product" p JOIN "Category" c ON c.id=p."primaryCategoryId"
     LEFT JOIN "Brand" b ON b.id=p."brandId"
     WHERE c.slug LIKE '%-calzado' AND p."footwearType" IS NULL`,
  );
  const toSkip = totalCalzado - rows.length;
  console.log("[STEP 1 — Carga]");
  console.log(`Productos de familia calzado: ${totalCalzado}`);
  console.log(`A procesar (footwearType IS NULL): ${rows.length}`);
  console.log(`A saltar (ya con footwearType): ${toSkip}`);

  // STEP 2+3 — Clasificación (con atribución por pasada)
  let pass1 = 0, pass2 = 0, pass3 = 0;
  const byType: Record<string, number> = {};
  const samples: Record<string, string[]> = {};
  const errors: { id: string; name: string; sportUse: string | null; brand: string | null }[] = [];
  const ops: { id: string; type: string }[] = [];

  for (const r of rows) {
    let type: string | null = null;
    const p1 = matchBySportUse(r.sportUse);
    if (p1) { type = p1; pass1++; }
    else {
      const p2 = matchByName(r.name);
      if (p2) { type = p2; pass2++; }
      else {
        const p3 = matchByBrandModel(r.name, r.brand);
        if (p3) { type = p3; pass3++; }
      }
    }
    // sanity: debe coincidir con inferFootwearType (misma cadena)
    if (type !== (inferFootwearType({ name: r.name, sportUse: r.sportUse, brand: r.brand }) ?? null)) {
      throw new Error("Desajuste pasadas vs inferFootwearType en " + r.id);
    }
    if (type) {
      byType[type] = (byType[type] || 0) + 1;
      (samples[type] = samples[type] || []).push(r.name);
      ops.push({ id: r.id, type });
    } else {
      errors.push({ id: r.id, name: r.name, sportUse: r.sportUse, brand: r.brand });
    }
  }
  const classified = ops.length;

  console.log("\n[STEP 2+3 — Clasificación]");
  console.log(`Pasada 1 (sportUse): ${pass1}`);
  console.log(`Pasada 2 (name keywords): ${pass2}`);
  console.log(`Pasada 3 (marca+modelo): ${pass3}`);
  console.log(`Sin clasificar (NULL): ${errors.length}`);
  console.log("\nDistribución prevista por tipo:");
  for (const t of FOOTWEAR_TYPES) console.log(`  ${t.padEnd(12)}: ${byType[t] || 0}`);
  console.log(`\nTotal auto-clasificados: ${classified} (${Math.round((classified / rows.length) * 100)}%)`);
  console.log(`Total NULL (pendiente bulk admin): ${errors.length}`);

  // STEP 4 — Aplicar / dry-run
  const csvPath = DRY_RUN ? "scripts/footwear-errors.csv.dry-run" : "scripts/footwear-errors.csv";
  const csv = "productId,name,sportUse,brand,motivo\n" +
    errors.map((e) => `${e.id},"${e.name.replace(/"/g, '""')}",${e.sportUse ?? ""},"${(e.brand ?? "").replace(/"/g, '""')}",UNCLASSIFIED_AUTO`).join("\n") + "\n";
  fs.writeFileSync(csvPath, csv);

  if (DRY_RUN) {
    console.log("\n[STEP 4 — Modo dry-run] NO se escribe a la BD.");
    console.log(`CSV simulado: ${csvPath} (${errors.length} filas)`);
  } else {
    console.log("\n[STEP 4 — Modo real] Aplicando en lotes de", BATCH_SIZE);
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      const batch = ops.slice(i, i + BATCH_SIZE);
      await db.$transaction(batch.map((op) => db.product.update({ where: { id: op.id }, data: { footwearType: op.type } })));
      console.log(`  lote ${i / BATCH_SIZE + 1}: ${batch.length}`);
    }
    console.log(`STEP 4 ✓ ${ops.length} productos actualizados. CSV: ${csvPath} (${errors.length} filas).`);
  }

  // STEP 5 — Muestreo cualitativo
  console.log("\n[STEP 5 — Muestreo cualitativo: 3 por tipo]");
  for (const t of FOOTWEAR_TYPES) {
    const arr = samples[t] || [];
    if (!arr.length) continue;
    const pick = [...arr].sort(() => Math.random() - 0.5).slice(0, 3);
    console.log(`  [${t}]`);
    for (const s of pick) console.log("      · " + s.slice(0, 60));
  }

  console.log(`\n=== FIN ${DRY_RUN ? "dry-run (no se ha escrito nada a la BD)" : "real"} · ${Date.now() - t0}ms ===`);
  if (DRY_RUN) console.log("Para aplicar de verdad: npx tsx --env-file=.env.local scripts/migrate-footweartype.ts");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
