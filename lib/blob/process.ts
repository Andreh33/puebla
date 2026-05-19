/**
 * Funciones puras de procesamiento con sharp. Aisladas para poder testearse
 * sin necesidad de Vercel Blob ni DB.
 *
 * Convertimos siempre a WebP q80 — formato moderno, bien soportado y muy
 * eficiente. Tres variantes:
 *   - thumb  → 400x400 fit inside (para galerías y listas)
 *   - medium → 800x800 fit inside (para fichas en mobile/tablet)
 *   - large  → 1600x1600 fit inside (para zoom y desktop)
 *
 * Adicionalmente se genera un LQIP (Low Quality Image Placeholder) en
 * base64 data URL de 10x10 px para mostrar mientras se carga la imagen.
 */
import sharp from "sharp";

export const WEBP_QUALITY = 80;
export const VARIANT_SIZES = {
  thumb: 400,
  medium: 800,
  large: 1600,
} as const;

export type VariantName = keyof typeof VARIANT_SIZES;

export type ProcessedVariant = {
  name: VariantName;
  buffer: Buffer;
  width: number;
  height: number;
  bytes: number;
};

export type ProcessedImage = {
  variants: Record<VariantName, ProcessedVariant>;
  blurDataUrl: string;
  width: number;
  height: number;
};

export class ImageProcessingError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

/**
 * Genera una variante WebP `fit: inside` (no recorta, mantiene aspect ratio).
 */
export async function makeWebpVariant(
  input: Buffer,
  maxSize: number,
): Promise<ProcessedVariant & { name: VariantName }> {
  const pipeline = sharp(input, { failOn: "error" })
    .rotate() // auto-orient EXIF
    .resize({
      width: maxSize,
      height: maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  // El nombre se asigna en `processImage` — aquí solo devolvemos los datos.
  return {
    name: "large",
    buffer: data,
    width: info.width,
    height: info.height,
    bytes: data.byteLength,
  };
}

/**
 * Genera un blurDataURL (LQIP) base64 de 10x10 px en WebP de muy baja calidad.
 */
export async function makeBlurDataUrl(input: Buffer): Promise<string> {
  const buf = await sharp(input, { failOn: "error" })
    .rotate()
    .resize(10, 10, { fit: "inside" })
    .webp({ quality: 30 })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

/**
 * Devuelve dimensiones reales de la imagen original.
 */
export async function readMeta(
  input: Buffer,
): Promise<{ width: number; height: number; format: string }> {
  try {
    const m = await sharp(input).metadata();
    if (!m.width || !m.height) {
      throw new ImageProcessingError("La imagen no tiene dimensiones válidas");
    }
    return { width: m.width, height: m.height, format: m.format ?? "unknown" };
  } catch (err) {
    if (err instanceof ImageProcessingError) throw err;
    throw new ImageProcessingError("No se pudo leer la imagen (¿formato no soportado?)", err);
  }
}

/**
 * Procesa un buffer crudo y devuelve las 3 variantes + blur + dimensiones.
 *
 * Lanza ImageProcessingError si la imagen está corrupta o no es procesable.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const meta = await readMeta(input);

    // Generamos en paralelo — sharp lanza tareas en su threadpool nativo.
    const [thumb, medium, large, blurDataUrl] = await Promise.all([
      makeWebpVariant(input, VARIANT_SIZES.thumb),
      makeWebpVariant(input, VARIANT_SIZES.medium),
      makeWebpVariant(input, VARIANT_SIZES.large),
      makeBlurDataUrl(input),
    ]);

    return {
      variants: {
        thumb: { ...thumb, name: "thumb" },
        medium: { ...medium, name: "medium" },
        large: { ...large, name: "large" },
      },
      blurDataUrl,
      width: meta.width,
      height: meta.height,
    };
  } catch (err) {
    if (err instanceof ImageProcessingError) throw err;
    throw new ImageProcessingError(
      "Fallo durante el procesado de la imagen",
      err,
    );
  }
}
