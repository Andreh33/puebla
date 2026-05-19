#!/usr/bin/env tsx
/**
 * scripts/import-pricat.ts
 *
 * Lanza una importación PRICAT desde la línea de comandos sin pasar por la UI.
 *
 *   npm run import:pricat                 → importa data/PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx
 *   npm run import:pricat -- --file ruta  → importa otro xlsx
 *   npm run import:pricat -- --dry-run    → calcula altas/cambios sin escribir
 *
 * Imprime progreso por consola cada 100 filas procesadas.
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { db } from "../lib/db";
import { processImportJob } from "../lib/importer/process-job";
import { countPricatRows } from "../lib/importer/xlsx";
import type { Prisma } from "@prisma/client";

interface Args {
  file: string;
  dryRun: boolean;
  mode: "create_update" | "create_only" | "update_only";
  defaultStatus: "DRAFT" | "ACTIVE" | "INACTIVE";
}

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_FILE = path.join(PROJECT_ROOT, "data", "PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx");

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    file: DEFAULT_FILE,
    dryRun: false,
    mode: "create_update",
    defaultStatus: "DRAFT",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dry-run" || a === "-n") args.dryRun = true;
    else if ((a === "--file" || a === "-f") && argv[i + 1]) {
      args.file = path.resolve(argv[i + 1]!);
      i += 1;
    } else if (a === "--mode" && argv[i + 1]) {
      const m = argv[i + 1]!;
      if (m === "create_update" || m === "create_only" || m === "update_only") args.mode = m;
      i += 1;
    } else if (a === "--status" && argv[i + 1]) {
      const s = argv[i + 1]!;
      if (s === "DRAFT" || s === "ACTIVE" || s === "INACTIVE") args.defaultStatus = s;
      i += 1;
    } else if (a === "--help" || a === "-h") {
      console.log(
        `Uso:\n` +
          `  npm run import:pricat [-- --file <ruta.xlsx>] [--mode create_update|create_only|update_only] [--status DRAFT|ACTIVE|INACTIVE] [--dry-run]\n`,
      );
      process.exit(0);
    }
  }
  return args;
}

function fmt(n: number): string {
  return n.toLocaleString("es-ES");
}

function progressBar(pct: number, width = 30): string {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return "[" + "█".repeat(filled) + "░".repeat(width - filled) + "]";
}

async function main() {
  const args = parseArgs();

  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("  Zona Sport · Importador PRICAT");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Archivo : ${args.file}`);
  console.log(`  Modo    : ${args.mode}`);
  console.log(`  Estado  : ${args.defaultStatus}`);
  console.log(`  Dry-run : ${args.dryRun ? "SÍ (no se escribirá en BD)" : "no"}`);
  console.log("──────────────────────────────────────────────────────────────\n");

  if (!existsSync(args.file)) {
    console.error(`ERROR: el archivo "${args.file}" no existe.`);
    process.exit(1);
  }

  const total = await countPricatRows(args.file).catch((err) => {
    console.error("ERROR leyendo el xlsx:", err.message ?? err);
    process.exit(1);
  });
  console.log(`Total de filas detectadas en la hoja: ${fmt(total as number)}\n`);

  // Crear el ImportJob (también en dry-run, para conservar trazabilidad)
  const job = await db.importJob.create({
    data: {
      source: "XLSX",
      status: "PENDING",
      mode: args.mode,
      fileUrl: args.file,
      fileName: path.basename(args.file),
      options: {
        mode: args.mode,
        defaultStatus: args.defaultStatus,
      } as unknown as Prisma.InputJsonValue,
      createdBy: "cli",
    },
    select: { id: true },
  });

  console.log(`Job creado: ${job.id}\n`);

  let lastLogged = 0;
  const start = Date.now();
  await processImportJob(job.id, {
    dryRun: args.dryRun,
    onProgress: (s) => {
      if (s.processedRows - lastLogged < 100 && s.processedRows < s.totalRows) return;
      lastLogged = s.processedRows;
      const pct = s.totalRows > 0 ? (s.processedRows / s.totalRows) * 100 : 0;
      const elapsed = (Date.now() - start) / 1000;
      const rate = elapsed > 0 ? s.processedRows / elapsed : 0;
      const eta = rate > 0 ? (s.totalRows - s.processedRows) / rate : 0;
      process.stdout.write(
        `\r${progressBar(pct)} ${pct.toFixed(1).padStart(5)}%  ` +
          `procesadas ${fmt(s.processedRows)}/${fmt(s.totalRows)}  ` +
          `creados ${fmt(s.createdRows)}  actualizados ${fmt(s.updatedRows)}  ` +
          `errores ${fmt(s.errorRows)}  eta ${eta.toFixed(0)}s   `,
      );
    },
  });

  // Recargar estado final
  const finalJob = await db.importJob.findUnique({ where: { id: job.id } });
  if (!finalJob) {
    console.error("\nERROR: no se pudo recargar el job final.");
    process.exit(1);
  }

  const elapsedTotal = (Date.now() - start) / 1000;
  console.log("\n");
  console.log("──────────────────────────────────────────────────────────────");
  console.log("  Resumen");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`  Estado       : ${finalJob.status}`);
  console.log(`  Tiempo       : ${elapsedTotal.toFixed(1)}s`);
  console.log(`  Filas        : ${fmt(finalJob.processedRows)} / ${fmt(finalJob.totalRows)}`);
  console.log(`  Creados      : ${fmt(finalJob.createdRows)}`);
  console.log(`  Actualizados : ${fmt(finalJob.updatedRows)}`);
  console.log(`  Errores      : ${fmt(finalJob.errorRows)}`);
  console.log("──────────────────────────────────────────────────────────────");

  const errs = Array.isArray(finalJob.errors)
    ? (finalJob.errors as unknown as { row: number; code: string; message: string }[])
    : [];
  if (errs.length > 0) {
    console.log(`\nPrimeros ${Math.min(10, errs.length)} errores:`);
    for (const e of errs.slice(0, 10)) {
      console.log(`  · fila ${e.row} (${e.code}): ${e.message}`);
    }
    if (errs.length > 10) console.log(`  … y ${errs.length - 10} más.`);
  }

  await db.$disconnect();
  process.exit(finalJob.status === "DONE" ? 0 : 1);
}

main().catch(async (err) => {
  console.error("\nFATAL:", err);
  await db.$disconnect().catch(() => undefined);
  process.exit(1);
});
