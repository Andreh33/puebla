/**
 * Descarga un video CC0 / licencia libre comercial de Pexels y/o Mixkit a
 * `public/videos/hero-running.mp4`. Si todos los candidatos fallan, se aborta
 * con error claro y el hero usa la foto fallback existente.
 *
 * Run: npx tsx scripts/download-hero-video.ts
 *
 * Pexels License (https://www.pexels.com/license/): permite uso comercial sin
 * atribución obligatoria. Mixkit Free License similar.
 */

import path from "node:path";
import fs from "node:fs/promises";

const OUT_DIR = path.resolve(__dirname, "..", "public", "videos");
const OUT_FILE = path.join(OUT_DIR, "hero-running.mp4");
const POSTER = path.join(OUT_DIR, "hero-running.jpg");

// Lista curada de URLs directas de Pexels (de fichas de video públicas).
// Todos son contenido deportivo sin logos de marca visibles.
const CANDIDATES: Array<{ url: string; label: string }> = [
  {
    label: "Pexels — atletismo en pista (2K)",
    url: "https://videos.pexels.com/video-files/3192305/3192305-uhd_2560_1440_25fps.mp4",
  },
  {
    label: "Pexels — runner cinemático trail",
    url: "https://videos.pexels.com/video-files/4762881/4762881-hd_1920_1080_25fps.mp4",
  },
  {
    label: "Pexels — atleta corriendo amanecer",
    url: "https://videos.pexels.com/video-files/5319756/5319756-hd_1920_1080_25fps.mp4",
  },
  {
    label: "Pexels — sport fitness training",
    url: "https://videos.pexels.com/video-files/4754030/4754030-hd_1920_1080_25fps.mp4",
  },
  {
    label: "Pexels — running shoes close up",
    url: "https://videos.pexels.com/video-files/4754033/4754033-hd_1920_1080_25fps.mp4",
  },
];

// Poster Unsplash (composición running sin logos)
const POSTER_URL =
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1920&q=80";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const FETCH_TIMEOUT_MS = 30_000;

async function fetchBoundedBytes(url: string, maxBytes = MAX_BYTES): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ZonaSportBot/1.0; +https://zonasport.es)",
        Accept: "video/*,image/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cl = res.headers.get("content-length");
    if (cl && Number(cl) > maxBytes) {
      throw new Error(`Archivo demasiado grande (${cl} bytes > ${maxBytes})`);
    }
    if (!res.body) throw new Error("Respuesta sin body");

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Excede ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log("🎬 Descargando video hero (CC0)…");
  let saved: string | null = null;
  for (const c of CANDIDATES) {
    try {
      console.log(`  · Intentando: ${c.label}`);
      const buf = await fetchBoundedBytes(c.url);
      await fs.writeFile(OUT_FILE, buf);
      console.log(`    ✓ Guardado en ${path.relative(process.cwd(), OUT_FILE)} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
      saved = c.url;
      break;
    } catch (err) {
      console.log(`    ✗ ${(err as Error).message}`);
    }
  }

  if (!saved) {
    console.error("\n❌ Ninguna URL de video funcionó. Hero usará foto fallback.");
    process.exit(1);
  }

  // Poster (frame de fallback mientras el video carga)
  console.log("\n📸 Descargando poster del video…");
  try {
    const buf = await fetchBoundedBytes(POSTER_URL, 5 * 1024 * 1024);
    await fs.writeFile(POSTER, buf);
    console.log(`  ✓ ${path.relative(process.cwd(), POSTER)} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    console.warn(`  ⚠ Poster falló: ${(err as Error).message} (no es crítico)`);
  }

  console.log("\n✅ Hero video listo.");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
