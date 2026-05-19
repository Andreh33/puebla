import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  processImage,
  makeWebpVariant,
  makeBlurDataUrl,
  readMeta,
  VARIANT_SIZES,
  ImageProcessingError,
} from "@/lib/blob/process";

/**
 * Generamos in-memory una imagen PNG de prueba con sharp para no depender de
 * fixtures binarios en disco. Tamaño grande (2000x1500) para verificar que
 * el resize hace "fit inside" correctamente.
 */
async function fixturePng(width = 2000, height = 1500): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 60, b: 80 },
    },
  })
    .png()
    .toBuffer();
}

describe("blob/process", () => {
  it("readMeta devuelve dimensiones correctas", async () => {
    const buf = await fixturePng(1024, 768);
    const meta = await readMeta(buf);
    expect(meta.width).toBe(1024);
    expect(meta.height).toBe(768);
    expect(meta.format).toBe("png");
  });

  it("readMeta lanza ImageProcessingError con buffer inválido", async () => {
    const fake = Buffer.from("not an image, just text bytes 1234567890");
    await expect(readMeta(fake)).rejects.toBeInstanceOf(ImageProcessingError);
  });

  it("makeWebpVariant respeta fit:inside y no agranda", async () => {
    const small = await fixturePng(300, 200);
    const variant = await makeWebpVariant(small, VARIANT_SIZES.large);
    expect(variant.width).toBeLessThanOrEqual(300);
    expect(variant.height).toBeLessThanOrEqual(200);
    // Comprobamos que el resultado es WebP
    const meta = await sharp(variant.buffer).metadata();
    expect(meta.format).toBe("webp");
  });

  it("makeWebpVariant reduce una imagen grande al tamaño objetivo", async () => {
    const big = await fixturePng(2000, 1500);
    const thumb = await makeWebpVariant(big, VARIANT_SIZES.thumb);
    expect(thumb.width).toBeLessThanOrEqual(VARIANT_SIZES.thumb);
    expect(thumb.height).toBeLessThanOrEqual(VARIANT_SIZES.thumb);
    // Aspect ratio aprox 4:3 → 400x300
    expect(thumb.width).toBe(400);
    expect(thumb.height).toBe(300);
  });

  it("makeBlurDataUrl devuelve data:image/webp;base64,...", async () => {
    const buf = await fixturePng(800, 600);
    const blur = await makeBlurDataUrl(buf);
    expect(blur).toMatch(/^data:image\/webp;base64,/);
    // 10x10 WebP debe ser muy pequeño (~ <500 chars)
    expect(blur.length).toBeLessThan(2000);
  });

  it("processImage devuelve las 3 variantes nombradas", async () => {
    const buf = await fixturePng(1800, 1200);
    const result = await processImage(buf);
    expect(result.variants.thumb.name).toBe("thumb");
    expect(result.variants.medium.name).toBe("medium");
    expect(result.variants.large.name).toBe("large");
    expect(result.variants.thumb.width).toBeLessThanOrEqual(VARIANT_SIZES.thumb);
    expect(result.variants.medium.width).toBeLessThanOrEqual(VARIANT_SIZES.medium);
    expect(result.variants.large.width).toBeLessThanOrEqual(VARIANT_SIZES.large);
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
    expect(result.width).toBe(1800);
    expect(result.height).toBe(1200);
  });

  it("processImage falla limpio con input corrupto", async () => {
    const trash = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    await expect(processImage(trash)).rejects.toBeInstanceOf(ImageProcessingError);
  });
});
