#!/usr/bin/env tsx
/**
 * scripts/generate-blog-covers.ts
 *
 * Genera las portadas SVG de marca para los 40 posts de BLOG_POSTS_EXTRA y las
 * escribe en `public/blog-covers/<slug>.svg`. Usa `generateCoverSvg` (SVG puro,
 * sin dependencias). Idempotente: sobrescribe los ficheros existentes.
 *
 *   npx tsx scripts/generate-blog-covers.ts
 *
 * Los SVG van en /public (no son secretos) y se commitean al repo.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BLOG_POSTS_EXTRA } from "../lib/seed/blog-posts-extra";
import { generateCoverSvg } from "../lib/blog/cover-svg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "public", "blog-covers");

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  let written = 0;
  for (const post of BLOG_POSTS_EXTRA) {
    const svg = generateCoverSvg({
      title: post.title,
      accent: post.accent,
      kicker: `Zona Sport · ${post.category}`,
    });
    const file = path.join(OUT_DIR, `${post.slug}.svg`);
    writeFileSync(file, svg, "utf8");
    written += 1;
  }

  console.log(`Generadas ${written} portadas SVG en ${OUT_DIR}`);
}

main();
