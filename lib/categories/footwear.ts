/**
 * Clasificador de TIPO DE CALZADO. Fuente única usada por:
 *   · scripts/migrate-footweartype.ts (auto-mapeo masivo)
 *   · app/admin/productos/[id] (selector en ProductEditor + acción bulk)
 *   · lib/public-queries.ts / lib/products (validación del filtro público)
 *
 * 3 pasadas en orden (la primera que casa gana):
 *   1. sportUse explícito  (futureproof; hoy cobertura 0% — el campo está vacío)
 *   2. name keywords       (cobertura ~31,5%)
 *   3. marca+modelo lookup  (7 reglas aprobadas con evidencia, ~+18% sin solape)
 *   Si nada casa → null (etiquetado manual desde admin).
 *
 * Solo aplica a productos de FAMILIA CALZADO (Category.slug LIKE '%-calzado').
 */

export const FOOTWEAR_TYPES = [
  "running", "trail", "tenis", "padel", "casual",
  "baloncesto", "futbol", "futbol_sala", "chanclas",
] as const;

export type FootwearType = (typeof FOOTWEAR_TYPES)[number];

export const FOOTWEAR_TYPE_LABELS: Record<FootwearType, string> = {
  running: "Running",
  trail: "Trail / Montaña",
  tenis: "Tenis",
  padel: "Pádel",
  casual: "Casual / Lifestyle",
  baloncesto: "Baloncesto",
  futbol: "Fútbol",
  futbol_sala: "Fútbol sala",
  chanclas: "Chanclas",
};

/** MAYÚSCULAS + sin tildes/diacríticos. */
function norm(s: string | null | undefined): string {
  return (s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface InferInput {
  name: string;
  sportUse: string | null;
  brand: string | null;
}

// --- Pasada 1 — sportUse (futureproof) -------------------------------------
// Orden importa: futbol_sala ANTES que futbol.
export function matchBySportUse(sportUse: string | null): FootwearType | null {
  const s = norm(sportUse);
  if (!s) return null;
  if (/RUNNING|JOGGIN|JOGGING/.test(s)) return "running";
  if (/TRAIL|MONTANISMO|TREKKING|MONTANA|SENDERISMO/.test(s)) return "trail";
  if (/TENIS/.test(s)) return "tenis";
  if (/PADEL/.test(s)) return "padel";
  if (/URBAN|CASUAL|LIFESTYLE|MODA/.test(s)) return "casual";
  if (/BALONCESTO|BASKET/.test(s)) return "baloncesto";
  if (/FUTBOL SALA|FUTSAL|\bSALA\b/.test(s)) return "futbol_sala";
  if (/FUTBOL/.test(s)) return "futbol";
  if (/CHANCLA|SANDALIA/.test(s)) return "chanclas";
  return null;
}

// --- Pasada 2 — name keywords (word-boundary) ------------------------------
// Precedencia: chanclas > baloncesto > futbol_sala > running > trail > tenis >
// padel > casual > futbol. (Mismo orden que la verificación de cobertura.)
export function matchByName(name: string): FootwearType | null {
  const n = norm(name);
  if (/\b(CHANCLA|CHANCLAS|SANDALIA|SANDALIAS)\b/.test(n)) return "chanclas";
  if (/\b(BASKET|BALONCESTO)\b/.test(n)) return "baloncesto";
  if (/\b(SALA|INDOOR|FUTSAL|FS)\b/.test(n)) return "futbol_sala";
  if (/\b(RUNNING|RUN|JOGGING|JOGGIN)\b/.test(n)) return "running";
  if (/\b(TRAIL|TREKKING|TREK|MONTANA|SENDER|GTX|GORETEX)\b/.test(n)) return "trail";
  if (/\bTENIS\b/.test(n)) return "tenis";
  if (/\bPADEL\b/.test(n)) return "padel";
  if (/\b(URBAN|CASUAL|LIFESTYLE|MODA|SNEAKER|WALKING|MUSTANG)\b/.test(n)) return "casual";
  if (/\b(BOTA|BOTAS|FG|AG)\b/.test(n)) return "futbol";
  return null;
}

// --- Pasada 3 — marca + modelo (7 reglas aprobadas con evidencia) ----------
// 0 falsos positivos: solo reglas verificadas. Los grupos ambiguos quedan NULL.
export function matchByBrandModel(name: string, brand: string | null): FootwearType | null {
  const b = norm(brand);
  const n = norm(name);
  if (!b) return null;
  // Marca completa: +8000 = montaña/trekking (19/19 verificados, sin outliers).
  if (b.includes("8000")) return "trail";
  // Marca + línea de modelo.
  if (b.includes("MIZUNO") && /\b(WAVE|NEO)\b/.test(n)) return "running";
  if (b.includes("PUMA") && /\b(FUTURE|ULTRA)\b/.test(n)) return "futbol";
  if (b.includes("ASICS") && /\bPATRIOT\b/.test(n)) return "running";
  if (b.includes("BABOLAT") && /\bJET\b/.test(n)) return "tenis";
  return null;
}

/** Infiere el tipo de calzado en 3 pasadas. null = sin clasificar (manual). */
export function inferFootwearType(input: InferInput): FootwearType | null {
  return (
    matchBySportUse(input.sportUse) ??
    matchByName(input.name) ??
    matchByBrandModel(input.name, input.brand)
  );
}
