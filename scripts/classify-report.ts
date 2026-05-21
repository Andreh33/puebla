/**
 * Verificación de cobertura del clasificador (lectura pura sobre la branch dev).
 * Usa el módulo único lib/categories/classify.ts — sin copia-pega.
 *
 * Ejecutar: npx tsx --env-file=.env.local scripts/classify-report.ts
 */
import { PrismaClient } from "@prisma/client";
import { classify } from "../lib/categories/classify";

const p = new PrismaClient();

async function main() {
  const products = await p.product.findMany({ select: { id: true, name: true, gender: true } });

  // 1) Conteo por familia + lista de UNCLASSIFIED
  const counts: Record<string, number> = {};
  const unclassified: { name: string; gender: string }[] = [];
  for (const prod of products) {
    const c = classify(prod.name);
    counts[c] = (counts[c] || 0) + 1;
    if (c === "UNCLASSIFIED") unclassified.push({ name: prod.name, gender: prod.gender });
  }
  const total = products.length;
  const pct = ((unclassified.length / total) * 100).toFixed(1);

  console.log("################ 1) CONTEO POR FAMILIA (total " + total + ") ################");
  for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log("  " + String(v).padStart(5) + "  " + k);
  }
  console.log("  UNCLASSIFIED = " + unclassified.length + " (" + pct + "%)  [objetivo < 2% / < 20 abs]");
  console.log("\n  --- UNCLASSIFIED completos ---");
  for (const u of unclassified) console.log("    [" + u.gender.padEnd(16) + "] " + u.name);

  // 2) Matriz familia × género
  const matrix: Record<string, Record<string, number>> = {};
  for (const prod of products) {
    const fam = classify(prod.name);
    matrix[fam] = matrix[fam] || {};
    matrix[fam][prod.gender] = (matrix[fam][prod.gender] || 0) + 1;
  }
  console.log("\n################ 2) MATRIZ familia × género ################");
  console.log(JSON.stringify(matrix, null, 2));

  // 3) 5 muestras aleatorias por familia
  const groups: Record<string, { name: string; gender: string }[]> = {};
  for (const prod of products) {
    const fam = classify(prod.name);
    (groups[fam] = groups[fam] || []).push(prod);
  }
  console.log("\n################ 3) 5 MUESTRAS ALEATORIAS POR FAMILIA ################");
  for (const [fam, items] of Object.entries(groups)) {
    console.log("\n=== " + fam + " (" + items.length + ") ===");
    const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 5);
    for (const it of shuffled) console.log("  [" + it.gender.padEnd(16) + "] " + it.name.slice(0, 74));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => p.$disconnect());
