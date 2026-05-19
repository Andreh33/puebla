/**
 * Regenera iconos PWA + favicons a partir del `logo.webp` real del cliente,
 * SIN modificar el fondo (sin remove-background). El logo del cliente tiene
 * fondo blanco — los iconos resultan blancos cuadrados con el lockup centrado.
 *
 * Output:
 *   - public/icons/icon-192.png         (fondo blanco)
 *   - public/icons/icon-512.png         (fondo blanco)
 *   - public/icons/icon-maskable-192.png (fondo azul corporativo + safe area)
 *   - public/icons/icon-maskable-512.png (fondo azul corporativo + safe area)
 *   - public/apple-touch-icon.png       (fondo blanco)
 *   - public/favicon-16.png, favicon-32.png (fondo blanco)
 *
 * Ejecutar: npx tsx scripts/regenerate-icons-from-user-logo.ts
 */

import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const INPUT = path.join(PROJECT_ROOT, "logo.webp");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const ICONS_DIR = path.join(PUBLIC_DIR, "icons");

async function compose(
  size: number,
  padding: number,
  bg: { r: number; g: number; b: number; alpha: number },
  out: string,
): Promise<void> {
  const inner = size - padding * 2;
  const logo = await sharp(INPUT)
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 1 }, threshold: 12 })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .toBuffer();

  const composed = await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.writeFile(out, composed);
  console.log(`   ✓ ${path.relative(PROJECT_ROOT, out)}`);
}

async function main() {
  await fs.mkdir(ICONS_DIR, { recursive: true });
  console.log("📷 Regenerando iconos desde logo.webp REAL del cliente…");

  const white = { r: 255, g: 255, b: 255, alpha: 1 };
  const zsBlue = { r: 0x14, g: 0x22, b: 0x5b, alpha: 1 };

  await compose(192, 14, white, path.join(ICONS_DIR, "icon-192.png"));
  await compose(512, 32, white, path.join(ICONS_DIR, "icon-512.png"));
  await compose(192, 28, zsBlue, path.join(ICONS_DIR, "icon-maskable-192.png"));
  await compose(512, 76, zsBlue, path.join(ICONS_DIR, "icon-maskable-512.png"));
  await compose(180, 16, white, path.join(PUBLIC_DIR, "apple-touch-icon.png"));
  await compose(16, 1, white, path.join(PUBLIC_DIR, "favicon-16.png"));
  await compose(32, 2, white, path.join(PUBLIC_DIR, "favicon-32.png"));

  // ICO bundle (16 + 32) para favicon.ico clásico — sharp no soporta ICO de
  // múltiples tamaños nativamente. Generamos PNG 32 y referenciamos desde meta.
  // Algunos navegadores antiguos no lo prefieren pero todos los modernos sí.

  // OG default
  const ogBuf = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: white },
  })
    .composite([
      {
        input: await sharp(INPUT)
          .resize({ width: 700, withoutEnlargement: true })
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(PUBLIC_DIR, "og-default.png"), ogBuf);
  console.log("   ✓ public/og-default.png (1200x630)");

  console.log("\n✅ Iconos regenerados desde el logo del cliente.");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
