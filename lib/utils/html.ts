/**
 * Helpers para HTML del catálogo:
 *
 *  - `stripHtml(input)` → quita todos los tags y devuelve texto plano.
 *    Útil para tarjetas, previews, OG descriptions, name del producto
 *    cuando el feed lo dejó contaminado con `<strong>` o spans de
 *    scraping AI.
 *
 *  - `sanitizeHtml(input)` → preserva solo tags semánticos seguros
 *    (ul, ol, li, p, br, strong, em, b, i, h2…h6, a) y descarta
 *    cualquier otro tag/attr. Usado en la ficha pública del producto
 *    con `dangerouslySetInnerHTML` para mostrar listas con negritas
 *    sin riesgo XSS.
 *
 * NO usamos DOMPurify para evitar dependencia: el contenido viene de
 * importaciones internas que el admin controla y el catálogo es
 * confianza moderada. El allowlist + regex bastan para nuestro caso.
 */

const SAFE_TAGS = new Set([
  "ul",
  "ol",
  "li",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "span",
]);

// Atributos permitidos por tag. Cualquier otro se borra.
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  // El resto: ningún atributo permitido (los queremos limpios).
};

export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  // 1) Strip todo entre `<` y `>` (tags completos).
  let out = input.replace(/<[^>]*>/g, " ");
  // 2) Strip tags TRUNCADOS sin `>` de cierre. Causa: el feed truncó el
  //    nombre/short a N chars cortando en medio de `<span tabindex="0"
  //    role="button" data-url="ca://s` — sin `>` el regex anterior no
  //    lo pilla. Solo aplica si tras `<` viene `/` o letra (tag real),
  //    no toca "precio < 50".
  out = out.replace(/<\/?[a-z][^>]*$/i, "");
  // 3) Decode entidades comunes. &amp; al final por si venía doblemente
  //    escapado (&amp;amp; → &amp; → &).
  out = out
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&hellip;/gi, "…")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/gi, "&");
  // 4) Colapsa espacios.
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Decodifica entidades HTML en un texto plano (sin tocar tags). Útil para
 * campos como Brand.name = "Go&amp;win" → "Go&win".
 */
export function decodeEntities(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&hellip;/gi, "…")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/gi, "&")
    .trim();
}

/**
 * Decodifica entidades (numricas hex/decimal + comunes) y quita espacios y
 * caracteres de control de un valor de `href` para validarlo SIN que un
 * atacante pueda esconder `javascript:` como `jav&#x09;ascript:`.
 */
function normalizeHref(val: string): string {
  return val
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/[\s\u0000-\u001f\u007f]/g, "")
    .toLowerCase();
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  let out = input;
  // Bucle de saneado hasta PUNTO FIJO: un solo pase es evadible por
  // anidamiento (`<scr<script>ipt>` se reconstituye en `<script>` al quitar
  // el interior). Repetimos hasta que el string deja de cambiar (con guarda
  // anti-bucle) para neutralizar tags reconstruidos.
  let prev = "";
  let guard = 0;
  do {
    prev = out;
    // 1) Elementos peligrosos con su contenido (si tienen cierre).
    out = out
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
      .replace(/<iframe\b[\s\S]*?<\/iframe\s*>/gi, "")
      .replace(/<object\b[\s\S]*?<\/object\s*>/gi, "");
    // 2) Aperturas/cierres de tags peligrosos aunque estn truncados o sin
    //    cierre (`<script>alert(1)` sin `</script>` → quita el opener).
    out = out.replace(/<\s*\/?\s*(script|style|iframe|object|embed|link|meta|base|form|svg|math)\b[^>]*>?/gi, "");
    // 3) Atributos de evento `onfoo=...`.
    out = out
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
    // 4) Atraviesa tags restantes y aplica allowlist SAFE_TAGS/SAFE_ATTRS.
    out = out.replace(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (full, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!SAFE_TAGS.has(tag)) return ""; // descarta tags no allowlisted
      const isClose = /^<\s*\//.test(full);
      if (isClose) return `</${tag}>`;
      const allowed = SAFE_ATTRS[tag] ?? new Set<string>();
      const cleanAttrs = (attrs.match(/\s+([a-zA-Z\-:]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g) ?? [])
        .map((m) => {
          const eqIdx = m.indexOf("=");
          const key = m.slice(0, eqIdx).trim().toLowerCase();
          const valRaw = m.slice(eqIdx + 1).trim();
          const val = valRaw.replace(/^["']|["']$/g, "");
          if (!allowed.has(key)) return "";
          // href: ALLOWLIST de esquemas (no blocklist). Decodificamos
          // entidades y quitamos controles antes de validar, de modo que
          // `jav&#x09;ascript:` no pueda colarse. Solo http(s), rutas,
          // anclas, mailto y tel.
          if (key === "href") {
            const decoded = normalizeHref(val);
            if (!/^(https?:\/\/|\/|#|mailto:|tel:)/.test(decoded)) return "";
          }
          return ` ${key}="${val.replace(/"/g, "&quot;")}"`;
        })
        .filter(Boolean)
        .join("");
      return `<${tag}${cleanAttrs}>`;
    });
  } while (out !== prev && guard++ < 8);

  // 5) Strip span vacíos (residuos del cleaning AI scraper).
  out = out.replace(/<span\s*>\s*<\/span>/gi, "");

  // 6) Normaliza espacios pero respeta saltos significativos.
  out = out.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n");

  return out.trim();
}

/**
 * Versión defensiva para textos cortos como el `name` del producto:
 * fuerza strip y limita longitud (UI estable aunque el feed mande basura).
 */
export function cleanProductName(
  input: string | null | undefined,
  maxLength = 200,
): string {
  const stripped = stripHtml(input);
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength - 1).trimEnd() + "…";
}
