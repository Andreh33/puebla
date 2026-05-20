/**
 * Zona Sport — lector universal de tablas.
 *
 * Acepta CUALQUIER formato tabular soportado por SheetJS (xlsx, xls, xlsb,
 * ods, fods, csv, tsv, txt, dif…) y devuelve un array de objetos
 * `{ [cabecera]: valorCelda }` con la primera fila como cabecera.
 *
 * Decisiones:
 *  - Usamos SheetJS (`xlsx` de npm, 0.18.5) para TODO. Lee binarios de Excel y
 *    ODS, y también CSV/TSV/texto delimitado, con la misma API.
 *  - La detección de formato es informativa (campo `format`): por extensión y,
 *    como fallback, por "magic bytes" del propio buffer. SheetJS autodetecta el
 *    formato real, así que `format` se usa solo para el breadcrumb / UI.
 *  - Elegimos la primera hoja, salvo que exista una llamada "Catálogo",
 *    "Catalogo", "Productos", "Products" o "Sheet1" (en ese orden de prioridad).
 *  - Toleramos celdas con fórmula `=HYPERLINK("url","texto")`: extraemos la URL
 *    igual que `lib/importer/xlsx.ts`.
 *  - Todas las celdas se devuelven como string trim-eado; las cabeceras también.
 */

import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface ReadTableResult {
  /** Filas como objetos {cabecera → valor string}. */
  rows: Record<string, string>[];
  /** Cabeceras detectadas, en orden y trim-eadas. */
  headers: string[];
  /** Nombre de la hoja elegida. */
  sheetName: string;
  /** Formato detectado (xlsx, xls, csv…). */
  format: string;
}

// ---------------------------------------------------------------------------
// Formatos soportados
// ---------------------------------------------------------------------------

const SUPPORTED_EXTENSIONS = [
  "xlsx",
  "xlsm",
  "xlsb",
  "xls",
  "ods",
  "fods",
  "csv",
  "tsv",
  "txt",
  "dif",
] as const;

export type TableFormat = (typeof SUPPORTED_EXTENSIONS)[number] | "unknown";

/**
 * ¿Soportamos esta extensión? (usado por el endpoint para validar).
 */
export function isSupportedTableExtension(filename: string): boolean {
  const ext = extOf(filename);
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

export const SUPPORTED_TABLE_EXTENSIONS: readonly string[] = SUPPORTED_EXTENSIONS;

function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  if (i < 0) return "";
  return filename.slice(i + 1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Detección de formato (extensión + magic bytes como fallback)
// ---------------------------------------------------------------------------

function detectFormat(buffer: Buffer, filename: string): TableFormat {
  const ext = extOf(filename);
  if ((SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return ext as TableFormat;
  }

  // Magic bytes:
  //  - "PK\x03\x04" → ZIP (xlsx, xlsb, ods, fods son contenedores ZIP)
  //  - "\xD0\xCF\x11\xE0" → OLE2 (xls legacy)
  //  - todo lo demás con bytes imprimibles → asumimos texto delimitado (csv)
  if (buffer.length >= 4) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    const b2 = buffer[2];
    const b3 = buffer[3];
    if (b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04) {
      // ZIP container — lo más común es xlsx; SheetJS distinguirá xlsx/ods/xlsb
      return "xlsx";
    }
    if (b0 === 0xd0 && b1 === 0xcf && b2 === 0x11 && b3 === 0xe0) {
      return "xls";
    }
  }
  // Texto plano → CSV/TSV/TXT
  return "csv";
}

// ---------------------------------------------------------------------------
// HYPERLINK extractor (reusa la misma lógica que lib/importer/xlsx.ts)
// ---------------------------------------------------------------------------

function extractHyperlinkUrl(formula: string): string | null {
  const m = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
  return m ? (m[1] ?? null) : null;
}

/**
 * Convierte una celda SheetJS a string limpio.
 *
 * SheetJS expone en cada celda:
 *   - `.t`  → tipo: "s" string, "n" number, "b" boolean, "d" date, "e" error
 *   - `.v`  → valor evaluado (string | number | boolean | Date)
 *   - `.f`  → fórmula sin el `=` inicial, p.ej. `HYPERLINK("https://…","txt")`
 *   - `.w`  → texto formateado tal cual se vería en la celda
 *   - `.l`  → hyperlink object { Target } cuando es un link "nativo" (no fórmula)
 *
 * Reglas de conversión (¡importante para precios y EAN!):
 *  - Enlaces: fórmula HYPERLINK > hyperlink nativo (.l.Target) > valor.
 *  - Fechas: ISO del `.v` (el `.w` es lossy, p.ej. "1/15/24").
 *  - Números: el caso delicado. Un CSV europeo escribe "59,95" y SheetJS lo
 *    parsea como `.v = 5995` (¡coma tomada como millares!) pero conserva
 *    `.w = "59,95"`. Por eso para números preferimos `.w` (texto fuente) que
 *    `parsePriceEs` sabe interpretar — SALVO cuando `.w` viene en notación
 *    científica (p.ej. un EAN largo → "8.41235E+12"), donde `.v` es el valor
 *    correcto. Así sobreviven tanto los precios con coma como los códigos
 *    largos.
 *  - Strings/otros: el `.v` tal cual.
 */
function cellToString(cell: XLSX.CellObject | undefined | null): string {
  if (cell === null || cell === undefined) return "";

  // 1) Fórmula HYPERLINK → URL real
  if (typeof cell.f === "string" && cell.f) {
    const url = extractHyperlinkUrl(cell.f);
    if (url) return url;
  }

  // 2) Hyperlink nativo (.l.Target)
  const link = (cell as { l?: { Target?: unknown } }).l;
  if (link && typeof link.Target === "string" && link.Target) {
    const v = cell.v;
    if (v === null || v === undefined || v === "") return link.Target;
  }

  const v = cell.v;
  const w = typeof cell.w === "string" ? cell.w.trim() : "";

  if (cell.t === "d" || v instanceof Date) {
    return v instanceof Date ? v.toISOString() : w;
  }
  if (cell.t === "b" || typeof v === "boolean") {
    return v ? "true" : "false";
  }
  if (cell.t === "n" || typeof v === "number") {
    // Notación científica en `.w` (números enormes tipo EAN) → usar `.v`.
    if (w && !/[eE]\+?\d/.test(w)) return w;
    if (v === null || v === undefined) return w;
    return String(v);
  }

  if (v === null || v === undefined) return w;
  return String(v).trim();
}

// ---------------------------------------------------------------------------
// Selección de hoja
// ---------------------------------------------------------------------------

const PREFERRED_SHEETS = ["Catálogo", "Catalogo", "Productos", "Products", "Sheet1"];

function pickSheetName(workbook: XLSX.WorkBook): string {
  const names = workbook.SheetNames;
  if (names.length === 0) {
    throw new Error("El archivo no contiene ninguna hoja");
  }
  for (const preferred of PREFERRED_SHEETS) {
    const match = names.find((n) => n.toLowerCase() === preferred.toLowerCase());
    if (match) return match;
  }
  return names[0]!;
}

// ---------------------------------------------------------------------------
// Lectura principal
// ---------------------------------------------------------------------------

/**
 * Lee un buffer tabular (cualquier formato SheetJS) y devuelve filas como
 * objetos {cabecera → valor string}. La primera fila no vacía es la cabecera.
 */
export async function readTable(
  buffer: Buffer,
  filename: string,
): Promise<ReadTableResult> {
  const format = detectFormat(buffer, filename);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      cellFormula: true, // necesitamos .f para extraer HYPERLINK
      cellDates: true, // fechas como Date, no como número serial
      cellHTML: false,
      raw: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`No se pudo leer el archivo (${format}): ${message}`);
  }

  const sheetName = pickSheetName(workbook);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`No se pudo abrir la hoja "${sheetName}"`);
  }

  // Leemos como matriz (header:1) para controlar nosotros el mapeo cabecera→fila
  // y poder aplicar `cellToString` sobre cada celda (HYPERLINK, etc.).
  const ref = sheet["!ref"];
  if (!ref) {
    // Hoja vacía
    return { rows: [], headers: [], sheetName, format };
  }

  const range = XLSX.utils.decode_range(ref);
  const rows: Record<string, string>[] = [];

  // 1) Localizar la fila de cabecera: primera fila con al menos una celda no vacía.
  let headerRowIdx = range.s.r;
  let headers: string[] = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const candidate: string[] = [];
    let nonEmpty = 0;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const text = cellToString(sheet[addr] as XLSX.CellObject | undefined).trim();
      candidate.push(text);
      if (text) nonEmpty += 1;
    }
    if (nonEmpty > 0) {
      headerRowIdx = r;
      headers = candidate;
      break;
    }
  }

  if (headers.length === 0) {
    return { rows: [], headers: [], sheetName, format };
  }

  // Normalizamos cabeceras: trim. Para columnas con cabecera vacía generamos
  // un nombre estable "col<N>" para no perder la columna ni colisionar.
  const normalizedHeaders = headers.map((h, i) => {
    const t = h.trim();
    return t || `col${i + 1}`;
  });
  // Resolver duplicados de cabecera añadiendo sufijo.
  const seen = new Map<string, number>();
  const finalHeaders = normalizedHeaders.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  // 2) Filas de datos (a partir de la fila siguiente a la cabecera).
  for (let r = headerRowIdx + 1; r <= range.e.r; r += 1) {
    const obj: Record<string, string> = {};
    let nonEmpty = 0;
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const headerName = finalHeaders[c - range.s.c];
      if (!headerName) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      const value = cellToString(sheet[addr] as XLSX.CellObject | undefined);
      obj[headerName] = value;
      if (value) nonEmpty += 1;
    }
    if (nonEmpty === 0) continue; // saltar filas totalmente vacías
    rows.push(obj);
  }

  return { rows, headers: finalHeaders, sheetName, format };
}

/**
 * Variante ligera: lee solo las primeras `limit` filas de datos. Útil para
 * previews. Para CSV no hay forma trivial de cortar antes en SheetJS, así que
 * leemos completo y cortamos — los previews son de ficheros que igualmente se
 * van a importar, así que el coste es aceptable.
 */
export async function readTablePreview(
  buffer: Buffer,
  filename: string,
  limit = 10,
): Promise<ReadTableResult> {
  const full = await readTable(buffer, filename);
  return { ...full, rows: full.rows.slice(0, limit) };
}
