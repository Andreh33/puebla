/**
 * scripts/download-category-photos.ts
 *
 * Descarga imágenes libres (Unsplash License — uso comercial sin atribución
 * obligatoria, aunque se recomienda) y las deja en `public/category-photos/`
 * en dos formatos paralelos: `<slug>.jpg` (JPEG q82) y `<slug>.webp` (WebP q82).
 *
 * Uso:
 *   npx tsx scripts/download-category-photos.ts
 *
 * Diseño:
 *  - Cada entrada del catálogo tiene una lista ordenada de IDs Unsplash
 *    (https://images.unsplash.com/photo-<ID>?...). Si el primero falla
 *    intentamos el segundo, y así. Los IDs vienen pre-curados a mano para que
 *    el contenido sea relevante y libre. No requiere API key.
 *  - Si TODAS las opciones fallan, generamos un fallback con sharp:
 *    un gradient corporativo + tipografía con el nombre del slug. NO usamos
 *    fotos planas pobres.
 *  - Todas las imágenes salen a 1600x1200 max (fit "cover"), JPEG q82.
 *
 * Notas legales:
 *  - https://unsplash.com/license — "free to use … for commercial and
 *    noncommercial purposes". Atribución no obligatoria.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "category-photos");

const TARGET_W = 1600;
const TARGET_H = 1200;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const FETCH_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

type CatalogEntry = {
  slug: string;
  /** Texto para el fallback CSS si todas las URLs fallan. */
  label: string;
  caption: string;
  /** IDs Unsplash en orden de preferencia. */
  unsplashIds: string[];
  /** Colores del gradient de fallback. */
  fallback: { from: string; to: string };
};

// IDs Unsplash pre-curados (todos consultables en https://unsplash.com/photos/<id>).
// La URL final es:
//   https://images.unsplash.com/photo-<id>?w=1600&q=82&auto=format&fit=crop
const CATALOG: CatalogEntry[] = [
  {
    slug: "running",
    label: "RUNNING",
    caption: "Corre a tu ritmo",
    unsplashIds: [
      "1571008887538-b36bb32f4571", // runner asfalto
      "1486218119243-13883505764c", // runner en stadium
      "1552674605-db6ffd4facb5", // running shoes asphalt
    ],
    fallback: { from: "#dc2626", to: "#0b1640" },
  },
  {
    slug: "padel",
    label: "PADEL",
    caption: "La pista te espera",
    unsplashIds: [
      "1554068865-24cecd4e34b8", // tennis/padel court
      "1622279457486-62dcc4a431d6", // padel rackets
      "1599058917212-d750089bc07e", // tennis ball court
    ],
    fallback: { from: "#0b1640", to: "#c8da46" },
  },
  {
    slug: "montana",
    label: "MONTANA",
    caption: "Donde acaba el asfalto",
    unsplashIds: [
      "1551632811-561732d1e306", // hiker mountain trail
      "1464822759023-fed622ff2c3b", // mountain trekking
      "1469854523086-cc02fe5d8800", // mountain landscape
    ],
    fallback: { from: "#14225b", to: "#c8da46" },
  },
  {
    slug: "calzado",
    label: "CALZADO",
    caption: "Pisada precisa",
    unsplashIds: [
      "1542291026-7eec264c27ff", // sneaker red
      "1460353581641-37baddab0fa2", // sneakers close-up
      "1600185365926-3a2ce3cdb9eb", // running shoe
    ],
    fallback: { from: "#0b1640", to: "#dc2626" },
  },
  {
    slug: "fitness",
    label: "FITNESS",
    caption: "Entrena duro",
    unsplashIds: [
      "1534438327276-14e5300c3a48", // gym weights
      "1517836357463-d25dfeac3438", // gym dumbbells
      "1581009146145-b5ef050c2e1e", // gym kettlebell
    ],
    fallback: { from: "#0b1640", to: "#14225b" },
  },
  {
    slug: "casual",
    label: "CASUAL",
    caption: "Estilo de calle",
    unsplashIds: [
      "1483985988355-763728e1935b", // urban fashion
      "1490481651871-ab68de25d43d", // street style
      "1539109136881-3be0616acf4b", // urban sneakers
    ],
    fallback: { from: "#c8da46", to: "#0b1640" },
  },
  {
    slug: "tenis",
    label: "TENIS",
    caption: "Set, partido y juego",
    unsplashIds: [
      "1542144582-1ba00456b5e3", // tennis court
      "1622279457486-62dcc4a431d6", // tennis racket on clay
      "1531315396756-905d68d21b56", // tennis ball
    ],
    fallback: { from: "#c8da46", to: "#14225b" },
  },
  {
    slug: "mujer-hero",
    label: "PARA ELLA",
    caption: "Imparable",
    unsplashIds: [
      "1518611012118-696072aa579a", // mujer running
      "1594381898411-846e7d193883", // mujer correr
      "1571902943202-507ec2618e8f", // mujer fitness
    ],
    fallback: { from: "#dc2626", to: "#14225b" },
  },
  {
    slug: "hombre-hero",
    label: "PARA EL",
    caption: "Sin freno",
    unsplashIds: [
      "1552674605-db6ffd4facb5", // hombre running shoes
      "1486218119243-13883505764c", // runner stadium
      "1571008887538-b36bb32f4571", // runner asfalto
    ],
    fallback: { from: "#0b1640", to: "#dc2626" },
  },
  {
    slug: "ninos-hero",
    label: "PARA LOS PEQUES",
    caption: "Que no paren",
    unsplashIds: [
      "1503454537195-1dcabb73ffb9", // niños corriendo
      "1597223557154-721c1cecc4b0", // niños jugando
      "1607582544193-ac5a5f3d5f01", // niños parque
    ],
    fallback: { from: "#c8da46", to: "#dc2626" },
  },
  {
    slug: "tienda-fachada",
    label: "ZONA SPORT",
    caption: "C. Silos 3 · Puebla de la Calzada",
    unsplashIds: [
      "1567401893414-76b7b1e5a7a5", // sport shop facade
      "1604176354204-9268737828e4", // boutique store
      "1604719312566-0ba2bcb5dcc1", // store facade
    ],
    fallback: { from: "#0b1640", to: "#dc2626" },
  },
  {
    slug: "tienda-interior",
    label: "PASATE A VERNOS",
    caption: "Te asesoramos sin prisa",
    unsplashIds: [
      "1441984904996-e0b6ba687e04", // store interior
      "1556905055-8f358a7a47b2", // boutique interior
      "1601925260368-ae2f83cf8b7f", // sport store interior
    ],
    fallback: { from: "#14225b", to: "#0b1640" },
  },
];

// ---------------------------------------------------------------------------
// Descarga
// ---------------------------------------------------------------------------

function buildUnsplashUrl(id: string): string {
  // `auto=format` permite al CDN servir webp/avif si nuestro UA lo soporta;
  // pasamos por sharp después para normalizar a JPEG.
  return `https://images.unsplash.com/photo-${id}?w=${TARGET_W}&q=85&auto=format&fit=crop`;
}

async function tryFetch(url: string): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ZonaSportBot/1.0; +https://zonasport.es)",
        Accept: "image/*",
      },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 4096) return null; // demasiado pequeño, sospechoso
    return Buffer.from(ab);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Fallback gradient
// ---------------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildFallback(entry: CatalogEntry): Promise<Buffer> {
  const { from, to } = entry.fallback;
  const labelEsc = escapeXml(entry.label);
  const captionEsc = escapeXml(entry.caption);
  // Composición SVG con gradient + tipografía monumental. Sharp lo rasteriza.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${TARGET_W}" height="${TARGET_H}" viewBox="0 0 ${TARGET_W} ${TARGET_H}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="spot" cx="0.25" cy="0.25" r="0.7">
        <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <rect width="100%" height="100%" fill="url(#spot)"/>
    <g font-family="Inter, Arial, sans-serif" fill="#ffffff">
      <text x="80" y="${TARGET_H - 240}" font-size="148" font-weight="900" letter-spacing="-6" opacity="0.96">${labelEsc}</text>
      <text x="84" y="${TARGET_H - 160}" font-size="36" font-weight="600" letter-spacing="3" opacity="0.78">${captionEsc}</text>
      <rect x="80" y="${TARGET_H - 120}" width="240" height="4" fill="#ffffff" opacity="0.7"/>
    </g>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: JPEG_QUALITY }).toBuffer();
}

// ---------------------------------------------------------------------------
// Procesado y escritura
// ---------------------------------------------------------------------------

type Result = { slug: string; status: "ok" | "fallback"; source: string };

async function processEntry(entry: CatalogEntry): Promise<Result> {
  let raw: Buffer | null = null;
  let source = "fallback";
  for (const id of entry.unsplashIds) {
    const url = buildUnsplashUrl(id);
    process.stdout.write(`  · ${entry.slug.padEnd(18)} → unsplash:${id}... `);
    const b = await tryFetch(url);
    if (b) {
      console.log(`OK (${(b.length / 1024).toFixed(0)} KB)`);
      raw = b;
      source = `unsplash:${id}`;
      break;
    }
    console.log("FALLO");
  }

  if (!raw) {
    process.stdout.write(`  · ${entry.slug.padEnd(18)} → fallback gradient... `);
    raw = await buildFallback(entry);
    console.log(`OK (${(raw.length / 1024).toFixed(0)} KB)`);
  }

  // Normalizamos: resize cover a 1600x1200 (recortando si hace falta), JPEG q82
  const jpegPath = path.join(OUT_DIR, `${entry.slug}.jpg`);
  const webpPath = path.join(OUT_DIR, `${entry.slug}.webp`);

  const base = sharp(raw).resize({
    width: TARGET_W,
    height: TARGET_H,
    fit: "cover",
    position: "attention", // sharp elige zona "interesante"
  });

  await base.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpegPath);
  await base.clone().webp({ quality: WEBP_QUALITY }).toFile(webpPath);

  return { slug: entry.slug, status: source.startsWith("unsplash") ? "ok" : "fallback", source };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Category photos — descargando imágenes Unsplash");
  console.log("──────────────────────────────────────────────");
  console.log(`Destino : ${OUT_DIR}`);
  console.log(`Total   : ${CATALOG.length} categorías\n`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: Result[] = [];
  for (const entry of CATALOG) {
    try {
      const r = await processEntry(entry);
      results.push(r);
    } catch (err) {
      console.log(`  ✗ ${entry.slug} — ERROR ${(err as Error).message}`);
      // Si revienta sharp, intentamos al menos un fallback mínimo
      try {
        const buf = await buildFallback(entry);
        await sharp(buf)
          .resize({ width: TARGET_W, height: TARGET_H, fit: "cover" })
          .jpeg({ quality: JPEG_QUALITY })
          .toFile(path.join(OUT_DIR, `${entry.slug}.jpg`));
        await sharp(buf)
          .resize({ width: TARGET_W, height: TARGET_H, fit: "cover" })
          .webp({ quality: WEBP_QUALITY })
          .toFile(path.join(OUT_DIR, `${entry.slug}.webp`));
        results.push({ slug: entry.slug, status: "fallback", source: "fallback" });
      } catch (err2) {
        console.log(`  ✗ ${entry.slug} — FATAL ${(err2 as Error).message}`);
      }
    }
  }

  console.log("\nResumen:");
  const ok = results.filter((r) => r.status === "ok").length;
  const fb = results.filter((r) => r.status === "fallback").length;
  console.log(`  · OK Unsplash : ${ok}`);
  console.log(`  · Fallback    : ${fb}`);
  for (const r of results) {
    console.log(`  · ${r.slug.padEnd(18)} ${r.status === "ok" ? "✓" : "▣"} ${r.source}`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
