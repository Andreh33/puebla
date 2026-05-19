/**
 * Genera screenshots para el manifest PWA: 1 wide (1280x720) y 1 narrow (720x1280).
 * Necesarios para que Android Chrome muestre la UI rica de instalación.
 *
 * Estrategia: composición con sharp de logo + tagline + colores corporativos.
 *
 * Ejecutar: npx tsx scripts/generate-pwa-screenshots.ts
 */

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const LOGO = path.join(PUBLIC_DIR, "logo.png");
const SCREENSHOTS_DIR = path.join(PUBLIC_DIR, "screenshots");

const ZS_BLUE = { r: 0x14, g: 0x22, b: 0x5b };
const ZS_RED = { r: 0xdc, g: 0x26, b: 0x26 };

function bgSvg(width: number, height: number): Buffer {
  // SVG con gradient zs-blue + decoración pelota tennis y soccer
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14225b"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <radialGradient id="acc1" cx="20%" cy="80%" r="40%">
      <stop offset="0%" stop-color="#c8da46" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#c8da46" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="acc2" cx="85%" cy="15%" r="35%">
      <stop offset="0%" stop-color="#dc2626" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#dc2626" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#acc1)"/>
  <rect width="${width}" height="${height}" fill="url(#acc2)"/>
  <text x="${width / 2}" y="${height - 80}" font-family="system-ui,sans-serif" font-size="28" font-weight="600" fill="rgba(255,255,255,0.85)" text-anchor="middle">Tienda de deportes · Puebla de la Calzada</text>
  <text x="${width / 2}" y="${height - 36}" font-family="system-ui,sans-serif" font-size="20" font-weight="400" fill="rgba(255,255,255,0.6)" text-anchor="middle">zonasport.es</text>
</svg>`);
}

async function generateScreenshot(
  width: number,
  height: number,
  outName: string,
): Promise<void> {
  const bg = bgSvg(width, height);
  const logoBuf = await sharp(LOGO)
    .resize({
      width: Math.min(Math.floor(width * 0.5), 560),
      withoutEnlargement: true,
    })
    .toBuffer();

  // Centrar logo verticalmente más arriba del centro (-15%)
  const composed = await sharp(bg)
    .composite([
      {
        input: logoBuf,
        gravity: "center",
        top: undefined as unknown as number, // gravity-positioned
      },
    ])
    .png()
    .toBuffer();

  await fs.writeFile(path.join(SCREENSHOTS_DIR, outName), composed);
  console.log(`   ✓ screenshots/${outName} (${width}x${height})`);
}

async function main() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  console.log("📸 Generando screenshots PWA…");
  await generateScreenshot(1280, 720, "wide.png");
  await generateScreenshot(720, 1280, "narrow.png");
  console.log("\n✅ Screenshots PWA generados.");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
