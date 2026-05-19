/**
 * Limpieza de HTML basura en descripciones de producto.
 *
 * Causa raíz: el CSV de WooCommerce importado venía con artefactos de
 * scraping AI (Edge Copilot / Bing Chat) que dejan spans con
 * `data-url="ca://s?q=..."`, `role="button"` y `tabindex="0"`. Esos spans
 * envuelven palabras clave pero no aportan navegación útil — solo
 * ensucian la descripción.
 *
 * Esta función:
 *  - Elimina los <span> sospechosos preservando su texto interior.
 *  - Mantiene estructura HTML válida (ul/li/strong/p/etc.).
 *  - Decodifica entidades HTML comunes.
 *  - Colapsa espacios y restaura saltos entre bloques.
 */

const SUSPECT_SPAN = /<span\b[^>]*\b(?:data-url\s*=|role\s*=\s*"button"|tabindex\s*=\s*"0")[^>]*>([\s\S]*?)<\/span>/gi;
const NESTED_SPAN_LIMIT = 4; // re-pasamos hasta 4 veces por si hay anidados

export function cleanDescription(html: string | null | undefined): string {
  if (!html) return "";
  let cleaned = html;

  // 1) Strip los <span> de scraping AI. Aplicamos varias veces porque
  //    Bing Chat anida ocasionalmente spans dentro de spans.
  for (let i = 0; i < NESTED_SPAN_LIMIT; i++) {
    const before = cleaned;
    cleaned = cleaned.replace(SUSPECT_SPAN, "$1");
    if (cleaned === before) break;
  }

  // 2) Elimina atributos huérfanos (tabindex/role/data-url) que hubieran
  //    quedado en otros tags después de la primera pasada.
  cleaned = cleaned.replace(/\s*(?:tabindex|role|data-url)\s*=\s*"[^"]*"/gi, "");

  // 3) Limpia tags vacíos resultantes (<span></span>, <strong></strong>).
  cleaned = cleaned.replace(/<([a-z]+)\b[^>]*>\s*<\/\1>/gi, "");

  // 4) Decodifica entidades HTML mínimas para que el contenido sea legible
  //    si alguien lo guarda como texto plano. (No tocamos &amp;/&lt;/&gt;
  //    porque los queremos preservados como HTML.)
  cleaned = cleaned
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&hellip;/gi, "…");

  // 5) Normaliza espacios en blanco respetando saltos de párrafo.
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Detecta si una descripción contiene el patrón típico de spans basura
 * que justifica re-procesarla. Útil para filtrar productos a limpiar en
 * un cleanup masivo sin pisar descripciones ya editadas a mano.
 */
export function hasDirtySpans(html: string | null | undefined): boolean {
  if (!html) return false;
  return /<span\b[^>]*\b(?:data-url\s*=|role\s*=\s*"button"|tabindex\s*=\s*"0")[^>]*>/i.test(
    html,
  );
}
