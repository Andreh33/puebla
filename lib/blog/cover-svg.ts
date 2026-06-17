/**
 * Generador de portadas SVG de marca para el blog de Zona Sport.
 *
 * No tenemos generador de imágenes IA: las portadas son SVG gráficos limpios
 * con la identidad de Zona Sport (fondo azul oscuro `#0b1640`/`#14225b`,
 * detalles en amarillo `#c8da46` y un acento por categoría). El título se
 * envuelve a mano en 2-3 líneas y se escapa para XML válido.
 *
 * `generateCoverSvg` devuelve un string SVG 1200×630 puro (sin dependencias).
 * Se escribe a `public/blog-covers/<slug>.svg` desde
 * `scripts/generate-blog-covers.ts`.
 */

// Paleta de marca (tokens reales de app/globals.css)
const ZS_BLUE_950 = "#0b1640"; // fondo (abajo)
const ZS_BLUE_900 = "#14225b"; // fondo (arriba)
const ZS_TENNIS = "#c8da46"; // amarillo Zona Sport
const ZS_WHITE = "#ffffff";

const WIDTH = 1200;
const HEIGHT = 630;

export interface CoverSvgOptions {
  /** Título del post (se envuelve a 2-3 líneas). */
  title: string;
  /** Color de acento por categoría (hex). Por defecto, amarillo de marca. */
  accent?: string;
  /** Kicker pequeño superior. Por defecto, "ZONA SPORT · BLOG". */
  kicker?: string;
}

/**
 * Escapa los caracteres reservados de XML para incrustar texto en SVG sin
 * romper el documento (`&`, `<`, `>`, comillas).
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Envuelve un título en como máximo `maxLines` líneas sin partir palabras,
 * apuntando a ~`maxChars` caracteres por línea. Si no cabe, recorta la última
 * línea con elipsis para no desbordar la portada.
 */
export function wrapTitle(title: string, maxChars = 18, maxLines = 3): string[] {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    // Si la línea actual ya está en el límite de líneas, todo lo que quede se
    // acumula en la última (se recorta luego con elipsis si hace falta).
    const atLastLine = lines.length === maxLines - 1;
    const candidate = current ? `${current} ${word}` : word;
    if (current === "" || candidate.length <= maxChars || atLastLine) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  // Si la última línea quedó demasiado larga (título larguísimo), recórtala.
  const last = lines[lines.length - 1];
  if (last && last.length > maxChars + 6) {
    lines[lines.length - 1] = `${last.slice(0, maxChars + 3).trimEnd()}…`;
  }

  return lines;
}

/**
 * Tamaño de fuente del título adaptado al número de líneas para que las
 * portadas con títulos largos no se salgan del lienzo.
 */
function titleFontSize(lineCount: number): number {
  if (lineCount <= 1) return 96;
  if (lineCount === 2) return 84;
  return 72;
}

export function generateCoverSvg(opts: CoverSvgOptions): string {
  const accent = (opts.accent ?? ZS_TENNIS).trim() || ZS_TENNIS;
  const kicker = (opts.kicker ?? "ZONA SPORT · BLOG").trim();
  const lines = wrapTitle(opts.title);
  const fontSize = titleFontSize(lines.length);
  const lineHeight = Math.round(fontSize * 1.06);

  // Bloque de título centrado verticalmente en torno a y=355.
  const totalTextHeight = (lines.length - 1) * lineHeight;
  const firstBaseline = 355 - totalTextHeight / 2 + fontSize / 3;

  const titleTspans = lines
    .map((line, i) => {
      const y = Math.round(firstBaseline + i * lineHeight);
      return `<text x="90" y="${y}" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="${fontSize}" font-weight="900" fill="${ZS_WHITE}" letter-spacing="-2">${escapeXml(line)}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(opts.title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.2" y2="1">
      <stop offset="0" stop-color="${ZS_BLUE_900}"/>
      <stop offset="1" stop-color="${ZS_BLUE_950}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1040" cy="150" r="240" fill="${accent}" opacity="0.16"/>
  <circle cx="1110" cy="120" r="120" fill="${accent}" opacity="0.22"/>
  <g opacity="0.5" stroke="${accent}" stroke-width="2" fill="none">
    <path d="M -40 470 Q 260 380 560 460 T 1240 450"/>
    <path d="M -40 530 Q 260 440 560 520 T 1240 510" opacity="0.55"/>
  </g>
  <rect x="90" y="120" width="64" height="8" rx="4" fill="${accent}"/>
  <text x="170" y="129" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="22" font-weight="700" fill="${accent}" letter-spacing="5" dominant-baseline="middle">${escapeXml(kicker.toUpperCase())}</text>
  ${titleTspans}
  <g transform="translate(90 560)">
    <rect x="0" y="-26" width="14" height="38" rx="3" fill="${ZS_TENNIS}"/>
    <text x="28" y="0" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="26" font-weight="800" fill="${ZS_WHITE}" dominant-baseline="middle">ZONA SPORT</text>
    <text x="232" y="0" font-family="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="22" font-weight="500" fill="${ZS_WHITE}" opacity="0.7" dominant-baseline="middle">· Puebla de la Calzada</text>
  </g>
</svg>
`;
}
