/**
 * Segunda tanda de candidatos para el hero. Las primeras 6 que probé no
 * convencieron al cliente. Estos IDs son acciones deportivas con más
 * dinamismo: pádel real, trail runner, climbing, basketball, mujer
 * fitness funcional, atleta saltando.
 */

import path from "node:path";
import fs from "node:fs/promises";

const TMP = path.resolve(__dirname, "..", ".tmp-hero-v2");

const CANDIDATES = [
  {
    id: "a-padel-court",
    url: "https://images.unsplash.com/photo-1622279457486-c3ff66e34c4d?w=1920&q=80",
    label: "Pádel court con jugadores",
  },
  {
    id: "b-trail-mountain",
    url: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1920&q=80",
    label: "Trail runner montaña",
  },
  {
    id: "c-climbing",
    url: "https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=1920&q=80",
    label: "Climbing pared",
  },
  {
    id: "d-pole-vault",
    url: "https://images.unsplash.com/photo-1565992441121-4367c2967103?w=1920&q=80",
    label: "Atleta saltando (pole vault)",
  },
  {
    id: "e-fitness-functional",
    url: "https://images.unsplash.com/photo-1559149043-d6b48923f4b6?w=1920&q=80",
    label: "Fitness funcional",
  },
  {
    id: "f-padel-action",
    url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1920&q=80",
    label: "Acción raqueta tenis/pádel",
  },
  {
    id: "g-trail-running-women",
    url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1920&q=80",
    label: "Trail mujeres montaña",
  },
  {
    id: "h-cyclist-action",
    url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1920&q=80",
    label: "Ciclistas pelotón",
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
  console.log("📥 Descargando candidatos v2 a", TMP, "\n");
  for (const c of CANDIDATES) {
    const file = path.join(TMP, `${c.id}.jpg`);
    try {
      const size = await download(c.url, file);
      console.log(`✓ ${c.id.padEnd(28)} ${c.label.padEnd(34)} ${(size / 1024).toFixed(0)} KB`);
    } catch (err) {
      console.log(`✗ ${c.id.padEnd(28)} ${c.label.padEnd(34)} ${(err as Error).message}`);
    }
  }
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
