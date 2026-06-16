/**
 * Bloque 2 — Migración de datos: reasigna cada producto a la taxonomía nueva
 * (género → familia) usando `lib/categories/classify.ts`, puebla la tabla pivote
 * `ProductCategory` + `Product.primaryCategoryId`, y crea las RedirectRule 301.
 *
 * Estrategia expand/contract: NO toca `Product.categoryId` (columna vieja), ni
 * `ProductSize`, ni el FTS. Idempotente: salta productos ya migrados
 * (`primaryCategoryId IS NOT NULL`).
 *
 *   npx tsx --env-file=.env.local scripts/migrate-categories.ts --dry-run   (simulación)
 *   npx tsx --env-file=.env.local scripts/migrate-categories.ts             (real)
 */
import { PrismaClient } from "@prisma/client";
import { classify } from "../lib/categories/classify";
import { TAXONOMY_TREE, type TaxonomyNode } from "../lib/categories/taxonomy-tree";
import * as fs from "fs";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;
const db = new PrismaClient();

// --- Árbol canónico (fuente única en lib/categories/taxonomy-tree.ts) -------
type Node = TaxonomyNode;
const TREE: Node[] = TAXONOMY_TREE;
const TREE_SLUGS = new Set(TREE.map((t) => t.slug));

// --- Redirecciones 301 (== §9 del plan) ------------------------------------
const REDIRECTS: Record<string, string> = {
  "/calzado": "/hombre/calzado",
  "/camisetas": "/hombre/textil",
  "/conjuntos": "/nino/textil",
  "/chandal": "/hombre/textil",
  "/infantil": "/nino/textil",
  "/abrigos": "/hombre/textil",
  "/mallas": "/mujer/textil",
  "/banador": "/hombre/textil",
  "/cortavientos": "/mujer/textil",
  "/faldas": "/mujer/textil",
  "/padel": "/accesorios/padel",
  "/complementos-padel": "/accesorios/padel",
  "/banadores": "/nina/textil",
  "/baloncesto": "/nino/calzado",
  "/chanclas": "/nina/calzado",
  "/uncategorized": "/accesorios/mochilas",
  "/ropa": "/mujer/textil",
  "/pantalon-corto": "/mujer/textil",
  "/bota-alta": "/hombre/calzado",
  "/running": "/hombre/calzado", // afinará Bloque 3 con ?tipo=running
  "/montana": "/hombre/calzado", // afinará Bloque 3 con ?tipo=trail
};

// --- Conteos esperados (== §4 del plan), por slug --------------------------
const EXPECTED: Record<string, number> = {
  "hombre-textil": 315, "hombre-calzado": 125, "mujer-textil": 188, "mujer-calzado": 60,
  "nino-textil": 189, "nino-calzado": 83, "nina-textil": 72, "nina-calzado": 107,
  "accesorios-otros": 112, "accesorios-calcetines": 36, "accesorios-balones": 28,
  "accesorios-mochilas": 27, "accesorios-padel": 15,
};

type Assign =
  | { ok: true; primary: string; all: string[] }
  | { ok: false; reason: "UNCLASSIFIED" | "NO_ESPECIFICADO_NON_ACCESSORY" };

function assignCategories(name: string, gender: string): Assign {
  const fam = classify(name);
  if (fam === "UNCLASSIFIED") return { ok: false, reason: "UNCLASSIFIED" };
  if (fam.startsWith("accesorios:")) {
    const slug = "accesorios-" + fam.split(":")[1]; // accesorios-padel/mochilas/balones/calcetines/otros
    return { ok: true, primary: slug, all: [slug] }; // ignora género
  }
  const f = fam; // "textil" | "calzado"
  switch (gender) {
    case "HOMBRE": return { ok: true, primary: `hombre-${f}`, all: [`hombre-${f}`] };
    case "MUJER": return { ok: true, primary: `mujer-${f}`, all: [`mujer-${f}`] };
    case "NINO": return { ok: true, primary: `nino-${f}`, all: [`nino-${f}`] };
    case "NINA": return { ok: true, primary: `nina-${f}`, all: [`nina-${f}`] };
    case "UNISEX": return { ok: true, primary: `hombre-${f}`, all: [`hombre-${f}`, `mujer-${f}`] };
    case "BEBE": return { ok: true, primary: `bebe-${f}`, all: [`bebe-${f}`] };
    default: return { ok: false, reason: "NO_ESPECIFICADO_NON_ACCESSORY" };
  }
}

const slugToUrl = (slug: string) => "/" + slug.replace(/-/, "/");

function guardHost() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
  const host = (url.match(/@([^/]+)\//) || [])[1] || "(desconocido)";
  const allowProd = process.env.ALLOW_PROD_MIGRATION === "1";
  if (host.includes("still-voice-al8sapxi")) {
    // dev — siempre OK
    return host;
  }
  if (allowProd && host.includes("neon.tech") && !host.includes("still-voice")) {
    console.warn(`⚠️  MODO PROD habilitado por ALLOW_PROD_MIGRATION=1 — host: ${host}`);
    return host;
  }
  console.error(`STOP — host NO es la branch dev y ALLOW_PROD_MIGRATION no está activo: ${host}`);
  process.exit(1);
}

async function main() {
  const host = guardHost();
  console.log("=== migrate-categories.ts" + (DRY_RUN ? " --dry-run ===" : " === (MODO REAL)"));
  console.log("Modo:", DRY_RUN ? "SIMULACIÓN (no se escribe nada a la BD)" : "REAL (escribe a la BD)");
  console.log("Branch host:", host, "(dev confirmado)\n");

  // --- STEP 1 — Categorías -------------------------------------------------
  const existing = await db.category.findMany({ where: { slug: { in: [...TREE_SLUGS] } }, select: { slug: true } });
  const existingSlugs = new Set(existing.map((c) => c.slug));
  const toReuse = TREE.filter((t) => existingSlugs.has(t.slug));
  const toCreate = TREE.filter((t) => !existingSlugs.has(t.slug));
  console.log("[STEP 1 — Categorías]");
  console.log(`Existentes a reutilizar: ${toReuse.length} (${toReuse.map((t) => t.slug).join(", ")})`);
  console.log(`Nuevas a crear: ${toCreate.length} (${toCreate.map((t) => t.slug).join(", ")})`);

  // Validación del árbol
  const treeErrors: string[] = [];
  for (const n of TREE) {
    if (n.parentSlug && !TREE_SLUGS.has(n.parentSlug)) treeErrors.push(`${n.slug}: parent ${n.parentSlug} no existe en TREE`);
  }
  console.log(treeErrors.length ? "  ⚠️ Árbol: " + treeErrors.join("; ") : `  Árbol válido (${TREE.length} nodos, parentId coherente).`);

  // --- STEP 2+3 — Productos (clasificación) --------------------------------
  const products = await db.product.findMany({ select: { id: true, name: true, gender: true, primaryCategoryId: true } });
  const total = products.length;
  let skipped = 0;
  let pivoteRows = 0;
  const tally: Record<string, number> = {};
  const samples: Record<string, string[]> = {};
  const errors: { id: string; name: string; gender: string; reason: string }[] = [];
  // Para el modo real: lista de operaciones { id, primarySlug, allSlugs }
  const ops: { id: string; primary: string; all: string[] }[] = [];

  for (const p of products) {
    if (p.primaryCategoryId !== null) { skipped++; continue; }
    const a = assignCategories(p.name, p.gender as string);
    if (!a.ok) { errors.push({ id: p.id, name: p.name, gender: p.gender as string, reason: a.reason }); continue; }
    tally[a.primary] = (tally[a.primary] || 0) + 1;
    pivoteRows += a.all.length;
    (samples[a.primary] = samples[a.primary] || []).push(p.name);
    ops.push({ id: p.id, primary: a.primary, all: a.all });
  }
  const placed = ops.length;

  console.log("\n[STEP 2+3 — Productos]");
  console.log(`Total productos: ${total}`);
  console.log(`A migrar (primaryCategoryId IS NULL): ${total - skipped}`);
  console.log(`A saltar (ya migrados): ${skipped}`);
  console.log("\nDistribución prevista:");
  let countWarnings = 0;
  for (const t of TREE.filter((n) => n.parentSlug)) {
    if (!(t.slug in EXPECTED)) continue;
    const got = tally[t.slug] || 0;
    const exp = EXPECTED[t.slug]!;
    const diff = Math.abs(got - exp);
    const mark = diff === 0 ? "✅" : diff <= 2 ? "≈" : "⚠️ WARNING";
    if (diff > 2) countWarnings++;
    console.log(`  ${slugToUrl(t.slug).padEnd(24)}: ${String(got).padStart(4)} productos  (esperado §4: ${exp})  ${mark}`);
  }
  console.log(`\nFilas a escribir en ProductCategory: ${pivoteRows}  (placed ${placed} + ${pivoteRows - placed} duplicados UNISEX/BEBE)`);
  console.log(`Errores (migration-errors.csv): ${errors.length}  (esperado §4: 6)  ${errors.length === 6 ? "✅" : "⚠️"}`);
  if (countWarnings) console.log(`⚠️ ${countWarnings} categoría(s) difieren de §4 en >2 productos — revisar.`);

  // Reconciliación
  const reconc = placed + skipped + errors.length;
  console.log(`\nReconciliación: placed ${placed} + skipped ${skipped} + errores ${errors.length} = ${reconc} (total ${total})  ${reconc === total ? "✅" : "❌ ERROR"}`);
  if (reconc !== total) { console.error("❌ La suma no cuadra con el total — abortando."); process.exit(1); }

  // --- STEP 4 — Redirecciones ----------------------------------------------
  console.log("\n[STEP 4 — RedirectRule]");
  console.log(`Reglas a crear/upsertar: ${Object.keys(REDIRECTS).length}`);
  for (const [from, to] of Object.entries(REDIRECTS)) console.log(`  ${from.padEnd(22)} → ${to}`);

  // --- STEP 5 — Errores + CSV ----------------------------------------------
  console.log("\n[STEP 5 — Errores detallados]");
  console.log(`${errors.length} productos sin clasificar:`);
  for (const e of errors) console.log(`  · ${e.id}  ${e.name.slice(0, 48).padEnd(48)} gender=${e.gender.padEnd(16)} motivo=${e.reason}`);
  const csvPath = DRY_RUN ? "scripts/migration-errors.csv.dry-run" : "scripts/migration-errors.csv";
  const csv = "productId,name,gender,motivo\n" + errors.map((e) => `${e.id},"${e.name.replace(/"/g, '""')}",${e.gender},${e.reason}`).join("\n") + "\n";
  fs.writeFileSync(csvPath, csv);
  console.log(`CSV escrito en: ${csvPath}`);

  // --- Muestreo aleatorio --------------------------------------------------
  console.log("\n[Muestreo aleatorio — validación cualitativa]");
  for (const t of TREE.filter((n) => n.parentSlug && (tally[n.slug] || 0) > 0)) {
    const arr = samples[t.slug] || [];
    const pick = [...arr].sort(() => Math.random() - 0.5).slice(0, 5);
    console.log(`${slugToUrl(t.slug)}:`);
    for (const s of pick) console.log("  · " + s.slice(0, 70));
  }

  if (DRY_RUN) {
    console.log("\n=== FIN dry-run (no se ha escrito nada a la BD) ===");
    console.log("Para aplicar de verdad: npx tsx --env-file=.env.local scripts/migrate-categories.ts");
    await db.$disconnect();
    return;
  }

  // ======================= MODO REAL (escribe a la BD) =====================
  console.log("\n=== APLICANDO A LA BD ===");
  // STEP 1 real: raíces primero, luego hijas (parentId)
  const slugToId: Record<string, string> = {};
  for (const n of TREE.filter((t) => !t.parentSlug)) {
    const c = await db.category.upsert({
      where: { slug: n.slug },
      update: { position: n.position },
      create: { slug: n.slug, name: n.name, parentId: null, position: n.position, metaTitle: n.metaTitle, metaDescription: n.metaDescription },
    });
    slugToId[n.slug] = c.id;
  }
  for (const n of TREE.filter((t) => t.parentSlug)) {
    const c = await db.category.upsert({
      where: { slug: n.slug },
      update: { parentId: slugToId[n.parentSlug!], position: n.position },
      create: { slug: n.slug, name: n.name, parentId: slugToId[n.parentSlug!], position: n.position, metaTitle: n.metaTitle, metaDescription: n.metaDescription },
    });
    slugToId[n.slug] = c.id;
  }
  console.log(`STEP 1 ✓ ${Object.keys(slugToId).length} categorías upsertadas.`);

  // STEP 3 real: lotes de 100
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = ops.slice(i, i + BATCH_SIZE);
    await db.$transaction(
      batch.flatMap((op) => [
        db.product.update({ where: { id: op.id }, data: { primaryCategoryId: slugToId[op.primary] } }),
        ...op.all.map((slug) =>
          db.productCategory.upsert({
            where: { productId_categoryId: { productId: op.id, categoryId: slugToId[slug]! } },
            update: {},
            create: { productId: op.id, categoryId: slugToId[slug]! },
          }),
        ),
      ]),
    );
    console.log(`  lote ${i / BATCH_SIZE + 1}: ${batch.length} productos`);
  }
  console.log(`STEP 3 ✓ ${ops.length} productos migrados, ${pivoteRows} filas de pivote.`);

  // STEP 4 real: redirecciones
  for (const [from, to] of Object.entries(REDIRECTS)) {
    await db.redirectRule.upsert({
      where: { from },
      update: { to, type: 301, isActive: true },
      create: { from, to, type: 301, isActive: true, notes: "Bloque 2 — reestructuración categorías" },
    });
  }
  console.log(`STEP 4 ✓ ${Object.keys(REDIRECTS).length} RedirectRule upsertadas.`);
  console.log("\n=== MIGRACIÓN REAL COMPLETADA ===");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
