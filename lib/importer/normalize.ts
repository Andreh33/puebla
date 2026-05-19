/**
 * Zona Sport — PRICAT normalizers (puros, testables).
 *
 * Convierte los valores crudos del Excel proveedor a tipos/strings limpios
 * que puedan persistirse directamente en la base de datos.
 *
 * Reglas (ver spec del proyecto):
 *   - `alta/baja`     → ProductStatus  ("A" → DRAFT, "B" → INACTIVE)
 *   - `perfil`        → Gender         (mapeo cerrado castellano)
 *   - `tipo`/`color`/`composición`/`marca` → Title Case en español
 *   - `talla`         → string normalizado, "UNICA" se trata como producto sin tallas
 *   - `EAN`           → valida EAN-13 (8-14 dígitos numéricos)
 */

import { Decimal } from "decimal.js";
import { parsePriceEs } from "@/lib/price";

export type ImportProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
export type ImportGender =
  | "HOMBRE"
  | "MUJER"
  | "UNISEX"
  | "NINO"
  | "NINA"
  | "BEBE"
  | "NO_ESPECIFICADO";

// ---------------------------------------------------------------------------
// Helpers básicos
// ---------------------------------------------------------------------------

const SPANISH_LOWER_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "o",
  "a",
  "en",
  "con",
  "para",
  "por",
  "al",
  "un",
  "una",
]);

/**
 * Title Case respetando minúsculas para preposiciones/artículos castellanos.
 * - "MOCHILA" → "Mochila"
 * - "AZUL MARINO" → "Azul Marino"
 * - "JOHN SMITH" → "John Smith"
 * - "TIEMPO LIBRE/CASUAL" → "Tiempo Libre/Casual"
 * - "MASCULINO (SR.)" → "Masculino (Sr.)"
 */
export function titleCaseEs(input: unknown): string {
  if (input === null || input === undefined) return "";
  const raw = String(input).trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();
  // Conservar separadores comunes: espacios, guiones, barras, paréntesis, puntos
  return lower
    .split(/(\s+|\/|-|\(|\)|\.)/g)
    .map((token, idx, arr) => {
      if (!token) return token;
      if (/^\s+$/.test(token)) return token;
      if (/^[\/\-()\.]+$/.test(token)) return token;

      // Stopword castellana: minúscula salvo si es la primera "palabra real"
      const prevReal = arr
        .slice(0, idx)
        .reverse()
        .find((t) => t && !/^\s+$/.test(t) && !/^[\/\-()\.]+$/.test(t));
      if (prevReal && SPANISH_LOWER_WORDS.has(token)) return token;

      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join("");
}

/**
 * Limpia y eleva a mayúsculas un código de modelo/artículo.
 */
export function normalizeCode(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input).trim().toUpperCase();
}

/**
 * Normaliza talla: trim, mayúsculas. Devuelve "" si está vacía o "UNICA".
 */
export function normalizeSize(input: unknown): string {
  if (input === null || input === undefined) return "";
  const raw = String(input).trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  // "ÚNICA", "UNICA", "UNIDAD", "U" → tratamos como sin tallas
  if (upper === "UNICA" || upper === "ÚNICA" || upper === "U" || upper === "UNIDAD") {
    return "";
  }
  return upper;
}

// ---------------------------------------------------------------------------
// Status: alta/baja → DRAFT/INACTIVE
// ---------------------------------------------------------------------------

export function mapStatus(
  altaBaja: unknown,
  defaultStatus: ImportProductStatus = "DRAFT",
): ImportProductStatus {
  if (altaBaja === null || altaBaja === undefined) return defaultStatus;
  const v = String(altaBaja).trim().toUpperCase();
  if (v === "A" || v === "ALTA") return defaultStatus; // los "A" usan el status configurado (DRAFT en imports)
  if (v === "B" || v === "BAJA") return "INACTIVE";
  return defaultStatus;
}

// ---------------------------------------------------------------------------
// Gender: perfil → enum
// ---------------------------------------------------------------------------

const GENDER_MAP: Record<string, ImportGender> = {
  "MASCULINO (SR.)": "HOMBRE",
  "MASCULINO": "HOMBRE",
  "HOMBRE": "HOMBRE",
  "FEMENINO (SRA.)": "MUJER",
  "FEMENINO": "MUJER",
  "MUJER": "MUJER",
  "JUNIOR NIÑO (JR.)": "NINO",
  "JUNIOR NINO (JR.)": "NINO",
  "NIÑO": "NINO",
  "NINO": "NINO",
  "JUNIOR NIÑA (JR.)": "NINA",
  "JUNIOR NINA (JR.)": "NINA",
  "NIÑA": "NINA",
  "NINA": "NINA",
  "UNISEX (SR.-SRA.)": "UNISEX",
  "UNISEX (JR. NIÑO-NIÑA)": "UNISEX",
  "UNISEX (JR. NINO-NINA)": "UNISEX",
  "UNISEX": "UNISEX",
  "UNISEX (BEBE-INFANTIL)": "BEBE",
  "UNISEX (BEBÉ-INFANTIL)": "BEBE",
  "BEBE": "BEBE",
  "BEBÉ": "BEBE",
  "INFANTIL": "BEBE",
};

export function mapGender(input: unknown): ImportGender {
  if (input === null || input === undefined) return "NO_ESPECIFICADO";
  const key = String(input).trim().toUpperCase();
  if (!key) return "NO_ESPECIFICADO";
  return GENDER_MAP[key] ?? "NO_ESPECIFICADO";
}

// ---------------------------------------------------------------------------
// EAN-13
// ---------------------------------------------------------------------------

const EAN_REGEX = /^\d{8,14}$/;

export function normalizeEan(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s) return null;
  if (!EAN_REGEX.test(s)) return null;
  return s;
}

// ---------------------------------------------------------------------------
// Composición name
// ---------------------------------------------------------------------------

/**
 * Compone el nombre comercial estable del producto.
 * Ejemplo: tipo="MOCHILA", marca="JOHN SMITH", modelo="M24205", color="AZUL MARINO"
 *  → "Mochila John Smith M24205 Azul Marino"
 */
export function composeProductName(parts: {
  tipo: string;
  marca: string;
  modelo: string;
  color: string;
}): string {
  const segments = [
    titleCaseEs(parts.tipo),
    titleCaseEs(parts.marca),
    normalizeCode(parts.modelo),
    titleCaseEs(parts.color),
  ].filter(Boolean);
  return segments.join(" ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Precio: re-export tipado del parser de utilidad
// ---------------------------------------------------------------------------

export function parsePrice(input: unknown): Decimal | null {
  return parsePriceEs(input);
}

// ---------------------------------------------------------------------------
// Fila PRICAT normalizada (tipo intermedio del importador)
// ---------------------------------------------------------------------------

export interface NormalizedPricatRow {
  rowNumber: number; // número de fila en la hoja (incluye header), para diagnóstico
  status: ImportProductStatus;
  modelCode: string; // código modelo, en mayúsculas
  modelArticleCode: string; // "código artículo" (clave del SKU/talla)
  colorCode: string; // "Cód.color"
  productKey: string; // "<modelo>-<codcolor>" → clave de Product (producto = modelo+color)
  externalId: string; // "pricat:<productKey>"
  type: string; // category name (Title Case)
  sportUse: string; // sport use (Title Case)
  brand: string; // brand name (Title Case)
  colorName: string; // color (Title Case)
  size: string; // talla normalizada (vacío si única)
  gender: ImportGender;
  composition: string; // Title Case
  costPrice: Decimal | null;
  retailPrice: Decimal | null;
  ean: string | null;
  name: string; // nombre comercial compuesto
  imageUrl: string | null; // URL externa extraída de la columna URL (HYPERLINK formula)
}

/**
 * Convierte un mapa de columnas crudas de Excel en un NormalizedPricatRow.
 * Lanza Error si faltan campos obligatorios para diagnosticar la fila.
 */
export function normalizePricatRow(raw: {
  rowNumber: number;
  altaBaja: unknown;
  modelo: unknown;
  codigoModelo: unknown;
  descripcionModelo: unknown;
  tipo: unknown;
  usoDeportivo: unknown;
  marca: unknown;
  codigoArticulo: unknown;
  codColor: unknown;
  color: unknown;
  talla: unknown;
  perfil: unknown;
  composicion: unknown;
  tarifa: unknown;
  pvp: unknown;
  ean: unknown;
  url?: unknown;
}): NormalizedPricatRow {
  const modelCode = normalizeCode(raw.modelo);
  const modelArticleCode = normalizeCode(raw.codigoArticulo);
  const colorCode = normalizeCode(raw.codColor);

  if (!modelCode) throw new Error("Falta 'modelo'");
  if (!modelArticleCode) throw new Error("Falta 'código artículo'");

  const tipo = titleCaseEs(raw.tipo) || "Sin Categoría";
  const marca = titleCaseEs(raw.marca) || "Sin Marca";
  const colorName = titleCaseEs(raw.color) || "Único";

  // Clave de producto: modelo + Cód.color (1 color = 1 producto, tallas como variantes)
  const productKey = colorCode ? `${modelCode}-${colorCode}` : modelCode;

  return {
    rowNumber: raw.rowNumber,
    status: mapStatus(raw.altaBaja),
    modelCode,
    modelArticleCode,
    colorCode,
    productKey,
    externalId: `pricat:${productKey}`,
    type: tipo,
    sportUse: titleCaseEs(raw.usoDeportivo),
    brand: marca,
    colorName,
    size: normalizeSize(raw.talla),
    gender: mapGender(raw.perfil),
    composition: titleCaseEs(raw.composicion),
    costPrice: parsePrice(raw.tarifa),
    retailPrice: parsePrice(raw.pvp),
    ean: normalizeEan(raw.ean),
    name: composeProductName({
      tipo,
      marca,
      modelo: modelCode,
      color: colorName,
    }),
    imageUrl: parseImageUrl(raw.url),
  };
}

/**
 * Parsea el valor crudo de la columna URL del PRICAT, que puede venir como:
 *  - string con la URL ya resuelta (después de `cellValue` con HYPERLINK extractor)
 *  - null/undefined
 *  - cualquier otra cosa: descarta
 * Devuelve solo URLs https válidas.
 */
function parseImageUrl(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s || !s.startsWith("http")) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
