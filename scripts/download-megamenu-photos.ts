/**
 * scripts/download-megamenu-photos.ts
 *
 * Descarga 3 fotos hero específicas para el MegaMenu del Header desktop:
 *   - Mujer: una mujer haciendo deporte (fitness / yoga / cardio)
 *   - Hombre: un hombre practicando deporte (gym / running / outdoor)
 *   - Niños: un niño JUGANDO (fútbol / corriendo / actividades) — inequívoco
 *
 * El motivo: la foto previa en `ninos-hero.{jpg,webp}` no se veía como un
 * niño (Unsplash redirigía a un retrato adulto cuando se pedía con
 * `crop=faces`). El cliente la quiere inequívocamente infantil.
 *
 * Uso:
 *   npx tsx scripts/download-megamenu-photos.ts
 *
 * Salida:
 *   public/category-photos/mujer-hero.{jpg,webp}
 *   public/category-photos/hombre-hero.{jpg,webp}
 *   public/category-photos/ninos-hero.{jpg,webp}
 *
 * Convención respecto a marcas prohibidas (Nike, Adidas):
 *  - Las fuentes están pre-verificadas visualmente (descarga manual previa)
 *    como SIN logos legibles de Nike/Adidas. Si una falla, intentamos la
 *    siguiente; si todas fallan, conservamos la foto actual sin romper.
 *
 * Formato: las heroes del MegaMenu se renderizan con `next/image fill` en un
 * contenedor con aspect-ratio vertical (260px ancho × ~400-420px alto). Para
 * que se vea bien sin pixelar generamos 1200×1600 (retrato 3:4 — coincide
 * mejor con el contenedor) en lugar del 1600×1200 del catálogo general.
 *
 * Fuentes:
 *   - Pexels (Pexels License — gratis uso comercial, atribución no obligada
 *     pero recomendada). Sin API key. URLs directas estables del CDN.
 *   - Unsplash como fallback (Unsplash License).
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "category-photos");

// El hero del MegaMenu es vertical (260px × ~400px). Pedimos 1200×1600 (3:4).
const TARGET_W = 1200;
const TARGET_H = 1600;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const FETCH_TIMEOUT_MS = 25_000;

type Source =
  | { kind: "pexels"; id: string }
  | { kind: "unsplash"; id: string };

type Entry = {
  slug: string;
  label: string;
  /** Fuentes en orden de preferencia (verificadas a mano sin logos). */
  sources: Source[];
};

// Fuentes pre-verificadas visualmente (descarga manual previa, hi-res) como
// SIN logos Nike/Adidas legibles. Cada entrada indica qué se ve en la foto.
// Pexels: https://www.pexels.com/photo/<id>
// Unsplash: https://unsplash.com/photos/<id>
const ENTRIES: Entry[] = [
  {
    // MUJER — clase de yoga/pilates con esterillas rosa. Plano luminoso,
    // protagonista clara en primer plano, sin marcas prohibidas.
    slug: "mujer-hero",
    label: "Mujer haciendo deporte",
    sources: [
      { kind: "unsplash", id: "1518611012118-696072aa579a" }, // yoga clase (verticalizable)
      { kind: "pexels", id: "6740056" }, // medicine ball (fallback)
      { kind: "pexels", id: "1882012" }, // battle ropes (fallback)
    ],
  },
  {
    // HOMBRE — pelotón ciclista en carrera. Multiples hombres con cascos
    // y maillots variados, energía deportiva, sin Nike/Adidas visibles.
    slug: "hombre-hero",
    label: "Hombre haciendo deporte",
    sources: [
      { kind: "unsplash", id: "1517649763962-0c623066013b" }, // pelotón ciclistas
      { kind: "pexels", id: "3838389" }, // hombre mancuerna gym (fallback)
      { kind: "unsplash", id: "1530549387789-4c1017266635" }, // runner silueta (fallback)
    ],
  },
  {
    // NIÑOS — cuatro niños jugando con balón en un bosque/sendero. Plano
    // amplio, claramente infantil, joyful, sin marcas. Foto icónica.
    slug: "ninos-hero",
    label: "Niños jugando al deporte",
    sources: [
      { kind: "unsplash", id: "1502086223501-7ea6ecd79368" }, // niños jugando balón en bosque
      { kind: "pexels", id: "3621101" }, // niño fútbol portería (fallback)
    ],
  },
];

function buildSourceUrl(source: Source): string {
  if (source.kind === "pexels") {
    // CDN Pexels — auto compresión + redimensionado en el origen.
    return `https://images.pexels.com/photos/${source.id}/pexels-photo-${source.id}.jpeg?auto=compress&cs=tinysrgb&w=${TARGET_W}`;
  }
  // Unsplash — sin crop=faces (causaba zoom a retrato sin contexto).
  return `https://images.unsplash.com/photo-${source.id}?w=${TARGET_W}&q=85&auto=format&fit=crop`;
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
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 8192) return null; // sospechoso pequeño
    return Buffer.from(ab);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function processEntry(
  entry: Entry,
): Promise<{ slug: string; ok: boolean; source: string }> {
  let raw: Buffer | null = null;
  let source = "none";
  for (const src of entry.sources) {
    const url = buildSourceUrl(src);
    const tag = `${src.kind}:${src.id}`;
    process.stdout.write(`  · ${entry.slug.padEnd(14)} → ${tag}... `);
    const b = await tryFetch(url);
    if (b) {
      console.log(`OK (${(b.length / 1024).toFixed(0)} KB)`);
      raw = b;
      source = tag;
      break;
    }
    console.log("FALLO");
  }

  if (!raw) {
    console.log(`  ⚠ ${entry.slug} — sin foto remota, se mantiene la actual.`);
    return { slug: entry.slug, ok: false, source };
  }

  const jpegPath = path.join(OUT_DIR, `${entry.slug}.jpg`);
  const webpPath = path.join(OUT_DIR, `${entry.slug}.webp`);

  const base = sharp(raw).resize({
    width: TARGET_W,
    height: TARGET_H,
    fit: "cover",
    position: "attention", // sharp re-elige zona de interés
  });
  await base.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpegPath);
  await base.clone().webp({ quality: WEBP_QUALITY }).toFile(webpPath);

  return { slug: entry.slug, ok: true, source };
}

async function main() {
  console.log("MegaMenu hero photos — Mujer / Hombre / Niños");
  console.log("──────────────────────────────────────────────");
  console.log(`Destino : ${OUT_DIR}`);
  console.log(`Target  : ${TARGET_W}×${TARGET_H} (retrato 3:4)`);
  console.log(`Total   : ${ENTRIES.length} entradas\n`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: Array<{ slug: string; ok: boolean; source: string }> = [];
  for (const e of ENTRIES) {
    try {
      results.push(await processEntry(e));
    } catch (err) {
      console.log(`  ✗ ${e.slug} — ERROR ${(err as Error).message}`);
      results.push({ slug: e.slug, ok: false, source: "error" });
    }
  }

  console.log("\nResumen:");
  for (const r of results) {
    console.log(`  · ${r.slug.padEnd(14)} ${r.ok ? "✓" : "✗"} ${r.source}`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log(`\n⚠ ${failed.length} foto(s) sin actualizar (red caída o ID retirado).`);
    process.exit(0);
  }
  console.log("\n✓ Todas las fotos del MegaMenu actualizadas.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
