/**
 * scripts/download-demo-products.ts
 *
 * Pre-descarga ~24 imágenes reales del PRICAT a `public/sample-products/` y
 * genera `lib/demo-products.ts` con un array de objetos DemoProduct usado como
 * fallback mientras la base de datos no está aprovisionada.
 *
 * Uso:
 *   npx tsx scripts/download-demo-products.ts
 *
 * Reglas:
 *   - Selecciona productos diversos (mezcla John Smith + +8000, varias
 *     categorías y colores) usando el `composeProductName` del importador.
 *   - Descarga las imágenes con `fetchImageBytes` (UA realista, timeout, magic
 *     bytes) y las convierte a WebP q85 con sharp (max 800px lado largo).
 *   - El fichero `lib/demo-products.ts` se sobreescribe en cada ejecución.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { Decimal } from "decimal.js";
import { iterPricatRawRows } from "../lib/importer/xlsx";
import { normalizePricatRow, type NormalizedPricatRow } from "../lib/importer/normalize";
import { fetchImageBytes } from "../lib/importer/fetch-image";
import { slugifyEs } from "../lib/seo/slug";

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRICAT_FILE = path.join(PROJECT_ROOT, "data", "PRICAT_JS_Y__8000_TEMPORADA_FW24.xlsx");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "sample-products");
const OUT_TS = path.join(PROJECT_ROOT, "lib", "demo-products.ts");

const TARGET_COUNT = 24;
// Escanea el PRICAT completo: muchas URLs son 404 en el servidor del
// proveedor, así que necesitamos un pool de candidatos generoso para llegar
// a 24 productos con imagen válida tras filtrar fallos.
const MAX_CANDIDATES = 3500;

// Diversidad mínima por (marca x categoría) — los slots con URLs vivas en
// aguirreycia.es (probado con scripts/check-pricat-urls.ts). Las categorías
// "Mochila", "Calcetin", "Sudadera John Smith" están todas 404 en el origen.
const DIVERSITY_PLAN: Array<{ brand: string; category: string; want: number }> = [
  // John Smith — calzado y ropa deportiva
  { brand: "John Smith", category: "Zapatilla", want: 3 },
  { brand: "John Smith", category: "Bota Alta", want: 2 },
  { brand: "John Smith", category: "Camiseta M/Corta", want: 1 },
  { brand: "John Smith", category: "Camiseta M/Larga", want: 1 },
  { brand: "John Smith", category: "Pantalon Poliester", want: 1 },
  { brand: "John Smith", category: "Short Poliester", want: 1 },
  { brand: "John Smith", category: "Traje Jogging", want: 1 },
  { brand: "John Smith", category: "Traje Entrenamiento Poliester", want: 1 },
  { brand: "John Smith", category: "Malla", want: 1 },
  { brand: "John Smith", category: "Bermuda Moda", want: 1 },
  // +8000 — montaña, técnico y outdoor
  { brand: "+8000", category: "Zapatilla", want: 1 },
  { brand: "+8000", category: "Bota Alta", want: 2 },
  { brand: "+8000", category: "Anorack Parka", want: 1 },
  { brand: "+8000", category: "Anorack Treking", want: 1 },
  { brand: "+8000", category: "Anorack Cazadora", want: 1 },
  { brand: "+8000", category: "Chubasquero", want: 1 },
  { brand: "+8000", category: "Polar Poliester", want: 1 },
  { brand: "+8000", category: "Sudadera", want: 1 },
  { brand: "+8000", category: "Pantalon Aventura", want: 1 },
  { brand: "+8000", category: "Pantalon Nieve", want: 1 },
  { brand: "+8000", category: "Camiseta M/Larga", want: 1 },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function priceFromDecimal(d: Decimal | null): number {
  if (!d) return 0;
  return Number(d.toFixed(2));
}

/**
 * Devuelve los candidatos ORDENADOS por prioridad (cuotas de diversidad
 * primero, luego cualquier producto válido). Como el ~70% de las URLs del
 * proveedor son 404 reales, no podemos pre-seleccionar exactamente TARGET_COUNT
 * filas: hay que ir descargando hasta acumular las que funcionen, en orden de
 * prioridad. El consumidor hará break cuando llegue a TARGET_COUNT.
 */
function pickDiverse(rows: NormalizedPricatRow[]): NormalizedPricatRow[] {
  const quota = new Map<string, number>();
  for (const p of DIVERSITY_PLAN) {
    quota.set(`${p.brand}|${p.category}`, p.want);
  }

  const priority: NormalizedPricatRow[] = [];
  const fallback: NormalizedPricatRow[] = [];
  const usedKeys = new Set<string>();
  const usedModelosByCategory = new Map<string, Set<string>>();

  // Pase 1: candidatos que cumplen cuotas de diversidad
  for (const row of rows) {
    if (!row.imageUrl) continue;
    if (!row.retailPrice || row.retailPrice.lte(0)) continue;
    if (usedKeys.has(row.productKey)) continue;
    const slot = `${row.brand}|${row.type}`;
    const left = quota.get(slot);
    if (!left || left <= 0) continue;

    // Un solo color por modelo+categoría para evitar imágenes casi idénticas
    const seenModelos = usedModelosByCategory.get(slot) ?? new Set<string>();
    if (seenModelos.has(row.modelCode)) continue;
    seenModelos.add(row.modelCode);
    usedModelosByCategory.set(slot, seenModelos);

    priority.push(row);
    usedKeys.add(row.productKey);
    quota.set(slot, left - 1);
  }

  // Pase 2: cualquier producto válido como respaldo cuando los del pase 1 fallen
  for (const row of rows) {
    if (!row.imageUrl) continue;
    if (!row.retailPrice || row.retailPrice.lte(0)) continue;
    if (usedKeys.has(row.productKey)) continue;
    fallback.push(row);
    usedKeys.add(row.productKey);
  }

  return [...priority, ...fallback];
}

function buildSlug(row: NormalizedPricatRow): string {
  // <tipo>-<marca>-<modelo>-<color> con slugify castellano
  return slugifyEs(
    [row.type, row.brand, row.modelCode, row.colorName]
      .filter(Boolean)
      .join(" "),
  );
}

// ---------------------------------------------------------------------------
// Lectura del PRICAT
// ---------------------------------------------------------------------------

async function readCandidates(): Promise<NormalizedPricatRow[]> {
  // No usamos iterPricatProductGroups porque queremos quedarnos solo con UNA
  // fila por producto (no nos importan las tallas) y maximizar diversidad.
  const out: NormalizedPricatRow[] = [];
  const seenKeys = new Set<string>();
  let scanned = 0;
  for await (const raw of iterPricatRawRows(PRICAT_FILE)) {
    scanned += 1;
    if (scanned > MAX_CANDIDATES) break;
    try {
      const r = normalizePricatRow(raw);
      if (!r.imageUrl) continue;
      if (seenKeys.has(r.productKey)) continue;
      seenKeys.add(r.productKey);
      out.push(r);
    } catch {
      // ignoramos filas malas en demo
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Descarga y conversión a WebP
// ---------------------------------------------------------------------------

async function downloadAndConvert(
  url: string,
  outPath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetchImageBytes(url);
  if (!res.ok) return { ok: false, error: res.error };
  try {
    await sharp(res.buffer)
      .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Generador del fichero TS
// ---------------------------------------------------------------------------

interface DemoOutputItem {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  colorName: string;
  mainImageUrl: string;
  retailPrice: number;
  salePrice: number | null;
  modelCode: string;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
}

function emitTypeScript(items: DemoOutputItem[]): string {
  const featured = items.slice(0, 8);

  const head = `/**
 * lib/demo-products.ts — GENERADO AUTOMÁTICAMENTE
 *
 * No editar a mano. Regenerar con:
 *   npx tsx scripts/download-demo-products.ts
 *
 * Catálogo de demo (24 productos reales del PRICAT) usado como fallback
 * mientras la base de datos no está aprovisionada o devuelve 0 productos.
 * Las imágenes viven en \`public/sample-products/<slug>.webp\`.
 */

export interface DemoProduct {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  colorName: string;
  mainImageUrl: string;
  retailPrice: number;
  salePrice: number | null;
  source: "LOCAL";
  modelCode: string;
  brand: { name: string; slug: string };
  category: { name: string; slug: string };
  isDemo: true;
}

`;

  const arr =
    "export const DEMO_PRODUCTS: DemoProduct[] = " +
    JSON.stringify(
      items.map((it) => ({ ...it, source: "LOCAL" as const, isDemo: true as const })),
      null,
      2,
    ) +
    ";\n\n";

  const featuredArr =
    "export const DEMO_FEATURED: DemoProduct[] = DEMO_PRODUCTS.slice(0, " +
    featured.length +
    ");\n\n";

  const helpers = `export function getDemoProductsByCategory(slug: string): DemoProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.category.slug === slug);
}

export function getDemoProductsByBrand(slug: string): DemoProduct[] {
  return DEMO_PRODUCTS.filter((p) => p.brand.slug === slug);
}

/**
 * Lista única de marcas presentes en el catálogo de demo, con el conteo de
 * productos asociados. Útil para llenar la página /marcas mientras no hay BD.
 */
export function getDemoBrands(): Array<{
  name: string;
  slug: string;
  productCount: number;
}> {
  const map = new Map<string, { name: string; slug: string; productCount: number }>();
  for (const p of DEMO_PRODUCTS) {
    const existing = map.get(p.brand.slug);
    if (existing) {
      existing.productCount += 1;
    } else {
      map.set(p.brand.slug, { name: p.brand.name, slug: p.brand.slug, productCount: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
}

/**
 * Lista única de categorías presentes en el catálogo de demo, con conteo.
 */
export function getDemoCategories(): Array<{
  name: string;
  slug: string;
  productCount: number;
}> {
  const map = new Map<string, { name: string; slug: string; productCount: number }>();
  for (const p of DEMO_PRODUCTS) {
    const existing = map.get(p.category.slug);
    if (existing) {
      existing.productCount += 1;
    } else {
      map.set(p.category.slug, {
        name: p.category.name,
        slug: p.category.slug,
        productCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
}
`;

  return head + arr + featuredArr + helpers;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Demo products — generando catálogo de fallback");
  console.log("───────────────────────────────────────────────");
  console.log(`Origen   : ${PRICAT_FILE}`);
  console.log(`Imágenes : ${OUT_DIR}`);
  console.log(`Salida   : ${OUT_TS}`);
  console.log(`Objetivo : ${TARGET_COUNT} productos\n`);

  // Validar fuente
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(PRICAT_FILE);
    if (!wb.worksheets.length) throw new Error("xlsx vacío");
  } catch (err) {
    console.error("ERROR leyendo el PRICAT:", (err as Error).message);
    process.exit(1);
  }

  // Limpieza previa: borramos cualquier .webp anterior para no dejar huérfanos
  // cuando regeneramos con un set distinto de productos.
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const entry of await fs.readdir(OUT_DIR)) {
    if (entry.endsWith(".webp")) {
      await fs.unlink(path.join(OUT_DIR, entry)).catch(() => undefined);
    }
  }

  console.log("Leyendo candidatos del PRICAT...");
  const candidates = await readCandidates();
  console.log(`  → ${candidates.length} candidatos con URL e imágenes válidas.\n`);

  console.log("Aplicando plan de diversidad...");
  const picked = pickDiverse(candidates);
  console.log(`  → ${picked.length} productos seleccionados.\n`);

  if (picked.length === 0) {
    console.error("ERROR: no se pudo seleccionar ningún candidato. Aborto.");
    process.exit(1);
  }

  console.log(
    `Descargando hasta acumular ${TARGET_COUNT} éxitos (max ${picked.length} intentos)...`,
  );
  const items: DemoOutputItem[] = [];
  let attempts = 0;
  let fails = 0;
  for (const row of picked) {
    if (items.length >= TARGET_COUNT) break;
    attempts += 1;
    const slug = buildSlug(row);
    const fileName = `${slug}.webp`;
    const outPath = path.join(OUT_DIR, fileName);
    const url = row.imageUrl!;

    process.stdout.write(
      `  [${items.length + 1}/${TARGET_COUNT}] (intento ${attempts}) ${slug} ... `,
    );
    const result = await downloadAndConvert(url, outPath);
    if (!result.ok) {
      fails += 1;
      console.log(`FALLO (${result.error})`);
      continue;
    }
    const sizeKb = ((await fs.stat(outPath)).size / 1024).toFixed(0);
    console.log(`OK ${sizeKb}KB`);

    items.push({
      id: `demo-${row.productKey.toLowerCase()}`,
      slug,
      name: row.name,
      shortName: null,
      colorName: row.colorName,
      mainImageUrl: `/sample-products/${fileName}`,
      retailPrice: priceFromDecimal(row.retailPrice),
      salePrice: null,
      modelCode: row.modelCode,
      brand: { name: row.brand, slug: slugifyEs(row.brand) },
      category: { name: row.type, slug: slugifyEs(row.type) },
    });
  }
  console.log(`\n  → ${items.length} descargas válidas, ${fails} fallos\n`);

  if (items.length === 0) {
    console.error("\nERROR: no se descargó ninguna imagen.");
    process.exit(1);
  }

  console.log(`\nGenerando ${OUT_TS} (${items.length} productos)...`);
  const tsCode = emitTypeScript(items);
  await fs.writeFile(OUT_TS, tsCode, "utf8");

  console.log("\n✓ Demo products listos.");
  console.log("Resumen por marca / categoría:");
  const summary = new Map<string, number>();
  for (const it of items) {
    const k = `${it.brand.name} · ${it.category.name}`;
    summary.set(k, (summary.get(k) ?? 0) + 1);
  }
  for (const [k, v] of summary) console.log(`  - ${k}: ${v}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
