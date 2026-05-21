/**
 * Clasificador de productos por NOMBRE → familia (textil / calzado /
 * accesorios:<sub>). Fuente de verdad ÚNICA: lo usan la verificación de
 * cobertura, el script de migración (scripts/migrate-categories.ts) y el
 * importador del PRICAT. Nunca copiar-pegar esta lógica.
 *
 * Por qué por nombre y no por la categoría actual: las categorías de la BD son
 * una mezcla de género (Hombre/Mujer/Infantil/Bebe), deporte (Pádel/Baloncesto)
 * y basura (Ropa/Uncategorized) — no fiables. En cambio el `name` empieza casi
 * siempre por el tipo ("ZAPATILLA…", "SUDADERA…", "BALÓN…").
 *
 * Precedencia (de más a menos específico):
 *   calzado > accesorios:padel > accesorios:mochilas > accesorios:balones >
 *   accesorios:calcetines > accesorios:otros > textil
 *
 * Estrategia en 2 pasadas:
 *   1. Primera palabra normalizada (alta confianza) + reglas especiales
 *      (PACK compuesto, "contiene PADEL", SOFT SHELL).
 *   2. Fallback: escaneo del name completo (para nombres que empiezan por
 *      marca, p.ej. "JOHN SMITH ZAPATILLA…"); gana la familia más específica.
 *   3. Si nada casa → "UNCLASSIFIED" → migration-errors.csv.
 */

export type FamilyResult =
  | "textil"
  | "calzado"
  | "accesorios:padel"
  | "accesorios:mochilas"
  | "accesorios:balones"
  | "accesorios:calcetines"
  | "accesorios:otros"
  | "UNCLASSIFIED";

/** MAYÚSCULAS + sin tildes/diacríticos (Ñ→N). */
export function normalizeName(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Primera palabra, quitando signos iniciales (¡ ¿ " ' ( ) espacios). */
function firstToken(n: string): string {
  return n.replace(/^[¡¿"'()\s]+/, "").trim().split(/\s+/)[0] ?? "";
}

/** Palabras del nombre (solo alfanumérico), para el escaneo de la pasada 2. */
function tokens(n: string): string[] {
  return n.replace(/[^A-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}

const CALZADO = new Set([
  "ZAPATILLA", "ZAPATILLAS", "ZAPATO", "ZAPATOS", "BOTA", "BOTAS", "BOTIN",
  "BOTINES", "CHANCLA", "CHANCLAS", "SANDALIA", "SANDALIAS", "DEPORTIVA",
  "DEPORTIVAS", "BAMBA", "BAMBAS", "SNEAKER", "SNEAKERS",
]);
const ACC_MOCHILAS = new Set(["MOCHILA", "MOCHILAS"]);
const ACC_BALONES = new Set(["BALON", "BALONES"]);
const ACC_CALCETINES = new Set(["CALCETIN", "CALCETINES", "MEDIA", "MEDIAS"]);
// PALA/RAQUETERO/PALETERO/OVERGRIP = pádel. RAQUETA = tenis → va a "otros".
const ACC_PADEL = new Set(["PALA", "RAQUETERO", "PALETERO", "OVERGRIP"]);
const ACC_OTROS = new Set([
  "GORRA", "GORRO", "GUANTE", "GUANTES", "RINONERA", "BOLSA", "BOLSO",
  "BUFANDA", "VISERA", "MUNEQUERA", "TOALLA", "TOALLITA", "BOTELLA", "CINTURON",
  "FUNDA", "GAFAS", "GAFA", "ESPINILLERA", "ESPINILLERAS", "BANDOLERA",
  "BILLETERO", "ESTUCHE", "PLANTILLA", "PLANTILLAS", "ZAPATILLERO",
  "ZAPATILLEROS", "BANDA", "TALONERA", "VENDAS", "OREJERAS", "NASDIL",
  "NASODILATADOR", "PATIN", "PATINES", "RAQUETA", "RAQUETAS",
]);
const TEXTIL = new Set([
  "CHAQUETA", "CHAQUETON", "PANTALON", "PANTALONES", "SUDADERA", "CAMISETA",
  "CAMISETAS", "POLO", "POLOS", "MALLA", "MALLAS", "SHORT", "SHORTS",
  "CHANDAL", "ABRIGO", "ANORAK", "PARKA", "CORTAVIENTOS", "BANADOR",
  "BANADORES", "FALDA", "FALDAS", "JERSEY", "FORRO", "POLAR", "BERMUDA",
  "BERMUDAS", "TOP", "BODY", "PETO", "CHALECO", "BLUSA", "CAMISA", "VESTIDO",
  "LEGGIN", "LEGGINS", "LEGGING", "LEGGINGS", "ROPA", "MONO", "PIJAMA", "SET",
  "CHUBASQUERO", "CHUBSAQUERO", "CONJUNTO", "CONJUNTOS", "CALENTADOR",
  "CALENTADORES", "SUJETADOR", "SHORTY", "SOFTSHELL", "VEST",
]);

// Tokens demasiado ambiguos para el escaneo de la pasada 2 (dan falsos
// positivos en medio del nombre: "TOP FLEX", "DN23122 GRIP GREEN", "MEDIA"…).
// En la pasada 1 (primera palabra) sí son fiables, así que solo se excluyen aquí.
const PASS2_EXCLUDE = new Set(["TOP", "GRIP", "MEDIA", "MEDIAS", "BANDA", "BODY", "MONO"]);

function pass1(n: string): FamilyResult | null {
  const fw = firstToken(n);

  // Orden definitivo: la 1ª palabra como TIPO CONCRETO siempre gana sobre
  // menciones a "padel" en el resto del nombre (evita falsos positivos de
  // marca BULLPADEL o marketing "...OF PADEL").
  // 1. calzado (una zapatilla de pádel es calzado)
  if (CALZADO.has(fw)) return "calzado";
  // 2. padel-gear por primera palabra (PALA/PALETERO/RAQUETERO/OVERGRIP/GRIP)
  if (ACC_PADEL.has(fw) || fw === "GRIP") return "accesorios:padel";
  // 3. mochilas
  if (ACC_MOCHILAS.has(fw)) return "accesorios:mochilas";
  // 4. balones
  if (ACC_BALONES.has(fw)) return "accesorios:balones";
  // 5. calcetines (+ PACK compuesto: el tipo real va en otra palabra)
  if (ACC_CALCETINES.has(fw)) return "accesorios:calcetines";
  if (fw === "PACK") {
    if (/\b(CALCETIN|CALCETINES|MEDIA|MEDIAS)\b/.test(n)) return "accesorios:calcetines";
    if (/\bBALON(ES)?\b/.test(n)) return "accesorios:balones";
    return null; // PACK de otra cosa → pasada 2
  }
  // 6. accesorios:otros
  if (ACC_OTROS.has(fw)) return "accesorios:otros";
  // 7. textil (1ª palabra + SOFT SHELL como frase)
  if (/\bSOFT\s?SHELL\b/.test(n)) return "textil";
  if (TEXTIL.has(fw)) return "textil";
  // 8. REGLA AMBIGÜEDAD: contiene \bPADEL\b (palabra completa) y la 1ª palabra
  //    NO fue un tipo concreto → pádel. El word boundary evita que la marca
  //    BULLPADEL (un solo token) dispare nada; recupera "NOX TOALLITA … PÁDEL".
  if (/\bPADEL\b/.test(n)) return "accesorios:padel";
  return null;
}

function pass2(n: string): FamilyResult | null {
  const ws = tokens(n).filter((w) => !PASS2_EXCLUDE.has(w));
  const has = (set: Set<string>) => ws.some((w) => set.has(w));
  // Orden de prioridad: lo más específico primero.
  if (has(CALZADO)) return "calzado";
  if (has(ACC_PADEL)) return "accesorios:padel";
  if (has(ACC_MOCHILAS)) return "accesorios:mochilas";
  if (has(ACC_BALONES)) return "accesorios:balones";
  if (has(ACC_CALCETINES)) return "accesorios:calcetines";
  if (has(ACC_OTROS)) return "accesorios:otros";
  if (/\bSOFT\s?SHELL\b/.test(n)) return "textil";
  if (has(TEXTIL)) return "textil";
  return null;
}

/** Clasifica un producto por su nombre. Devuelve la familia o "UNCLASSIFIED". */
export function classify(name: string): FamilyResult {
  const n = normalizeName(name);
  return pass1(n) ?? pass2(n) ?? "UNCLASSIFIED";
}

/** ¿Es una familia de accesorios? Útil para la regla "accesorios ignoran género". */
export function isAccesorios(result: FamilyResult): boolean {
  return result.startsWith("accesorios:");
}
