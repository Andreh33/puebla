/**
 * scripts/download-gender-landing-photos.ts
 *
 * Descarga 3 fotos LANDSCAPE para los heros foto-top de /mujer /hombre /ninos.
 *
 * Las fotos del MegaMenu (mujer-hero, hombre-hero, ninos-hero) son retrato
 * 1200×1600. Para un hero fullbleed `h-[60vh] sm:h-[70vh] lg:h-[80vh]`
 * necesitamos paisaje. Esta versión genera 2400×1350 (16:9) lo bastante grande
 * para retina sin pesar de más.
 *
 * Salida (sin pisar las del MegaMenu):
 *   public/category-photos/mujer-landing.{jpg,webp}
 *   public/category-photos/hombre-landing.{jpg,webp}
 *   public/category-photos/ninos-landing.{jpg,webp}
 *
 * Marcas prohibidas (Nike, Adidas): las fuentes están pre-verificadas
 * visualmente. Si una falla, intentamos la siguiente.
 *
 * Uso:
 *   npx tsx scripts/download-gender-landing-photos.ts
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "category-photos");

const TARGET_W = 2400;
const TARGET_H = 1350;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const FETCH_TIMEOUT_MS = 25_000;

type Source =
  | { kind: "pexels"; id: string }
  | { kind: "unsplash"; id: string };

type Entry = {
  slug: string;
  label: string;
  sources: Source[];
};

// Fuentes pre-verificadas visualmente (Unsplash/Pexels License) como SIN
// logos legibles de Nike/Adidas. Cada entrada describe la escena.
const ENTRIES: Entry[] = [
  {
    // MUJER — atleta corriendo en pista al amanecer, plano amplio, vestimenta
    // neutra. La foto principal del HomeHero (photo-1502904550040 = silueta
    // pista) es excelente pero ya está usada. Usamos alternativas femeninas.
    slug: "mujer-landing",
    label: "Mujer haciendo deporte (landscape)",
    sources: [
      { kind: "unsplash", id: "1518310383802-640c2de311b2" }, // mujer corriendo silueta playa
      { kind: "unsplash", id: "1518611012118-696072aa579a" }, // yoga clase landscape
      { kind: "pexels", id: "6740056" }, // medicine ball fitness
      { kind: "pexels", id: "1882012" }, // battle ropes
    ],
  },
  {
    // HOMBRE — pelotón ciclista en carrera, multiples ciclistas con maillots
    // variados, energía deportiva, sin Nike/Adidas. Plano horizontal nato.
    slug: "hombre-landing",
    label: "Hombre haciendo deporte (landscape)",
    sources: [
      { kind: "unsplash", id: "1517649763962-0c623066013b" }, // pelotón ciclistas
      { kind: "unsplash", id: "1530549387789-4c1017266635" }, // runner silueta atardecer
      { kind: "pexels", id: "3838389" }, // hombre mancuerna gym
    ],
  },
  {
    // NIÑOS — niños jugando con balón al aire libre, plano amplio horizontal,
    // joyful, claramente infantil, sin marcas legibles.
    slug: "ninos-landing",
    label: "Niños jugando al deporte (landscape)",
    sources: [
      { kind: "unsplash", id: "1502086223501-7ea6ecd79368" }, // niños jugando balón bosque
      { kind: "pexels", id: "3621101" }, // niño fútbol portería
      { kind: "pexels", id: "8941878" }, // niños corriendo aire libre
    ],
  },
];

function buildSourceUrl(source: Source): string {
  if (source.kind === "pexels") {
    return `https://images.pexels.com/photos/${source.id}/pexels-photo-${source.id}.jpeg?auto=compress&cs=tinysrgb&w=${TARGET_W}`;
  }
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
    if (ab.byteLength < 8192) return null;
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
    process.stdout.write(`  · ${entry.slug.padEnd(16)} -> ${tag}... `);
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
    console.log(`  WARN ${entry.slug} — sin foto remota.`);
    return { slug: entry.slug, ok: false, source };
  }

  const jpegPath = path.join(OUT_DIR, `${entry.slug}.jpg`);
  const webpPath = path.join(OUT_DIR, `${entry.slug}.webp`);

  const base = sharp(raw).resize({
    width: TARGET_W,
    height: TARGET_H,
    fit: "cover",
    position: "attention",
  });
  await base.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(jpegPath);
  await base.clone().webp({ quality: WEBP_QUALITY }).toFile(webpPath);

  return { slug: entry.slug, ok: true, source };
}

async function main() {
  console.log("Gender landing hero photos — Mujer / Hombre / Ninos (landscape)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`Destino : ${OUT_DIR}`);
  console.log(`Target  : ${TARGET_W}x${TARGET_H} (paisaje 16:9)`);
  console.log(`Total   : ${ENTRIES.length} entradas\n`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  const results: Array<{ slug: string; ok: boolean; source: string }> = [];
  for (const e of ENTRIES) {
    try {
      results.push(await processEntry(e));
    } catch (err) {
      console.log(`  ERR ${e.slug} — ${(err as Error).message}`);
      results.push({ slug: e.slug, ok: false, source: "error" });
    }
  }

  console.log("\nResumen:");
  for (const r of results) {
    console.log(`  · ${r.slug.padEnd(16)} ${r.ok ? "OK" : "KO"} ${r.source}`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.log(`\nWARN ${failed.length} foto(s) sin actualizar.`);
    process.exit(0);
  }
  console.log("\nOK — todas las fotos del landing actualizadas.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
