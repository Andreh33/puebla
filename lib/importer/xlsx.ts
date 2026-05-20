/**
 * Zona Sport — lector del PRICAT (y feeds genéricos) sobre el lector universal.
 *
 * Antes este módulo leía SOLO .xlsx con exceljs. Ahora delega la lectura del
 * fichero en `lib/importer/read-table.ts` (SheetJS), que soporta xlsx, xls,
 * xlsb, ods, fods, csv, tsv y txt. Toda la lógica de negocio (mapeo de
 * cabeceras PRICAT, agrupado por modelo+color, normalización) se mantiene.
 *
 * - Localiza dinámicamente las cabeceras buscando los nombres oficiales del
 *   PRICAT; si no las encuentra, intenta un mapeo "genérico" (Nombre/Name →
 *   descripción, Precio/Price → PVP, etc.) para tolerar tablas arbitrarias.
 * - Expone los mismos generadores que antes (`iterPricatRawRows`,
 *   `iterPricatProductGroups`), de modo que `process-job.ts` no cambia.
 * - Agrupa por `productKey` (modelo+Cód.color) para producto = modelo+color.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { readTable, type ReadTableResult } from "./read-table";
import { buildGenericHeaderMap, detectFeedKind } from "./detect-feed";
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

// ---------------------------------------------------------------------------
// HYPERLINK helper (conservado por compatibilidad de import; readTable ya
// resuelve los HYPERLINK, pero algunos consumidores externos lo usan).
// ---------------------------------------------------------------------------

function extractHyperlinkUrl(formula: string): string | null {
  const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
  return m ? (m[1] ?? null) : null;
}

/**
 * Normaliza un valor de celda a primitivo simple. Mantiene la firma histórica
 * para no romper imports; con readTable las celdas ya llegan como string.
 */
export function cellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    // Si por lo que sea nos llega una fórmula HYPERLINK como string, la resolvemos.
    const url = extractHyperlinkUrl(value);
    return url ?? value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

// ---------------------------------------------------------------------------
// Fila cruda PRICAT (idéntica a la versión anterior — process-job depende)
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

// ---------------------------------------------------------------------------
// Resolución cabecera real → clave PRICAT
// ---------------------------------------------------------------------------

type ColumnMap = Partial<Record<PricatColumnKey, string>>;

/**
 * Mapea las cabeceras reales del fichero a las claves del PRICAT. Primero
 * intenta el matcheo oficial (PRICAT_HEADERS); si el feed es "generic" o
 * faltan columnas críticas, completa con los alias genéricos de detect-feed.
 */
function buildColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const byLower = new Map<string, string>();
  for (const h of headers) byLower.set(h.trim().toLowerCase(), h);

  for (const key of Object.keys(PRICAT_HEADERS) as PricatColumnKey[]) {
    for (const candidate of PRICAT_HEADERS[key]) {
      const real = byLower.get(candidate.toLowerCase());
      if (real) {
        map[key] = real;
        break;
      }
    }
  }

  // Si no se reconoció el núcleo PRICAT, intentamos mapeo genérico para tolerar
  // tablas arbitrarias (un Excel manual, otro export). No pisa lo ya mapeado.
  const kind = detectFeedKind(headers);
  if (kind === "generic" || !map.modelo || !map.codigoArticulo) {
    const generic = buildGenericHeaderMap(headers);
    for (const [k, real] of Object.entries(generic) as [PricatColumnKey, string][]) {
      if (!map[k]) map[k] = real;
    }
  }

  return map;
}

function readField(row: Record<string, string>, header: string | undefined): unknown {
  if (!header) return null;
  const v = row[header];
  if (v === undefined || v === null || v === "") return null;
  return v;
}

function toRawRow(
  row: Record<string, string>,
  map: ColumnMap,
  rowNumber: number,
): RawPricatRow {
  return {
    rowNumber,
    altaBaja: readField(row, map.altaBaja),
    modelo: readField(row, map.modelo),
    codigoModelo: readField(row, map.codigoModelo),
    descripcionModelo: readField(row, map.descripcionModelo),
    tipo: readField(row, map.tipo),
    usoDeportivo: readField(row, map.usoDeportivo),
    marca: readField(row, map.marca),
    codigoArticulo: readField(row, map.codigoArticulo),
    descripcionArt: readField(row, map.descripcionArt),
    codColor: readField(row, map.codColor),
    color: readField(row, map.color),
    talla: readField(row, map.talla),
    perfil: readField(row, map.perfil),
    composicion: readField(row, map.composicion),
    tarifa: readField(row, map.tarifa),
    pvp: readField(row, map.pvp),
    ean: readField(row, map.ean),
    url: readField(row, map.url),
  };
}

// ---------------------------------------------------------------------------
// Lectura del fichero (cualquier formato) → tabla universal
// ---------------------------------------------------------------------------

async function loadTable(filePath: string): Promise<ReadTableResult> {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  const buffer = await readFile(absolute);
  return readTable(buffer, path.basename(absolute));
}

/**
 * Total de filas de datos (sin cabecera).
 */
export async function countPricatRows(filePath: string): Promise<number> {
  const { rows } = await loadTable(filePath);
  return rows.length;
}

/**
 * Itera filas crudas en orden de aparición.
 *
 * El `rowNumber` que reportamos es 1-based respecto a la primera fila de DATOS
 * + 1 (para que "fila 2" ≈ primera fila de datos en una hoja con cabecera en la
 * fila 1), manteniendo el espíritu del diagnóstico anterior basado en exceljs.
 */
export async function* iterPricatRawRows(filePath: string): AsyncGenerator<RawPricatRow> {
  const { rows, headers } = await loadTable(filePath);
  const map = buildColumnMap(headers);

  // Comprobación mínima: necesitamos al menos modelo + artículo + color, o sus
  // equivalentes genéricos. Si ni siquiera hay "modelo"/equivalente, abortamos.
  if (!map.modelo || !map.codigoArticulo) {
    throw new Error(
      "Cabeceras requeridas no encontradas. Esperado: 'modelo' y 'código artículo' (o equivalentes Nombre/Referencia/SKU).",
    );
  }

  let i = 0;
  for (const row of rows) {
    i += 1;
    const raw = toRawRow(row, map, i + 1); // +1 → fila aprox. en la hoja
    if (!raw.modelo && !raw.codigoArticulo) continue;
    yield raw;
  }
}

/**
 * Itera filas normalizadas agrupadas por `productKey` (modelo+Cód.color).
 * Mismo contrato que la versión exceljs: las filas inválidas se emiten con
 * productKey "__ERROR__:<row>" para que process-job las registre sin romper.
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
