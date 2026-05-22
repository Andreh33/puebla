/**
 * scripts/migrate-tenis-to-padel.ts — Bloque 8.8.
 *
 * Fusiona footwearType "tenis" → "padel" en todos los productos. Idempotente
 * (re-ejecutable: la 2ª vez no encuentra "tenis"). NO toca ProductSize/stock.
 *
 * Uso:
 *   tsx --env-file=.env.local       scripts/migrate-tenis-to-padel.ts --dry-run   # dev, sin escribir
 *   tsx --env-file=.env.local       scripts/migrate-tenis-to-padel.ts             # dev, real
 *   tsx --env-file=.env.prod.local  scripts/migrate-tenis-to-padel.ts --confirm-prod
 *
 * Guarda de host: prod (green-dream) exige --confirm-prod; dev (still-voice) libre.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const url = process.env.DATABASE_URL ?? "";
const isProd = url.includes("green-dream");
const isDev = url.includes("still-voice");

if (!isProd && !isDev) {
  console.error("ABORT: host de BD desconocido (ni green-dream ni still-voice).");
  process.exit(1);
}
if (isProd && !process.argv.includes("--confirm-prod")) {
  console.error("ABORT: BD de PRODUCCIÓN (green-dream) requiere --confirm-prod.");
  process.exit(1);
}

(async () => {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Host: ${isProd ? "PROD (green-dream)" : "DEV (still-voice)"}${dryRun ? " · DRY-RUN" : ""}`);

  const target = await db.product.count({ where: { footwearType: "tenis" } });
  console.log(`Productos con footwearType='tenis': ${target}`);

  if (dryRun) {
    console.log("--dry-run: 0 escrituras.");
  } else if (target > 0) {
    const res = await db.product.updateMany({
      where: { footwearType: "tenis" },
      data: { footwearType: "padel" },
    });
    console.log(`UPDATEs aplicados (tenis→padel): ${res.count}`);
  } else {
    console.log("Nada que migrar (0 'tenis'). Idempotente.");
  }

  // Control de stock — NO debe cambiar (esta migración no toca ProductSize).
  const rows = await db.productSize.count();
  const sum = await db.productSize.aggregate({ _sum: { stock: true } });
  console.log(`Stock: ${rows} filas / ${sum._sum.stock} unidades (esperado en prod: 3472/3471).`);

  const padel = await db.product.count({ where: { footwearType: "padel" } });
  const tenisLeft = await db.product.count({ where: { footwearType: "tenis" } });
  console.log(`Tras migración: padel=${padel}, tenis=${tenisLeft} (esperado tenis=0 salvo dry-run).`);

  await db.$disconnect();
})().catch(async (e) => {
  console.error("ERR:", (e as Error).message);
  await db.$disconnect();
  process.exit(1);
});
