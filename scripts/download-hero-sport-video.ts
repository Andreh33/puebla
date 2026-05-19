/**
 * Descarga varios candidatos de video deportivo CC0 (Pexels), extrae el
 * primer frame de cada uno con ffmpeg y los guarda como JPG numerado para
 * inspección visual. NO sustituye automáticamente el archivo final — el
 * script imprime los paths y deja al humano elegir el bueno.
 *
 * Causa raíz: el script previo (download-hero-video.ts) usaba Pexels IDs
 * que con el tiempo cambiaron de contenido (3192305 hoy es una reunión de
 * oficina). Aquí descargamos múltiples y verificamos visualmente.
 *
 * Run: npx tsx scripts/download-hero-sport-video.ts
 */

import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const TMP = path.resolve(__dirname, "..", ".tmp-hero-candidates");

type Candidate = { id: string; label: string; url: string };

// Mixkit y Coverr ofrecen .mp4 sin auth (a diferencia de Pexels que bloquea
// muchos UAs con 403). Mantenemos algún Pexels con headers de navegador
// real por si pasa.
const CANDIDATES: Candidate[] = [
  // ---- Mixkit (licencia gratis comercial sin atribución) ----
  {
    id: "mixkit-male-runner-jogging-on-bridge-32812",
    label: "Mixkit · Runner puente",
    url: "https://assets.mixkit.co/videos/32812/32812-720.mp4",
  },
  {
    id: "mixkit-young-mother-with-her-little-daughter-eating-a-pancake-39745",
    label: "Mixkit · NO USAR (control)",
    url: "https://assets.mixkit.co/videos/39745/39745-720.mp4",
  },
  {
    id: "mixkit-runner-stretching-on-a-bridge-2310",
    label: "Mixkit · Runner estirando",
    url: "https://assets.mixkit.co/videos/2310/2310-720.mp4",
  },
  {
    id: "mixkit-running-in-the-rain-1242",
    label: "Mixkit · Corriendo bajo lluvia",
    url: "https://assets.mixkit.co/videos/1242/1242-720.mp4",
  },
  {
    id: "mixkit-female-athlete-running-on-the-beach-39891",
    label: "Mixkit · Atleta playa",
    url: "https://assets.mixkit.co/videos/39891/39891-720.mp4",
  },
  {
    id: "mixkit-young-man-running-by-the-beach-39875",
    label: "Mixkit · Hombre corriendo playa",
    url: "https://assets.mixkit.co/videos/39875/39875-720.mp4",
  },
  {
    id: "mixkit-young-woman-running-through-a-park-43536",
    label: "Mixkit · Mujer corriendo parque",
    url: "https://assets.mixkit.co/videos/43536/43536-720.mp4",
  },
  {
    id: "mixkit-trail-running-1280",
    label: "Mixkit · Trail montaña",
    url: "https://assets.mixkit.co/videos/1280/1280-720.mp4",
  },
  {
    id: "mixkit-padel-game-25543",
    label: "Mixkit · Pádel",
    url: "https://assets.mixkit.co/videos/25543/25543-720.mp4",
  },
  // ---- Pexels con headers de navegador (puede que sí pase ahora) ----
  {
    id: "pexels-4754030",
    label: "Pexels · Running urbano",
    url: "https://videos.pexels.com/video-files/4754030/4754030-hd_1920_1080_25fps.mp4",
  },
  {
    id: "pexels-4762881",
    label: "Pexels · Trail runner",
    url: "https://videos.pexels.com/video-files/4762881/4762881-hd_1920_1080_25fps.mp4",
  },
  {
    id: "pexels-2786193",
    label: "Pexels · Sprint pista",
    url: "https://videos.pexels.com/video-files/2786193/2786193-hd_1920_1080_25fps.mp4",
  },
];

const MAX_BYTES = 30 * 1024 * 1024;

async function fetchBoundedBytes(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const isPexels = url.includes("pexels.com");
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        ...(isPexels
          ? { Referer: "https://www.pexels.com/" }
          : { Referer: "https://mixkit.co/" }),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!res.body) throw new Error("Respuesta sin body");
    const cl = res.headers.get("content-length");
    if (cl && Number(cl) > MAX_BYTES) throw new Error(`> ${MAX_BYTES} bytes`);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error(`> ${MAX_BYTES} bytes`);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  } finally {
    clearTimeout(timer);
  }
}

function ffmpegExtractFrame(mp4: string, jpg: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      mp4,
      "-ss",
      "00:00:02",
      "-frames:v",
      "1",
      "-vf",
      "scale=640:-1",
      "-y",
      jpg,
    ]);
    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 200)}`));
    });
  });
}

async function main() {
  await fs.mkdir(TMP, { recursive: true });
  console.log("📥 Descargando candidatos a", TMP, "\n");

  const ok: Array<{ id: string; label: string; mp4: string; jpg: string; sizeMb: number }> = [];

  for (const c of CANDIDATES) {
    const mp4 = path.join(TMP, `${c.id}.mp4`);
    const jpg = path.join(TMP, `${c.id}.jpg`);
    try {
      process.stdout.write(`· ${c.id.padEnd(8)} ${c.label.padEnd(28)} … `);
      const buf = await fetchBoundedBytes(c.url);
      await fs.writeFile(mp4, buf);
      await ffmpegExtractFrame(mp4, jpg);
      const sizeMb = buf.length / 1024 / 1024;
      ok.push({ ...c, mp4, jpg, sizeMb });
      console.log(`✓ ${sizeMb.toFixed(2)} MB`);
    } catch (err) {
      console.log(`✗ ${(err as Error).message}`);
    }
  }

  console.log("\n🖼  Frames extraídos en", TMP);
  for (const c of ok) {
    console.log(`   ${c.id}  ${c.label}  →  ${path.relative(process.cwd(), c.jpg)}`);
  }
  console.log("\nRevisa los .jpg manualmente para elegir el bueno.");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
