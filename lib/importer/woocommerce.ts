/**
 * Zona Sport — WooCommerce CSV parser & normalizer.
 *
 * Lee exports nativos de WooCommerce (formato `wc-product-export-*.csv`) y
 * los agrupa en "productos lógicos":
 *
 *   - Tipo `variable` → el padre define los datos del Product. Las filas
 *     `variation` que lo siguen (cuyo SKU empieza por `<padre>-` o cuyo
 *     campo `Superior` apunta al padre) se convierten en `ProductSize`.
 *   - Tipo `simple`   → 1 fila = 1 Product sin tallas.
 *   - Tipo `variation` huérfana (sin padre conocido) → se ignora con error.
 *
 * El parser es **streaming**: usa papaparse en modo step para no cargar todo
 * el CSV en memoria — el export real pesa 3.3 MB y crecerá. Los grupos se
 * emiten de forma asíncrona vía generador.
 *
 * Mapeo a Product/ProductSize del schema Prisma → ver `mapWooParentToProduct`
 * y `mapWooVariationToSize`. Las decisiones no obvias (color, género, marca,
 * categoría hoja) están comentadas inline.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Decimal } from "decimal.js";
import { createReadStream } from "node:fs";
import Papa from "papaparse";
import { titleCaseEs, normalizeEan, parsePrice } from "./normalize";
import type { ImportGender } from "./normalize";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface WooNormalizedParent {
  rowNumber: number;
  /** ID interno WooCommerce (columna "ID"). */
  wooId: string;
  /** SKU del padre (columna "SKU"). */
  sku: string;
  /** Nombre original tal cual aparece en la columna "Nombre". */
  rawName: string;
  /** Nombre comercial limpio (sin talla, sin barra-vertical extra). */
  name: string;
  shortName: string | null;
  description: string | null;
  brand: string;
  /** Categoría hoja elegida (Title Case castellano). */
  category: string;
  /** Slug propuesto para el producto (sin unicidad garantizada). */
  slugSeed: string;
  modelCode: string;
  colorName: string;
  gender: ImportGender;
  retailPrice: Decimal | null;
  salePrice: Decimal | null;
  costPrice: Decimal | null;
  weight: Decimal | null;
  tags: string[];
  /** Primera URL de la columna "Imágenes". */
  mainImageUrl: string | null;
  /** Resto de URLs de la columna "Imágenes". */
  extraImageUrls: string[];
  /** "ACTIVE" si Publicado=1 y visibilidad=visible, sino DRAFT. */
  status: "ACTIVE" | "DRAFT" | "INACTIVE";
  /** ID externo único para upsert: `woocommerce:<wooId>`. */
  externalId: string;
  /** Si la fila es de tipo `simple` (en lugar de `variable`), aquí queda anotado. */
  isSimple: boolean;
  /** Stock del padre si es simple (en variables se calcula sumando variations). */
  stock: number;
}

export interface WooNormalizedVariation {
  rowNumber: number;
  wooId: string;
  parentSku: string;
  /** SKU completo de la variation, p.ej. "4021-32". */
  sku: string;
  /** Valor de la talla (atributo por defecto 1 o valor del atributo 1). */
  size: string;
  ean: string | null;
  retailPrice: Decimal | null;
  salePrice: Decimal | null;
  costPrice: Decimal | null;
  stock: number;
  /** Imagen propia de la variation si la trae. */
  imageUrl: string | null;
}

export interface WooProductGroup {
  parent: WooNormalizedParent;
  variations: WooNormalizedVariation[];
}

// ---------------------------------------------------------------------------
// Reconocedores de tokens del nombre WooCommerce
// ---------------------------------------------------------------------------

/**
 * Lista de colores reconocibles dentro del nombre del producto. El cliente
 * exporta nombres en mayúsculas tipo "ZAPATILLA JOMA J.SIMA JR 2006 ROJO NEGRO".
 * Aceptamos hasta 2 tokens consecutivos (ROJO + NEGRO) o pares compuestos
 * frecuentes ("AZUL MARINO", "ROSA BURDEOS"…).
 */
const COLOR_TOKENS = new Set([
  "ROJO",
  "ROJA",
  "AZUL",
  "AMARILLO",
  "AMARILLA",
  "VERDE",
  "NEGRO",
  "NEGRA",
  "BLANCO",
  "BLANCA",
  "GRIS",
  "ROSA",
  "MORADO",
  "MORADA",
  "FUCSIA",
  "NARANJA",
  "MARRON",
  "MARRÓN",
  "BEIGE",
  "DORADO",
  "DORADA",
  "PLATA",
  "PLATEADO",
  "BURDEOS",
  "GRANATE",
  "MARINO",
  "CELESTE",
  "TURQUESA",
  "FLUOR",
  "FLÚOR",
  "FLUORESCENTE",
  "OSCURO",
  "OSCURA",
  "CLARO",
  "CLARA",
  "PASTEL",
  "PETROLEO",
  "CORAL",
  "SALMON",
  "SALMÓN",
  "LIMA",
  "VIOLETA",
  "LILA",
  "TIERRA",
  "PINK",
  "BLUE",
  "RED",
  "WHITE",
  "BLACK",
  "GREEN",
  "GREY",
  "GRAY",
  "YELLOW",
  "ORANGE",
  "PURPLE",
  "NAVY",
]);

/** Pares compuestos de color (vienen seguidos en el nombre). */
const COLOR_PAIRS_PREFIX = new Set(["AZUL", "ROSA", "VERDE", "GRIS"]);

/**
 * Tokens que indican género en el nombre o categorías. ORDEN IMPORTANTE:
 * los más específicos primero. "INFANTIL > NIÑO" debe matchear NINO antes
 * que BEBE (BEBE solo si NO hay nada más específico).
 */
const GENDER_HINTS: Array<{ regex: RegExp; gender: ImportGender }> = [
  { regex: /\bNIÑA\b|\bNIÑAS\b|\bGIRL\b/i, gender: "NINA" },
  {
    regex: /\bNIÑO\b|\bNIÑOS\b|\bNINO\b|\bBOY\b|\bJUNIOR\b|\bJR\b|\bKIDS\b/i,
    gender: "NINO",
  },
  { regex: /\bMUJER\b|\bWOMAN\b|\bWOMEN\b|\bDAMA\b|\bLADY\b/i, gender: "MUJER" },
  { regex: /\bHOMBRE\b|\bMAN\b|\bMEN\b|\bCABALLERO\b/i, gender: "HOMBRE" },
  { regex: /\bUNISEX\b/i, gender: "UNISEX" },
  { regex: /\bBEBE\b|\bBEBÉ\b|\bBABY\b|\bINFANTIL\b/i, gender: "BEBE" },
];

// ---------------------------------------------------------------------------
// Slugify rápido (no se importa lib/seo/slug aquí para mantener pureza)
// ---------------------------------------------------------------------------

function basicSlug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

// ---------------------------------------------------------------------------
// Limpieza de texto / nombre
// ---------------------------------------------------------------------------

/**
 * Limpia el nombre WooCommerce quitándole el bloque tras el "|" (que suele
 * ser un claim de marketing) y normalizando espacios.
 */
export function cleanWooName(raw: string): string {
  if (!raw) return "";
  const head = raw.split("|")[0]!.trim();
  return head.replace(/\s+/g, " ");
}

/**
 * Quita la talla del final del nombre si aparece tras un "-" (típico de las
 * filas `variation` que repiten el nombre del padre + " - 32").
 */
export function stripTrailingSize(name: string): string {
  return name.replace(/\s*-\s*[\d'.°/]+$/u, "").trim();
}

/**
 * Extrae el color del nombre. Detecta:
 *   1. Pares compuestos: "AZUL MARINO", "ROSA BURDEOS", "ROJO NEGRO"…
 *   2. Color simple: "ROJO", "PINK"…
 * Si no encuentra nada, devuelve "Único".
 *
 * Estrategia: tokenizamos por espacios, buscamos primera coincidencia en
 * COLOR_TOKENS. Si está, miramos si el siguiente token también es un color
 * → bicolor.
 */
export function extractColorFromName(rawName: string): string {
  if (!rawName) return "Único";
  const tokens = cleanWooName(rawName)
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÜÑ' ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    if (!COLOR_TOKENS.has(t)) continue;
    const next = tokens[i + 1];
    if (next && COLOR_TOKENS.has(next)) {
      return titleCaseEs(`${t} ${next}`);
    }
    // Pares fijos típicos castellanos (azul marino, etc.) aunque el segundo no
    // esté en COLOR_TOKENS por sí solo
    if (next && COLOR_PAIRS_PREFIX.has(t)) {
      return titleCaseEs(`${t} ${next}`);
    }
    return titleCaseEs(t);
  }
  return "Único";
}

/**
 * Infiere género del nombre + categorías. Las categorías WooCommerce vienen
 * jerarquizadas: "INFANTIL > NIÑO > CALZADO". Buscamos primero ahí.
 */
export function extractGender(rawName: string, categories: string): ImportGender {
  const haystack = `${rawName} ${categories}`;
  for (const hint of GENDER_HINTS) {
    if (hint.regex.test(haystack)) return hint.gender;
  }
  return "NO_ESPECIFICADO";
}

/**
 * Intenta extraer un modelCode del nombre/sku. Patrón habitual JOMA / John
 * Smith: "J.SIMAS-2006", "M24205", "BB4123", "DX4".
 *
 * Si no encuentra, devuelve el SKU.
 */
export function extractModelCode(rawName: string, sku: string): string {
  const m = rawName.match(/\b([A-Z]+\.?[A-Z]{0,6}-?\d{2,6}[A-Z]?)\b/);
  if (m) return m[1]!.toUpperCase();
  return sku.toUpperCase();
}

/**
 * Categorías WooCommerce:
 *   - Múltiples ramas separadas por coma:  `"A > B > C, X > Y"`.
 *   - Cada rama jerárquica con ">".
 *
 * Elegimos:
 *   1. Primera rama (la primera coma corta la cadena).
 *   2. De esa rama, la HOJA (último segmento tras ">").
 *
 * Title-case en castellano. Si está vacío → "Sin categoría".
 */
export function extractLeafCategory(raw: string): string {
  if (!raw) return "Sin Categoría";
  const firstBranch = raw.split(",")[0]!.trim();
  if (!firstBranch) return "Sin Categoría";
  const parts = firstBranch.split(">").map((s) => s.trim()).filter(Boolean);
  const leaf = parts[parts.length - 1] || "Sin Categoría";
  return titleCaseEs(leaf);
}

/**
 * Parsea la columna "Imágenes" devolviendo todas las URLs válidas (https).
 * En el export real las URLs vienen separadas por ", " (a veces sin espacio).
 */
export function parseImageUrls(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\n]/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u))
    .filter((u, i, arr) => arr.indexOf(u) === i);
}

/**
 * Limpia HTML que viene en la descripción larga del proveedor (preserva
 * estructura: <p>, <ul>, <li>, <strong>). Solo desescapa los `\n` literales
 * que añade WooCommerce.
 */
import { cleanDescription as stripDirtyHtml } from "@/lib/products/clean-description";

export function cleanDescription(raw: string): string | null {
  if (!raw) return null;
  // 1) Convierte los \n literales del CSV en saltos reales.
  // 2) Strip los <span data-url="ca://..."> de scraping AI que el editor
  //    de WP había dejado (Edge Copilot / Bing Chat). Detalles en
  //    lib/products/clean-description.ts.
  const s = stripDirtyHtml(raw.replace(/\\n/g, "\n"));
  return s || null;
}

// ---------------------------------------------------------------------------
// Mapeo de fila cruda → modelo intermedio
// ---------------------------------------------------------------------------

type WooRow = Record<string, string>;

function pickStr(row: WooRow, key: string): string {
  const v = row[key];
  return v == null ? "" : String(v).trim();
}

function pickStock(row: WooRow): number {
  const inv = pickStr(row, "Inventario");
  if (!inv) return 0;
  const n = Number(inv.replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function brandFromRow(row: WooRow): string {
  // Prioridad: columna "Marca" → meta yoast primary brand → "Sin Marca"
  const marca = pickStr(row, "Marca");
  if (marca) return titleCaseEs(marca);
  const yoast = pickStr(row, "Meta: _yoast_wpseo_primary_pwb-brand");
  if (yoast && /^[a-zA-Z]/.test(yoast)) return titleCaseEs(yoast);
  return "Sin Marca";
}

function shortNameFromRow(row: WooRow): string | null {
  const desc = pickStr(row, "Descripción corta");
  if (!desc) return null;
  if (desc.length <= 120) return desc;
  const fragment = desc.split(/[.!?\n]/)[0]!.trim();
  return fragment.length > 0 ? fragment.slice(0, 120) : desc.slice(0, 120);
}

function tagsFromRow(row: WooRow): string[] {
  const t = pickStr(row, "Etiquetas");
  if (!t) return [];
  return t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20); // hard cap defensivo
}

function statusFromRow(row: WooRow): "ACTIVE" | "DRAFT" | "INACTIVE" {
  const pub = pickStr(row, "Publicado");
  const vis = pickStr(row, "Visibilidad en el catálogo").toLowerCase();
  if (pub === "1" && (vis.includes("visible") || vis === "")) return "ACTIVE";
  if (pub === "-1") return "INACTIVE";
  return "DRAFT";
}

/**
 * Convierte una fila cruda de WooCommerce (Tipo=variable | simple) a
 * `WooNormalizedParent`.
 */
export function mapWooParentToProduct(
  row: WooRow,
  rowNumber: number,
): WooNormalizedParent {
  const wooId = pickStr(row, "ID");
  const sku = pickStr(row, "SKU");
  const tipo = pickStr(row, "Tipo");
  const isSimple = tipo === "simple" || tipo === "external" || tipo === "grouped";
  const rawName = pickStr(row, "Nombre");
  const cleaned = cleanWooName(rawName);
  const categoriesRaw = pickStr(row, "Categorías");
  const imageUrls = parseImageUrls(pickStr(row, "Imágenes"));

  const retail = parsePrice(pickStr(row, "Precio normal"));
  const sale = parsePrice(pickStr(row, "Precio rebajado"));
  const cost = parsePrice(pickStr(row, "Cost"));
  const weight = parsePrice(pickStr(row, "Peso (kg)"));

  const brand = brandFromRow(row);
  const category = extractLeafCategory(categoriesRaw);
  const colorName = extractColorFromName(rawName);
  const gender = extractGender(rawName, categoriesRaw);
  const modelCode = extractModelCode(rawName, sku);

  return {
    rowNumber,
    wooId,
    sku,
    rawName,
    name: cleaned,
    shortName: shortNameFromRow(row),
    description: cleanDescription(pickStr(row, "Descripción")),
    brand,
    category,
    slugSeed: basicSlug(cleaned),
    modelCode,
    colorName,
    gender,
    retailPrice: retail,
    // salePrice solo si > 0 y < retail (regla del cliente)
    salePrice: sale && retail && sale.gt(0) && sale.lt(retail) ? sale : null,
    costPrice: cost,
    weight: weight,
    tags: tagsFromRow(row),
    mainImageUrl: imageUrls[0] ?? null,
    extraImageUrls: imageUrls.slice(1),
    status: statusFromRow(row),
    externalId: `woocommerce:${wooId}`,
    isSimple,
    stock: pickStock(row),
  };
}

/**
 * Convierte una fila `variation` a `WooNormalizedVariation`.
 *
 * Reglas:
 *   - "Valor(es) del atributo 1" → talla. Si "Atributo por defecto 1" está
 *     relleno con un valor explícito (no `default`), gana sobre el valor.
 *   - SKU del variation suele ser "padreSKU-talla". La columna "Superior"
 *     trae el **SKU** del padre (verificado contra export real de
 *     WooCommerce — no es el wooId del padre). Mantenemos un fallback por
 *     prefijo del SKU.
 *   - El stock del variation va en "Inventario".
 */
export function mapWooVariationToSize(
  row: WooRow,
  rowNumber: number,
  parentSkuByWooId: Map<string, string>,
): WooNormalizedVariation | null {
  const sku = pickStr(row, "SKU");
  if (!sku) return null;

  // "Superior" trae el SKU del padre, NO su woo ID. Lo usamos directamente.
  // Si está vacío o no resuelve, fallback: prefijo del SKU del variation.
  const superiorRaw = pickStr(row, "Superior");
  let parentSku = superiorRaw;
  if (!parentSku) {
    const idx = sku.lastIndexOf("-");
    parentSku = idx > 0 ? sku.slice(0, idx) : sku;
  }
  // Soporte legacy: si alguna vez "Superior" trae un ID numérico de woo,
  // intentamos resolverlo por el mapa.
  if (parentSku && parentSkuByWooId.size > 0) {
    const mapped = parentSkuByWooId.get(parentSku);
    if (mapped) parentSku = mapped;
  }

  // Talla: priorizamos "Valor(es) del atributo 1" (es el valor real).
  // "Atributo por defecto 1" suele ser un duplicado o el default a mostrar.
  let sizeRaw = pickStr(row, "Valor(es) del atributo 1");
  if (!sizeRaw) sizeRaw = pickStr(row, "Atributo por defecto 1");
  // Tomamos solo el primer valor si vinieran varios separados por coma.
  sizeRaw = sizeRaw.split(",")[0]?.trim() ?? "";
  const size = sizeRaw.toUpperCase().replace(/'/g, ".");

  const ean = normalizeEan(pickStr(row, "Meta: _ean") || pickStr(row, "Meta: ean") || sku);

  return {
    rowNumber,
    wooId: pickStr(row, "ID"),
    parentSku,
    sku,
    size,
    ean,
    retailPrice: parsePrice(pickStr(row, "Precio normal")),
    salePrice: parsePrice(pickStr(row, "Precio rebajado")),
    costPrice: parsePrice(pickStr(row, "Cost")),
    stock: pickStock(row),
    imageUrl: parseImageUrls(pickStr(row, "Imágenes"))[0] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Streaming reader
// ---------------------------------------------------------------------------

interface ParseAccumulator {
  parents: Map<string, { parent: WooNormalizedParent; variations: WooNormalizedVariation[] }>;
  /** wooId → sku */
  parentSkuByWooId: Map<string, string>;
  /** variations huérfanas (sin padre conocido al momento de leerlas) */
  orphanVariations: WooNormalizedVariation[];
  errors: { row: number; code: string; message: string }[];
}

/**
 * Parsea el CSV WooCommerce y devuelve TODOS los grupos en memoria. Para
 * 5.000 filas y ~3 MB es perfectamente asumible (decenas de MB en RAM como
 * máximo). Si crece a >100 MB, migrar a un iterador asíncrono real.
 */
export async function parseWooCommerceFile(filePath: string): Promise<{
  groups: WooProductGroup[];
  errors: { row: number; code: string; message: string }[];
  totalRows: number;
}> {
  const acc: ParseAccumulator = {
    parents: new Map(),
    parentSkuByWooId: new Map(),
    orphanVariations: [],
    errors: [],
  };

  let rowIndex = 1; // 1 = header

  await new Promise<void>((resolve, reject) => {
    Papa.parse<WooRow>(createReadStream(filePath) as any, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, "").trim(),
      step: (result) => {
        rowIndex += 1;
        const row = result.data;
        if (!row || typeof row !== "object") return;
        const tipo = pickStr(row, "Tipo");
        try {
          if (tipo === "variable" || tipo === "simple" || tipo === "external" || tipo === "grouped") {
            const parent = mapWooParentToProduct(row, rowIndex);
            // Saltamos filas sin SKU ni Nombre (rotas)
            if (!parent.wooId || (!parent.sku && !parent.name)) {
              acc.errors.push({
                row: rowIndex,
                code: "ROW_EMPTY",
                message: `Fila ${rowIndex} sin ID o nombre, se ignora`,
              });
              return;
            }
            const key = parent.sku || parent.wooId;
            acc.parents.set(key, { parent, variations: [] });
            acc.parentSkuByWooId.set(parent.wooId, key);
          } else if (tipo === "variation") {
            const v = mapWooVariationToSize(row, rowIndex, acc.parentSkuByWooId);
            if (!v) {
              acc.errors.push({
                row: rowIndex,
                code: "VAR_EMPTY",
                message: `Variation fila ${rowIndex} sin SKU, se ignora`,
              });
              return;
            }
            const parentEntry = acc.parents.get(v.parentSku);
            if (parentEntry) {
              parentEntry.variations.push(v);
            } else {
              acc.orphanVariations.push(v);
            }
          }
          // Otros tipos (subscriptions, bookings) los ignoramos silenciosamente.
        } catch (err) {
          acc.errors.push({
            row: rowIndex,
            code: "PARSE",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      },
      complete: () => resolve(),
      error: (err) => reject(err),
    });
  });

  // Segundo pase: las variations huérfanas que ahora sí encuentran padre
  for (const v of acc.orphanVariations) {
    const parentEntry = acc.parents.get(v.parentSku);
    if (parentEntry) {
      parentEntry.variations.push(v);
    } else {
      acc.errors.push({
        row: v.rowNumber,
        code: "ORPHAN_VAR",
        message: `Variation ${v.sku} sin padre conocido (parentSku=${v.parentSku})`,
      });
    }
  }

  const groups: WooProductGroup[] = Array.from(acc.parents.values());

  // Si un padre `variable` no tiene variations, lo dejamos pero registramos warn.
  for (const g of groups) {
    if (!g.parent.isSimple && g.variations.length === 0) {
      acc.errors.push({
        row: g.parent.rowNumber,
        code: "NO_VARIATIONS",
        message: `Producto variable "${g.parent.sku}" sin filas variation`,
      });
    }
  }

  // Si el padre es variable y tiene retailPrice null, lo deducimos del primer variation
  for (const g of groups) {
    if (!g.parent.retailPrice && g.variations[0]?.retailPrice) {
      g.parent.retailPrice = g.variations[0].retailPrice;
      if (
        !g.parent.salePrice &&
        g.variations[0].salePrice &&
        g.parent.retailPrice &&
        g.variations[0].salePrice.lt(g.parent.retailPrice)
      ) {
        g.parent.salePrice = g.variations[0].salePrice;
      }
    }
  }

  return { groups, errors: acc.errors, totalRows: rowIndex - 1 };
}

/**
 * Preview liviano: devuelve las primeras N parents para enseñarlas en UI.
 * Para no parsear todo el CSV cuando solo queremos 10 filas.
 */
export async function previewWooCommerceFile(
  filePath: string,
  limit = 10,
): Promise<WooNormalizedParent[]> {
  const out: WooNormalizedParent[] = [];
  let rowIndex = 1;

  await new Promise<void>((resolve, reject) => {
    let aborted = false;
    Papa.parse<WooRow>(createReadStream(filePath) as any, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.replace(/^﻿/, "").trim(),
      step: (result, parser) => {
        if (aborted) return;
        rowIndex += 1;
        const row = result.data;
        const tipo = pickStr(row, "Tipo");
        if (tipo === "variable" || tipo === "simple") {
          try {
            const parent = mapWooParentToProduct(row, rowIndex);
            if (parent.wooId && (parent.sku || parent.name)) {
              out.push(parent);
              if (out.length >= limit) {
                aborted = true;
                parser.abort();
              }
            }
          } catch {
            /* ignore preview errors */
          }
        }
      },
      complete: () => resolve(),
      error: (err) => reject(err),
    });
  });

  return out;
}
