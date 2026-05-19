import slugify from "slugify";

const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "y",
  "o",
  "a",
  "para",
  "con",
  "en",
]);

/**
 * Genera un slug SEO-friendly:
 * - lowercase
 * - sin acentos
 * - guiones como separador
 * - elimina stopwords castellanas si el resultado sigue siendo legible (>=2 palabras)
 */
export function slugifyEs(input: string, opts: { keepStopwords?: boolean } = {}): string {
  const base = slugify(input, {
    lower: true,
    strict: true,
    locale: "es",
    trim: true,
  });
  if (opts.keepStopwords) return base;

  const parts = base.split("-").filter(Boolean);
  const filtered = parts.filter((p) => !STOPWORDS.has(p));
  if (filtered.length >= 2) return filtered.join("-");
  return base;
}

/**
 * Asegura unicidad añadiendo sufijo numérico si ya existe.
 * `exists` debe devolver true si el slug está ocupado.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${i}`;
    i += 1;
    if (i > 1000) throw new Error(`No se pudo encontrar slug único para "${base}"`);
  }
  return candidate;
}
