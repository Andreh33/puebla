/**
 * Descarga varias fotos candidatas para el hero. Cada una se descarga A
 * pesar de su ID — el contenido real se verifica con extracción visual
 * (las miramos manualmente en .tmp-hero-photos/).
 *
 * Lección aprendida: los IDs de Pexels/Mixkit/Unsplash pueden re-asociarse
 * con el tiempo, así que nunca confiar en el nombre — siempre inspeccionar
 * el frame/imagen real antes de promocionar a `public/`.
 */

import path from "node:path";
import fs from "node:fs/promises";

const TMP = path.resolve(__dirname, "..", ".tmp-hero-photos");

const CANDIDATES: Array<{ id: string; url: string; label: string }> = [
  // Unsplash images conocidas en la comunidad fitness/running.
  {
    id: "ph01-running-track",
    url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1920&q=80",
    label: "Running track",
  },
  {
    id: "ph02-runner-closeup",
    url: "https://images.unsplash.com/photo-1486218119243-13883505764c?w=1920&q=80",
    label: "Runner closeup",
  },
  {
    id: "ph03-stadium-track",
    url: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?w=1920&q=80",
    label: "Stadium track",
  },
  {
    id: "ph04-runner-silhouette",
    url: "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=1920&q=80",
    label: "Runner silhouette",
  },
  {
    id: "ph05-trail-runner",
    url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1920&q=80",
    label: "Trail runner",
  },
  {
    id: "ph06-running-sunset",
    url: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1920&q=80",
    label: "Running sunset",
  },
  {
    id: "ph07-padel-court",
    url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1920&q=80",
    label: "Padel/Tennis court",
  },
  {
    id: "ph08-runner-dramatic",
    url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&q=80",
    label: "Athlete dramatic",
  },
  {
    id: "ph09-runner-park",
    url: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=1920&q=80",
    label: "Runner park",
  },
  {
    id: "ph10-runners-group",
    url: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=1920&q=80",
    label: "Runners group",
  },
  {
    id: "ph11-padel-action",
    url: "https://images.unsplash.com/photo-1591491653056-4e0f2b2c3e1c?w=1920&q=80",
    label: "Padel action",
  },
  {
    id: "ph12-cyclist-mountain",
    url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&q=80",
    label: "Cyclist mountain (dup ID test)",
  },
];

async function download(url: string, file: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/jpeg,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(file, buf);
    return buf.length;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  await fs.mkdir(TMP, { recursive: true });
  console.log("📥 Descargando fotos candidatas a", TMP, "\n");
  for (const c of CANDIDATES) {
    const file = path.join(TMP, `${c.id}.jpg`);
    try {
      const size = await download(c.url, file);
      console.log(`✓ ${c.id.padEnd(28)} ${c.label.padEnd(30)} ${(size / 1024).toFixed(0)} KB`);
    } catch (err) {
      console.log(`✗ ${c.id.padEnd(28)} ${c.label.padEnd(30)} ${(err as Error).message}`);
    }
  }
  console.log("\nRevisa visualmente cada .jpg en", TMP);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
