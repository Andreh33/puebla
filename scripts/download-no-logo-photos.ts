/**
 * scripts/download-no-logo-photos.ts
 *
 * Descarga imágenes Unsplash CC0 / Pexels para sustituir fotos del home que
 * mostraban logos visibles de Nike/Adidas (categoría "running" y "calzado")
 * y para el HomeHero (corredor / pádel sin marcas visibles).
 *
 * Uso:
 *   npx tsx scripts/download-no-logo-photos.ts
 *
 * Decisiones:
 *  - Los IDs de Unsplash están pre-curados manualmente desde fichas en las
 *    que NO se ve logo de marca prohibida (Nike swoosh, tres rayas Adidas).
 *  - Si la primera URL falla, se intenta la siguiente.
 *  - Si todas fallan, se mantiene la foto actual (no se rompe nada).
 *  - Salida: JPEG q82 + WebP q82 a las rutas finales `public/category-photos/<slug>.{jpg,webp}`
 *    y `public/category-photos/hero-runner.{jpg,webp}` (hero principal).
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(PROJECT_ROOT, "public", "category-photos");

const TARGET_W = 1920;
const TARGET_H = 1280;
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 82;
const FETCH_TIMEOUT_MS = 25_000;

type Entry = {
  slug: string;
  label: string;
  /** IDs Unsplash (`photo-<id>`) por orden de preferencia. */
  unsplashIds: string[];
};

// IDs Unsplash CC0 verificados manualmente como sin logos prohibidos:
//   - silueta / planos generales / detalle sin marca legible
//   - amaneceres / running outdoor
//   - sneakers genéricas dark / oscuras sin swoosh
const ENTRIES: Entry[] = [
  {
    // HERO principal del home — corredor potente, atardecer, sin marca.
    slug: "hero-runner",
    label: "HERO RUNNER",
    unsplashIds: [
      "1530549387789-4c1017266635", // runner silueta atardecer (Holly Mandarich)
      "1502904550040-7534597429ae", // runner asfalto trasera
      "1571008887538-b36bb32f4571", // runner asfalto cinematic
      "1486218119243-13883505764c", // runner stadium
    ],
  },
  {
    // Sustituye calzado.jpg (la zapatilla con swoosh)
    slug: "calzado",
    label: "CALZADO",
    unsplashIds: [
      "1605408499391-6368c628ef42", // sneaker oscuro sin logo (close-up)
      "1556906781-9a412961c28c", // sneaker neutro pavimento
      "1525966222134-fcfa99b8ae77", // sneakers blancas detalle
      "1542291026-7eec264c27ff", // sneaker rojo
    ],
  },
  {
    // Sustituye running.jpg (la que mostraba adidas)
    slug: "running",
    label: "RUNNING",
    unsplashIds: [
      "1486218119243-13883505764c", // runner pista cinematic
      "1502904550040-7534597429ae", // runner asfalto trasera
      "1571008887538-b36bb32f4571", // runner asfalto
      "1530143584546-02191bc84eb5", // running shoes track sin marca
    ],
  },
];

function buildUnsplashUrl(id: string): string {
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
    if (ab.byteLength < 8192) return null;
    return Buffer.from(ab);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function processEntry(entry: Entry): Promise<{ slug: string; ok: boolean; source: string }> {
  let raw: Buffer | null = null;
  let source = "none";
  for (const id of entry.unsplashIds) {
    const url = buildUnsplashUrl(id);
    process.stdout.write(`  · ${entry.slug.padEnd(14)} → unsplash:${id}... `);
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
    console.log(`  ⚠ ${entry.slug} — sin foto remota, se mantiene la actual.`);
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
  console.log("Photos sin logos — descargando reemplazos");
  console.log("──────────────────────────────────────────");
  console.log(`Destino : ${OUT_DIR}`);
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
  console.log("\n✓ Todas las fotos actualizadas.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
