/**
 * Zona Sport — lector streaming del PRICAT (.xlsx) con exceljs.
 *
 * - Acepta la ruta de un fichero local (xlsx).
 * - Localiza la hoja "Catálogo" o, si no existe, la primera hoja.
 * - Detecta dinámicamente las cabeceras buscando los nombres oficiales del PRICAT.
 * - Expone un AsyncGenerator de filas crudas (clave → valor) y otro de filas normalizadas.
 * - Agrupa por `código artículo` (que es la clave de fila — única en este dataset)
 *   pero también devuelve la `productKey` (modelo+Cód.color) para que el `process-job`
 *   pueda agrupar productos con varias tallas.
 */

import ExcelJS from "exceljs";
import path from "node:path";
import { normalizePricatRow, type NormalizedPricatRow } from "./normalize";

// ---------------------------------------------------------------------------
// Cabeceras esperadas (en la hoja oficial del proveedor)
// ---------------------------------------------------------------------------

export const PRICAT_HEADERS = {
  altaBaja: ["alta/baja"],
  modelo: ["modelo"],
  codigoModelo: ["codigo modelo", "código modelo"],
  descripcionModelo: ["descripcion modelo", "descripción modelo"],
  tipo: ["tipo"],
  usoDeportivo: ["uso deportivo"],
  marca: ["marca"],
  codigoArticulo: ["código artículo", "codigo articulo", "código articulo"],
  descripcionArt: ["descripción art.", "descripcion art.", "descripción art", "descripcion art"],
  codColor: ["cód.color", "cod.color", "código color", "codigo color"],
  color: ["color"],
  talla: ["talla"],
  perfil: ["perfil"],
  composicion: ["composición", "composicion"],
  tarifa: ["tarifa"],
  pvp: ["pvp"],
  ean: ["ean"],
  url: ["url"],
} as const;

type PricatColumnKey = keyof typeof PRICAT_HEADERS;

export type PricatColumnIndex = Record<PricatColumnKey, number | null>;

// ---------------------------------------------------------------------------
// Util: convertir valor de celda exceljs a un primitivo simple
// ---------------------------------------------------------------------------

/**
 * Extrae el primer argumento string de una fórmula tipo `HYPERLINK("url", "label")`.
 * Devuelve null si la fórmula no es un HYPERLINK o no tiene URL parseable.
 */
function extractHyperlinkUrl(formula: string): string | null {
  const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
  return m ? m[1] ?? null : null;
}

export function cellValue(value: ExcelJS.CellValue | undefined | null): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    // Hyperlink {text, hyperlink} o {formula, result}
    if ("hyperlink" in value && typeof (value as { hyperlink?: unknown }).hyperlink === "string") {
      return (value as { hyperlink: string }).hyperlink;
    }
    if ("formula" in value && typeof (value as { formula?: unknown }).formula === "string") {
      const formula = (value as { formula: string }).formula;
      // HYPERLINK("https://...", "label") — prioritario: extraemos la URL real.
      const url = extractHyperlinkUrl(formula);
      if (url) return url;
      // Fallback: usamos el resultado evaluado si está, o devolvemos vacío.
      if ("result" in value && value.result !== undefined && value.result !== null) {
        return cellValue(value.result as ExcelJS.CellValue);
      }
      return null;
    }
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") {
      return (value as { text: string }).text;
    }
    if ("result" in value && value.result !== undefined && value.result !== null) {
      return cellValue(value.result as ExcelJS.CellValue);
    }
    if ("richText" in value && Array.isArray((value as { richText?: unknown }).richText)) {
      return (value as { richText: { text: string }[] }).richText
        .map((rt) => rt.text)
        .join("");
    }
  }
  return String(value);
}

// ---------------------------------------------------------------------------
// Localiza el índice de columna (1-based) para cada cabecera conocida
// ---------------------------------------------------------------------------

function buildColumnIndex(headerRow: ExcelJS.Row): PricatColumnIndex {
  const idx: PricatColumnIndex = {
    altaBaja: null,
    modelo: null,
    codigoModelo: null,
    descripcionModelo: null,
    tipo: null,
    usoDeportivo: null,
    marca: null,
    codigoArticulo: null,
    descripcionArt: null,
    codColor: null,
    color: null,
    talla: null,
    perfil: null,
    composicion: null,
    tarifa: null,
    pvp: null,
    ean: null,
    url: null,
  };

  const colCount = headerRow.cellCount;
  for (let c = 1; c <= colCount; c += 1) {
    const raw = headerRow.getCell(c).value;
    const text = String(cellValue(raw) ?? "")
      .trim()
      .toLowerCase();
    if (!text) continue;
    for (const key of Object.keys(PRICAT_HEADERS) as PricatColumnKey[]) {
      if (idx[key] !== null) continue;
      if (PRICAT_HEADERS[key].some((h) => h.toLowerCase() === text)) {
        idx[key] = c;
        break;
      }
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// Itera filas crudas (objeto con keys del PRICAT)
// ---------------------------------------------------------------------------

export interface RawPricatRow {
  rowNumber: number;
  altaBaja: unknown;
  modelo: unknown;
  codigoModelo: unknown;
  descripcionModelo: unknown;
  tipo: unknown;
  usoDeportivo: unknown;
  marca: unknown;
  codigoArticulo: unknown;
  descripcionArt: unknown;
  codColor: unknown;
  color: unknown;
  talla: unknown;
  perfil: unknown;
  composicion: unknown;
  tarifa: unknown;
  pvp: unknown;
  ean: unknown;
  url: unknown;
}

function pick(row: ExcelJS.Row, col: number | null): unknown {
  if (col === null) return null;
  return cellValue(row.getCell(col).value);
}

function readRow(row: ExcelJS.Row, idx: PricatColumnIndex, rowNumber: number): RawPricatRow {
  return {
    rowNumber,
    altaBaja: pick(row, idx.altaBaja),
    modelo: pick(row, idx.modelo),
    codigoModelo: pick(row, idx.codigoModelo),
    descripcionModelo: pick(row, idx.descripcionModelo),
    tipo: pick(row, idx.tipo),
    usoDeportivo: pick(row, idx.usoDeportivo),
    marca: pick(row, idx.marca),
    codigoArticulo: pick(row, idx.codigoArticulo),
    descripcionArt: pick(row, idx.descripcionArt),
    codColor: pick(row, idx.codColor),
    color: pick(row, idx.color),
    talla: pick(row, idx.talla),
    perfil: pick(row, idx.perfil),
    composicion: pick(row, idx.composicion),
    tarifa: pick(row, idx.tarifa),
    pvp: pick(row, idx.pvp),
    ean: pick(row, idx.ean),
    url: pick(row, idx.url),
  };
}

// ---------------------------------------------------------------------------
// Streaming reader (memoria contenida): exceljs no tiene un streaming "lazy"
// por hoja sin opt-in, pero usamos el reader que va emitiendo filas.
// Para mantener simplicidad y robustez (incluye precios y formatos), abrimos
// el workbook completo pero NO acumulamos filas en memoria: las yield-eamos
// según se piden.
// ---------------------------------------------------------------------------

async function openWorksheet(filePath: string): Promise<ExcelJS.Worksheet> {
  const wb = new ExcelJS.Workbook();
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  await wb.xlsx.readFile(absolute);
  const ws =
    wb.getWorksheet("Catálogo") ??
    wb.getWorksheet("Catalogo") ??
    wb.worksheets[0];
  if (!ws) throw new Error("No se encontró ninguna hoja en el fichero xlsx");
  return ws;
}

/**
 * Total de filas con datos (estimación basada en `rowCount`).
 */
export async function countPricatRows(filePath: string): Promise<number> {
  const ws = await openWorksheet(filePath);
  // rowCount incluye la cabecera
  return Math.max(0, ws.rowCount - 1);
}

/**
 * Itera filas crudas en orden de aparición. Yields un objeto por fila con datos.
 */
export async function* iterPricatRawRows(filePath: string): AsyncGenerator<RawPricatRow> {
  const ws = await openWorksheet(filePath);
  const headerRow = ws.getRow(1);
  const idx = buildColumnIndex(headerRow);

  // Comprobación mínima: códigoArticulo, modelo y color son críticos
  if (idx.modelo === null || idx.codigoArticulo === null || idx.color === null) {
    throw new Error(
      "Cabeceras requeridas no encontradas. Esperado: 'modelo', 'código artículo' y 'color'.",
    );
  }

  for (let i = 2; i <= ws.rowCount; i += 1) {
    const row = ws.getRow(i);
    if (!row || row.cellCount === 0) continue;
    const raw = readRow(row, idx, i);
    // Saltar filas totalmente vacías
    if (!raw.modelo && !raw.codigoArticulo) continue;
    yield raw;
  }
}

/**
 * Itera filas normalizadas, agrupadas por `productKey` (modelo+Cód.color).
 * Cada grupo emitido contiene 1..N filas (variantes de talla del mismo producto).
 *
 * IMPORTANTE: como exceljs ordena las filas en orden natural y las filas del
 * mismo producto suelen aparecer consecutivas (mismo modelo+color), agrupamos
 * de forma "rolling": cuando cambia la `productKey`, emitimos el grupo previo.
 * En el peor caso (filas del mismo producto dispersas), la idempotencia por
 * `externalId` en el upsert resuelve el solapamiento.
 */
export async function* iterPricatProductGroups(
  filePath: string,
): AsyncGenerator<{ productKey: string; rows: NormalizedPricatRow[] }> {
  let bufferKey: string | null = null;
  let buffer: NormalizedPricatRow[] = [];

  for await (const raw of iterPricatRawRows(filePath)) {
    let normalized: NormalizedPricatRow;
    try {
      normalized = normalizePricatRow(raw);
    } catch (err) {
      // Fila inválida: la propagamos con productKey "__ERROR__:<row>" para que
      // el process-job pueda registrar el error sin romper el stream.
      const message = err instanceof Error ? err.message : String(err);
      yield {
        productKey: `__ERROR__:${raw.rowNumber}`,
        rows: [
          {
            rowNumber: raw.rowNumber,
            status: "DRAFT",
            modelCode: "",
            modelArticleCode: String(raw.codigoArticulo ?? ""),
            colorCode: "",
            productKey: "",
            externalId: "",
            type: "",
            sportUse: "",
            brand: "",
            colorName: "",
            size: "",
            gender: "NO_ESPECIFICADO",
            composition: "",
            costPrice: null,
            retailPrice: null,
            ean: null,
            name: `__ERROR__:${message}`,
            imageUrl: null,
          },
        ],
      };
      continue;
    }

    if (bufferKey === null) {
      bufferKey = normalized.productKey;
      buffer = [normalized];
      continue;
    }

    if (normalized.productKey === bufferKey) {
      buffer.push(normalized);
    } else {
      yield { productKey: bufferKey, rows: buffer };
      bufferKey = normalized.productKey;
      buffer = [normalized];
    }
  }

  if (bufferKey !== null && buffer.length > 0) {
    yield { productKey: bufferKey, rows: buffer };
  }
}

/**
 * Lee solo las primeras N filas normalizadas. Útil para el preview.
 */
export async function previewPricatRows(
  filePath: string,
  limit = 10,
): Promise<NormalizedPricatRow[]> {
  const out: NormalizedPricatRow[] = [];
  for await (const raw of iterPricatRawRows(filePath)) {
    try {
      out.push(normalizePricatRow(raw));
    } catch {
      // ignoramos errores en preview, no es bloqueante
    }
    if (out.length >= limit) break;
  }
  return out;
}
