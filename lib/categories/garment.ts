/**
 * Clasificador de TIPO DE PRENDA (textil). Fuente única usada por:
 *   · scripts/migrate-garmenttype.ts (auto-mapeo masivo)
 *   · app/admin/productos/[id] (selector en ProductEditor + acción bulk)
 *   · lib/public-queries.ts / lib/products (validación del filtro público)
 *
 * 4 pasadas en orden (la primera que casa gana):
 *   0. token override   → tokens que SIEMPRE ganan a la categoría (vestido/chaleco
 *                         viven dentro de categorías que P1 etiquetaría como otra cosa).
 *   1. categoría antigua → mapeo por Product.categoryId (slug), categorías "puras".
 *   2. token genérico    → primer término del name (patrón TIPO·MARCA·MODELO·COLOR).
 *   3. fuzzy (opcional)  → token en CUALQUIER posición del name; baja confianza
 *                         (el script lo marca low_confidence en el CSV para revisión).
 *   Si nada casa → null (etiquetado manual desde admin).
 *
 * Solo aplica a productos de FAMILIA TEXTIL (vinculados por m2m a un nodo *-textil).
 * Diseño y cobertura validada: docs/BLOCK-6-PLAN.md (§6, §7).
 */

export const GARMENT_TYPES = [
  "camiseta", "sudadera", "chaqueta", "abrigo", "cortavientos",
  "chandal", "conjunto", "pantalon", "bermuda", "mallas",
  "banador", "falda", "calentador", "vestido", "chaleco",
] as const;

export type GarmentType = (typeof GARMENT_TYPES)[number];

export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  camiseta: "Camisetas y polos",
  sudadera: "Sudaderas y polares",
  chaqueta: "Chaquetas",
  abrigo: "Abrigos",
  cortavientos: "Cortavientos",
  chandal: "Chándales",
  conjunto: "Conjuntos",
  pantalon: "Pantalones",
  bermuda: "Bermudas y shorts",
  mallas: "Mallas y leggings",
  banador: "Bañadores",
  falda: "Faldas",
  calentador: "Calentadores",
  vestido: "Vestidos",
  chaleco: "Chalecos",
};

/** MAYÚSCULAS + sin tildes/diacríticos (Ñ→N, Á→A, …). */
function norm(s: string | null | undefined): string {
  return (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Primer término del nombre, normalizado y reducido a alfanumérico (K-WAY→KWAY). */
function firstToken(name: string): string {
  const first = norm(name).trim().split(/\s+/)[0] ?? "";
  return first.replace(/[^A-Z0-9]/g, "");
}

/** Todas las palabras del nombre, normalizadas y alfanuméricas (para la pasada fuzzy). */
function normWords(name: string): string[] {
  return norm(name)
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
}

// --- Pasada 1 — mapeo por categoryId ANTIGUO (categorías "puras") ----------
const CATEGORY_MAP: Record<string, GarmentType> = {
  camisetas: "camiseta",
  sudaderas: "sudadera",
  chandal: "chandal",
  abrigos: "abrigo",
  cortavientos: "cortavientos",
  conjuntos: "conjunto",
  pantalones: "pantalon",
  mallas: "mallas",
  banador: "banador",
  banadores: "banador",
  faldas: "falda",
  "pantalon-corto": "bermuda",
};

// --- Pasada 2 — token (primer término del name) ----------------------------
// Cada token mapea a un único tipo (match exacto, sin precedencia).
const TOKEN_ENTRIES: [string[], GarmentType][] = [
  [["BERMUDA", "BERMUDAS"], "bermuda"],
  [["CALENTADOR", "CALENTADORES"], "calentador"],
  [["CHAQUETA", "CHAQUETAS"], "chaqueta"],
  [["CAMISETA", "CAMISETAS", "POLO"], "camiseta"],
  [["LEGGING", "LEGGINGS", "MALLA", "MALLAS"], "mallas"],
  [["CHANDAL"], "chandal"],
  [["ABRIGO", "ABRIGOS", "PARKA", "PLUMIFERO"], "abrigo"],
  [["BANADOR", "BANADORES"], "banador"],
  [["CHUBASQUERO", "CORTAVIENTOS", "KWAY"], "cortavientos"],
  [["FALDA", "FALDAS"], "falda"],
  [["SUDADERA", "SUDADERAS", "FORRO", "POLAR"], "sudadera"],
  [["PANTALON", "PANTALONES"], "pantalon"],
  [["SHORT", "SHORTS"], "bermuda"],
  [["CONJUNTO", "CONJUNTOS", "SET"], "conjunto"],
  [["ANORAK", "ANORAKS"], "abrigo"],            // A3
  [["TOP", "TOPS"], "camiseta"],                // A3
  [["SOFT", "SOFTSHELL"], "chaqueta"],          // A3 (SOFT-SHELL→SOFTSHELL tras strip)
  [["VESTIDO", "VESTIDOS"], "vestido"],         // A3 + override (P0)
  [["CHALECO", "CHALECOS"], "chaleco"],         // A3 + override (P0)
];
const TOKEN_MAP = new Map<string, GarmentType>();
for (const [toks, g] of TOKEN_ENTRIES) for (const t of toks) TOKEN_MAP.set(t, g);

// --- Pasada 0 — token override ---------------------------------------------
// Tokens que ganan a P1 (categoría). vestido/chaleco viven dentro de categorías
// (p.ej. "mujer", "abrigos") que P1 etiquetaría como otra prenda.
const TOKEN_OVERRIDE = new Set(["VESTIDO", "VESTIDOS", "CHALECO", "CHALECOS"]);

export function matchByTokenOverride(name: string): GarmentType | null {
  const tok = firstToken(name);
  return TOKEN_OVERRIDE.has(tok) ? TOKEN_MAP.get(tok) ?? null : null;
}

export function matchByCategory(categorySlug: string | null | undefined): GarmentType | null {
  if (!categorySlug) return null;
  return CATEGORY_MAP[categorySlug] ?? null;
}

export function matchByToken(name: string): GarmentType | null {
  return TOKEN_MAP.get(firstToken(name)) ?? null;
}

/** Pasada 3 (fuzzy): primer token reconocido en CUALQUIER posición. Baja confianza. */
export function matchByFuzzy(name: string): GarmentType | null {
  for (const w of normWords(name)) {
    const g = TOKEN_MAP.get(w);
    if (g) return g;
  }
  return null;
}

export interface InferGarmentInput {
  /** slug de la categoría ANTIGUA del producto (Product.categoryId → Category.slug). */
  categorySlug: string | null | undefined;
  name: string;
}

/** Infiere el tipo de prenda en 4 pasadas. null = sin clasificar (manual). */
export function inferGarmentType(input: InferGarmentInput): GarmentType | null {
  return (
    matchByTokenOverride(input.name) ??
    matchByCategory(input.categorySlug) ??
    matchByToken(input.name) ??
    matchByFuzzy(input.name)
  );
}

// ---------------------------------------------------------------------------
// Variante fina de prenda (Bloque 6 §18 Fase 3.5)
// ---------------------------------------------------------------------------

export const GARMENT_VARIANTS = [
  "manga_corta", "manga_larga", "top", "tirantes",
  "pantalon_corto", "pantalon_largo",
  "mallas_cortas", "mallas_largas", "mallas_piratas",
] as const;

export type GarmentVariant = (typeof GARMENT_VARIANTS)[number];

export const GARMENT_VARIANT_LABELS: Record<GarmentVariant, string> = {
  manga_corta: "Manga corta",
  manga_larga: "Manga larga",
  top: "Top",
  tirantes: "Tirantes",
  pantalon_corto: "Pantalón corto",
  pantalon_largo: "Pantalón largo",
  mallas_cortas: "Mallas cortas",
  mallas_largas: "Mallas largas",
  mallas_piratas: "Mallas piratas",
};

/**
 * Mapeo variante → garmentType esperado. La variante SOLO aplica si el garmentType
 * del producto coincide con esta familia. Sirve además para inferir el filtro de
 * prenda cuando el público marca solo una variante (?variante= sin ?prenda=).
 */
export const VARIANT_TO_TYPE: Record<GarmentVariant, "camiseta" | "pantalon" | "mallas"> = {
  manga_corta: "camiseta",
  manga_larga: "camiseta",
  top: "camiseta",
  tirantes: "camiseta",
  pantalon_corto: "pantalon",
  pantalon_largo: "pantalon",
  mallas_cortas: "mallas",
  mallas_largas: "mallas",
  mallas_piratas: "mallas",
};

/** garmentTypes que admiten variante fina (fuera de estos, inferGarmentVariant → null). */
export const TYPES_WITH_VARIANT = ["camiseta", "pantalon", "mallas"] as const;

/** Normaliza para el parser de variante: MAYÚS + sin diacríticos, CONSERVA espacios/símbolos. */
function normName(s: string): string {
  return s
    .replace(/[áàäâ]/gi, "a")
    .replace(/[éèëê]/gi, "e")
    .replace(/[íìïî]/gi, "i")
    .replace(/[óòöô]/gi, "o")
    .replace(/[úùü]/gi, "u")
    .replace(/ñ/gi, "n")
    .toUpperCase();
}

/**
 * Infiere la variante fina por tokens del nombre. SOLO aplica si garmentType ∈
 * {camiseta, pantalon, mallas}; fuera de esos tipos (o sin garmentType) → null.
 * Parser base (Bloque 6 §18); ampliable con sinónimos vistos en el dry-run (3.5.3).
 */
export function inferGarmentVariant(
  name: string,
  garmentType: string | null | undefined,
): GarmentVariant | null {
  if (!garmentType) return null;
  const n = normName(name);

  if (garmentType === "camiseta") {
    if (/\bMANGA[S]?\s+CORTA[S]?\b/.test(n) || /\bM\.?\s*CORTA[S]?\b/.test(n)) return "manga_corta";
    if (/\bMANGA[S]?\s+LARGA[S]?\b/.test(n) || /\bM\.?\s*LARGA[S]?\b/.test(n)) return "manga_larga";
    if (/\bTOP\b/.test(n)) return "top";
    if (/\bTIRANTES?\b/.test(n) || /\bSIN\s+MANGAS?\b/.test(n)) return "tirantes";
    // Heurística (3.5.3): POLO sin otro token → manga corta (los polos deportivos
    // son manga corta por convención).
    if (/\bPOLO[S]?\b/.test(n)) return "manga_corta";
    return null;
  }

  if (garmentType === "pantalon") {
    if (/\bPANTALON\s+CORTO[S]?\b/.test(n) || /\bPANT\.?\s+CORTO[S]?\b/.test(n) || /\bSHORT[S]?\b/.test(n)) return "pantalon_corto";
    if (/\bPANTALON\s+LARGO[S]?\b/.test(n) || /\bPANT\.?\s+LARGO[S]?\b/.test(n)) return "pantalon_largo";
    // Heurística (3.5.3): pantalon SIN token de longitud → pantalon_largo por
    // defecto. Exclusión: si fuera corto estaría en garmentType=bermuda (P1
    // categoría pantalon-corto) o el nombre diría "CORTO".
    return "pantalon_largo";
  }

  if (garmentType === "mallas") {
    if (/\b(PIRATA[S]?|CAPRI|3\/4)\b/.test(n)) return "mallas_piratas";
    if (/\bMALLA[S]?\s+CORTA[S]?\b/.test(n)) return "mallas_cortas";
    if (/\bMALLA[S]?\s+LARGA[S]?\b/.test(n) || /\bLEGGING[S]?\b/.test(n)) return "mallas_largas";
    return null;
  }

  return null;
}
