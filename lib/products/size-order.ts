const naturalSizeCollator = new Intl.Collator("es", {
  numeric: true,
  sensitivity: "base",
});

const NAMED_SIZE_RANKS = new Map<string, number>([
  ["XXS", 10],
  ["XS", 20],
  ["S", 30],
  ["S/M", 35],
  ["M", 40],
  ["M/L", 45],
  ["L", 50],
  ["L/XL", 55],
  ["XL", 60],
]);

type SizeKey =
  | { group: 0; value: number; normalized: string }
  | { group: 1; value: number; normalized: string }
  | { group: 2; value: 0; normalized: string }
  | { group: 3; value: 0; normalized: string };

function normalizeSize(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function namedSizeRank(normalized: string): number | null {
  const compact = normalized.replace(/\s/g, "");
  const direct = NAMED_SIZE_RANKS.get(compact);
  if (direct != null) return direct;

  const numberedXl = compact.match(/^(\d+)XL$/);
  if (numberedXl) return 60 + (Number(numberedXl[1]) - 1) * 10;

  const repeatedXl = compact.match(/^(X{2,})L$/);
  if (repeatedXl) return 60 + (repeatedXl[1]!.length - 1) * 10;

  return null;
}

function numericSizeValue(normalized: string): number | null {
  const decimalNormalized = normalized
    .replace(",", ".")
    .replace("⅓", " 1/3")
    .replace("⅔", " 2/3")
    .replace("½", " 1/2");
  const match = decimalNormalized.match(/^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+))?/);
  if (!match) return null;

  const whole = Number(match[1]);
  const numerator = match[2] ? Number(match[2]) : 0;
  const denominator = match[3] ? Number(match[3]) : 1;
  const value = whole + (denominator > 0 ? numerator / denominator : 0);
  return Number.isFinite(value) ? value : null;
}

function sizeKey(value: string): SizeKey {
  const normalized = normalizeSize(value);
  const namedRank = namedSizeRank(normalized);
  if (namedRank != null) return { group: 1, value: namedRank, normalized };

  const numericValue = numericSizeValue(normalized);
  if (numericValue != null) return { group: 0, value: numericValue, normalized };

  if (normalized === "ÚNICA" || normalized === "UNICA" || normalized === "U") {
    return { group: 3, value: 0, normalized };
  }

  return { group: 2, value: 0, normalized };
}

/**
 * Orden comercial de tallas: números de menor a mayor (incluye decimales y
 * fracciones), después la escala textil XXS→XS→S→M→L→XL→2XL…, otros valores
 * en orden natural y, por último, talla única.
 */
export function compareProductSizes(a: string, b: string): number {
  const left = sizeKey(a);
  const right = sizeKey(b);
  if (left.group !== right.group) return left.group - right.group;
  if (left.value !== right.value) return left.value - right.value;
  return naturalSizeCollator.compare(left.normalized, right.normalized);
}

export function sortSizeFacets<T extends { value: string }>(sizes: readonly T[]): T[] {
  return [...sizes].sort((a, b) => compareProductSizes(a.value, b.value));
}
