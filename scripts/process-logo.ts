/**
 * Procesa el logo `images.jpg.webp` quitando el fondo blanco y exporta:
 *   - public/logo.webp  (full color con alpha, ancho 800px)
 *   - public/logo.png   (PNG con alpha para PWA / favicons)
 *   - public/icons/icon-{192,512}.png  (iconos PWA cuadrados con padding)
 *   - public/icons/icon-maskable-{192,512}.png (iconos maskable con safe area)
 *   - public/apple-touch-icon.png (180x180)
 *   - public/favicon-{16,32}.png
 *
 * Estrategia de background removal:
 *   1. Cargar como RGBA.
 *   2. Para cada píxel, si los 3 canales RGB están por encima del threshold
 *      de "blanco" (>= 240), se vuelve transparente. Edge smoothing con
 *      luminancia gradual: 240-255 → alpha lineal de 255 a 0.
 *   3. El logo Zona Sport tiene fondo blanco sólido y colores muy saturados
 *      (azul oscuro #14225B, rojo #DC2626, verde tenis #C8DA46, balón con
 *      detalles negros). El threshold preserva detalles internos.
 *
 * Ejecutar: npx tsx scripts/process-logo.ts
 */

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(PROJECT_ROOT, "images.jpg.webp");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");

const WHITE_THRESHOLD = 240; // píxeles con todos los canales >= este valor son fondo
const SOFT_RANGE = 15; // anti-aliasing en bordes (255 - SOFT_RANGE = 240)

async function removeWhiteBackground(input: string): Promise<Buffer> {
  const img = sharp(input).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const channels = info.channels;
  if (channels !== 4) {
    throw new Error(`Esperaba 4 canales, encontré ${channels}`);
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const minRgb = Math.min(r, g, b);

    if (minRgb >= 255 - SOFT_RANGE) {
      // anti-aliasing suave en bordes: 240..255 → 255..0
      const t = (minRgb - (255 - SOFT_RANGE)) / SOFT_RANGE;
      pixels[i + 3] = Math.max(0, Math.round(255 * (1 - t)));
    }
  }

  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function squareWithPadding(
  rgbaBuffer: Buffer,
  outputSize: number,
  padding: number,
  background: { r: number; g: number; b: number; alpha: number } = { r: 0, g: 0, b: 0, alpha: 0 },
): Promise<Buffer> {
  const innerSize = outputSize - padding * 2;
  const resized = await sharp(rgbaBuffer)
    .resize(innerSize, innerSize, { fit: "contain", background })
    .toBuffer();

  return sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  await fs.access(INPUT).catch(() => {
    throw new Error(`No encontré ${INPUT}`);
  });

  await fs.mkdir(ICONS_DIR, { recursive: true });

  console.log("📷 Procesando logo Zona Sport...");
  console.log(`   Origen: ${path.relative(PROJECT_ROOT, INPUT)}`);

  // 1) Quitar fondo
  const transparent = await removeWhiteBackground(INPUT);
  console.log("   ✓ Fondo blanco removido (threshold soft 240-255)");

  // 2) Logo principal: 800px de ancho conservando proporción, exportar WebP + PNG
  const logo800 = await sharp(transparent)
    .resize({ width: 800, withoutEnlargement: true })
    .toBuffer();

  await sharp(logo800).webp({ quality: 92, alphaQuality: 100 }).toFile(
    path.join(PUBLIC_DIR, "logo.webp"),
  );
  await sharp(logo800).png({ compressionLevel: 9 }).toFile(
    path.join(PUBLIC_DIR, "logo.png"),
  );
  console.log("   ✓ public/logo.webp (800px) + public/logo.png");

  // 3) Iconos PWA (cuadrados con padding 12%)
  const sizes = [
    { name: "icon-192.png", size: 192, padding: 18, maskable: false },
    { name: "icon-512.png", size: 512, padding: 48, maskable: false },
    { name: "icon-maskable-192.png", size: 192, padding: 30, maskable: true },
    { name: "icon-maskable-512.png", size: 512, padding: 80, maskable: true },
  ];

  for (const { name, size, padding, maskable } of sizes) {
    const bg = maskable
      ? { r: 0x14, g: 0x22, b: 0x5b, alpha: 1 } // safe area sólida color marca
      : { r: 0, g: 0, b: 0, alpha: 0 };
    const buf = await squareWithPadding(transparent, size, padding, bg);
    await fs.writeFile(path.join(ICONS_DIR, name), buf);
    console.log(`   ✓ public/icons/${name}`);
  }

  // 4) Apple touch icon (fondo blanco según convención iOS)
  const appleTouchBuf = await squareWithPadding(
    transparent,
    180,
    16,
    { r: 255, g: 255, b: 255, alpha: 1 },
  );
  await fs.writeFile(path.join(PUBLIC_DIR, "apple-touch-icon.png"), appleTouchBuf);
  console.log("   ✓ public/apple-touch-icon.png (180x180)");

  // 5) Favicons PNG
  for (const sz of [16, 32]) {
    const buf = await squareWithPadding(transparent, sz, 1, { r: 0, g: 0, b: 0, alpha: 0 });
    await fs.writeFile(path.join(PUBLIC_DIR, `favicon-${sz}.png`), buf);
    console.log(`   ✓ public/favicon-${sz}.png`);
  }

  console.log("\n✅ Logo procesado.");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
