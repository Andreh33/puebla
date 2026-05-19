/**
 * Inspecciona el PRICAT v2 — buscando URLs en `cell.formula` (HYPERLINK).
 */

import path from "node:path";
import ExcelJS from "exceljs";

const FILE = path.resolve(__dirname, "..", "data", "PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx");

function extractUrlFromHyperlinkFormula(formula: string | undefined): string | null {
  if (!formula) return null;
  // HYPERLINK("https://...", "label")  o  =HYPERLINK("https://...", ...)
  const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
  return m ? m[1]! : null;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);

  const sheet = wb.getWorksheet("Catálogo");
  if (!sheet) throw new Error("No hay hoja Catálogo");

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value ?? "").trim();
  });
  const urlCol = headers.findIndex((h) => /^url$/i.test(h));

  console.log(`URL col: ${urlCol}`);
  console.log("\n=== Primeras 10 filas con URL extraída ===");

  for (let r = 2; r <= Math.min(11, sheet.rowCount); r++) {
    const cell = sheet.getRow(r).getCell(urlCol);
    const raw = cell.value as ExcelJS.CellValue;
    let url: string | null = null;

    if (raw && typeof raw === "object" && "formula" in raw) {
      url = extractUrlFromHyperlinkFormula((raw as ExcelJS.CellFormulaValue).formula);
    }

    const codArt = sheet.getRow(r).getCell(headers.findIndex((h) => /c[oó]digo art[ií]culo/i.test(h))).value;
    const color = sheet.getRow(r).getCell(headers.findIndex((h) => /^color$/i.test(h))).value;
    console.log(`  R${r} cod=${codArt} color=${color} → ${url}`);
  }

  // Estadísticas globales con la extracción correcta
  let withUrl = 0;
  let withoutUrl = 0;
  const domains: Record<string, number> = {};
  const sampleUrls: string[] = [];
  const sampleUrlsByDomain: Record<string, string[]> = {};

  for (let r = 2; r <= sheet.rowCount; r++) {
    const cell = sheet.getRow(r).getCell(urlCol);
    const raw = cell.value as ExcelJS.CellValue;
    let url: string | null = null;
    if (raw && typeof raw === "object" && "formula" in raw) {
      url = extractUrlFromHyperlinkFormula((raw as ExcelJS.CellFormulaValue).formula);
    } else if (typeof raw === "string") {
      url = raw.startsWith("http") ? raw : null;
    }

    if (url) {
      withUrl++;
      if (sampleUrls.length < 5) sampleUrls.push(url);
      try {
        const u = new URL(url);
        domains[u.hostname] = (domains[u.hostname] ?? 0) + 1;
        if (!sampleUrlsByDomain[u.hostname]) sampleUrlsByDomain[u.hostname] = [];
        if (sampleUrlsByDomain[u.hostname]!.length < 3) {
          sampleUrlsByDomain[u.hostname]!.push(url);
        }
      } catch {}
    } else {
      withoutUrl++;
    }
  }

  console.log("\n=== Estadísticas reales ===");
  console.log(`  Con URL extraída de HYPERLINK: ${withUrl}`);
  console.log(`  Sin URL:                       ${withoutUrl}`);
  console.log(`  Total filas datos:             ${sheet.rowCount - 1}`);

  console.log("\nDominios:");
  Object.entries(domains)
    .sort((a, b) => b[1] - a[1])
    .forEach(([d, n]) => console.log(`  ${d}: ${n}`));

  console.log("\nMuestras por dominio:");
  for (const [d, urls] of Object.entries(sampleUrlsByDomain)) {
    console.log(`  ${d}:`);
    urls.forEach((u) => console.log(`    - ${u}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
