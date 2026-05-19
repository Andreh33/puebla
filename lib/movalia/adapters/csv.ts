/**
 * Adaptador CSV para Movalia.
 *
 * Diseño:
 *   - No usamos `csv-parse` (no instalado) — parseamos a mano con un mini
 *     parser que respeta comillas, separadores `,` y `;`, escapes "" → ".
 *   - Soporta encodings utf-8 e ISO-8859-1 / Windows-1252 (heurística por
 *     bytes anómalos).
 *   - Mapping configurable vía el parámetro `mapping` o el Setting
 *     "movalia.csvMapping" (Record<sourceField, targetField>).
 *
 *  Target fields esperados (todos opcionales salvo externalId / name /
 *  retailPrice / brand / category / colorName):
 *    externalId | modelCode | name | description | brand | category |
 *    colorName | colorHex | gender | composition | costPrice |
 *    retailPrice | sportUse | size | ean | stock | imageUrl
 *
 *  Una fila por talla — el adaptador agrupa por externalId.
 */

import { readFile } from "node:fs/promises";
import type { MovaliaItem, MovaliaItemSize, MovaliaProvider } from "../provider";
import { parsePriceEs } from "@/lib/price";
import { titleCaseEs, normalizeCode, normalizeSize, mapGender } from "@/lib/importer/normalize";

export type CsvMapping = Record<string, string>;

export interface MovaliaCsvOptions {
  /** Ruta local o URL al fichero (http/https). */
  source: string;
  /** Mapping origen → destino. Si vacío, usa los nombres "target" directamente. */
  mapping?: CsvMapping;
  /** Separador forzado; si null, auto-detecta entre `,` y `;`. */
  delimiter?: "," | ";";
  /** Encoding forzado; auto-detecta si no se especifica. */
  encoding?: "utf-8" | "latin1";
}

// ---------------------------------------------------------------------------
// Lector de bytes con decodificación robusta
// ---------------------------------------------------------------------------

async function readSourceBytes(source: string): Promise<Buffer> {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source, { redirect: "follow" });
    if (!res.ok) throw new Error(`No se pudo descargar ${source}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return buf;
  }
  return readFile(source);
}

function looksUtf8(buf: Buffer): boolean {
  // Heurística rápida: si decodificamos como utf-8 y aparecen "" (replacement),
  // tratamos como latin1.
  try {
    const txt = buf.toString("utf-8");
    return !txt.includes("�");
  } catch {
    return false;
  }
}

function decodeBytes(buf: Buffer, force?: "utf-8" | "latin1"): string {
  if (force === "utf-8") return buf.toString("utf-8");
  if (force === "latin1") return buf.toString("latin1");
  return looksUtf8(buf) ? buf.toString("utf-8") : buf.toString("latin1");
}

// ---------------------------------------------------------------------------
// Mini parser CSV
// ---------------------------------------------------------------------------

function detectDelimiter(headerLine: string): "," | ";" {
  const c = (headerLine.match(/,/g) ?? []).length;
  const s = (headerLine.match(/;/g) ?? []).length;
  return s > c ? ";" : ",";
}

/**
 * Parser de líneas CSV que respeta comillas dobles y escapes "" → ".
 * Acepta cualquier delimitador de un carácter.
 */
export function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      out.push(cur);
      cur = "";
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/**
 * Parser de CSV completo respetando saltos de línea dentro de comillas.
 */
export function parseCsvText(
  text: string,
  delimiter: string,
): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // contar comillas (manejo de escape "" se hace en parseCsvLine)
      if (inQuotes && text[i + 1] === '"') {
        cur += '""';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      cur += ch;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      if (cur.length > 0) {
        lines.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) lines.push(cur);

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]!, delimiter);

  const rows: Record<string, string>[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]!, delimiter);
    if (cells.length === 1 && cells[0] === "") continue;
    const row: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]!] = cells[i] ?? "";
    }
    rows.push(row);
  }
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Conversión fila CSV → MovaliaItem (agrupando por externalId)
// ---------------------------------------------------------------------------

function applyMapping(
  row: Record<string, string>,
  mapping?: CsvMapping,
): Record<string, string> {
  if (!mapping || Object.keys(mapping).length === 0) return row;
  const out: Record<string, string> = {};
  for (const [src, tgt] of Object.entries(mapping)) {
    if (row[src] !== undefined) out[tgt] = row[src]!;
  }
  // mantener campos no mapeados pero útiles
  for (const [k, v] of Object.entries(row)) {
    if (!(k in mapping) && out[k] === undefined) out[k] = v;
  }
  return out;
}

function buildItem(
  externalId: string,
  rows: Record<string, string>[],
): MovaliaItem | null {
  const head = rows[0]!;
  const retailPrice = parsePriceEs(head.retailPrice);
  if (retailPrice === null) return null;

  const costPrice = parsePriceEs(head.costPrice);
  const sizes: MovaliaItemSize[] = [];
  const imageUrls = new Set<string>();

  for (const r of rows) {
    const size = normalizeSize(r.size);
    if (size) {
      sizes.push({
        size,
        ean: r.ean ? r.ean.replace(/\s+/g, "") : null,
        stock: r.stock ? Number(r.stock) || 0 : 0,
      });
    }
    if (r.imageUrl) {
      for (const u of r.imageUrl.split(/[|,;\s]+/).map((s) => s.trim()).filter(Boolean)) {
        imageUrls.add(u);
      }
    }
  }

  return {
    externalId,
    modelCode: head.modelCode ? normalizeCode(head.modelCode) : undefined,
    name: titleCaseEs(head.name) || `Producto ${externalId}`,
    description: head.description || undefined,
    brand: titleCaseEs(head.brand) || "Sin Marca",
    category: titleCaseEs(head.category) || "Sin Categoría",
    colorName: titleCaseEs(head.colorName) || "Único",
    colorHex: head.colorHex || undefined,
    gender: head.gender ? mapGender(head.gender) : undefined,
    composition: titleCaseEs(head.composition) || undefined,
    costPrice: costPrice ? costPrice.toNumber() : null,
    retailPrice: retailPrice.toNumber(),
    sportUse: titleCaseEs(head.sportUse) || undefined,
    sizes,
    imageUrls: Array.from(imageUrls),
    raw: head,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function createMovaliaCsvProvider(opts: MovaliaCsvOptions): MovaliaProvider {
  return {
    name: `movalia-csv:${opts.source}`,
    async *fetchCatalog(): AsyncIterable<MovaliaItem> {
      const bytes = await readSourceBytes(opts.source);
      const text = decodeBytes(bytes, opts.encoding);
      const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
      const delim = opts.delimiter ?? detectDelimiter(firstLine);

      const { rows } = parseCsvText(text, delim);

      // Agrupa por externalId (tras aplicar mapping)
      const groups = new Map<string, Record<string, string>[]>();
      for (const raw of rows) {
        const r = applyMapping(raw, opts.mapping);
        const id = (r.externalId || "").trim();
        if (!id) continue;
        const arr = groups.get(id) ?? [];
        arr.push(r);
        groups.set(id, arr);
      }

      for (const [id, grp] of groups) {
        const item = buildItem(id, grp);
        if (item) yield item;
      }
    },
  };
}
