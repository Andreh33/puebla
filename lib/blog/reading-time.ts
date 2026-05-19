/**
 * Cálculo simple de tiempo de lectura en minutos.
 * Asume 220 palabras/min (lectura cómoda en castellano).
 */
export function readingTimeMinutes(markdown: string): number {
  const text = markdown
    // Elimina bloques de código
    .replace(/```[\s\S]*?```/g, "")
    // Elimina imágenes
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Elimina enlaces dejando el texto
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Elimina otros símbolos de markdown
    .replace(/[#>*_`~|-]+/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Extrae headings (## y ###) del markdown para el TOC.
 */
export type Heading = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split("\n");
  const result: Heading[] = [];
  let inCode = false;
  const seen = new Map<string, number>();

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m || !m[1] || !m[2]) continue;
    const level = (m[1].length === 2 ? 2 : 3) as 2 | 3;
    const text = m[2].replace(/[*_`]/g, "").trim();
    const baseId = slugifyHeading(text);
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    result.push({ id, text, level });
  }
  return result;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
