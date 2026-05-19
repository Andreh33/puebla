/**
 * Pipeline de subida a Vercel Blob.
 *
 * Flujo:
 *   1. Buffer crudo â†’
 *   2. sharp procesa 3 variantes (WebP) + LQIP â†’
 *   3. Sube las 3 a Vercel Blob bajo path determinÃ­stico â†’
 *   4. (Opcional) Crea registro ProductImage en DB.
 *
 * Requisitos:
 *   - BLOB_READ_WRITE_TOKEN debe estar configurado.
 *   - En entornos sin token, fallamos rÃ¡pido y claro.
 */
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  processImage,
  ImageProcessingError,
  type VariantName,
} from "./process";

export class BlobConfigError extends Error {
  constructor() {
    super(
      "Vercel Blob no configurado â€” aÃ±ade BLOB_READ_WRITE_TOKEN a .env.local. " +
        "El pipeline no guarda en disco como fallback.",
    );
    this.name = "BlobConfigError";
  }
}

export class BlobUploadError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "BlobUploadError";
  }
}

function assertBlobConfigured(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new BlobConfigError();
  return token;
}

export type UploadProductResult = {
  id: string | null; // null si no se creÃ³ registro en DB
  url: string;        // large
  urlMedium: string;
  urlThumb: string;
  blurDataUrl: string;
  width: number;
  height: number;
};

export type UploadGenericResult = {
  url: string;
  urlMedium: string;
  urlThumb: string;
  blurDataUrl: string;
  width: number;
  height: number;
};

function variantPath(folder: string, slug: string, variant: VariantName): string {
  return `${folder}/${slug}-${variant}.webp`;
}

/**
 * Sube una imagen de producto. Si se pasa productId, crea registro DB.
 */
export async function uploadProductImage(
  buffer: Buffer,
  opts: {
    productId?: string;
    alt: string;
    originalName?: string;
    sourceType?: string; // "upload" | "url-external" | "amazon" | "miravia"
    originalUrl?: string;
    position?: number;
  },
): Promise<UploadProductResult> {
  const token = assertBlobConfigured();

  let processed;
  try {
    processed = await processImage(buffer);
  } catch (err) {
    if (err instanceof ImageProcessingError) throw err;
    throw new ImageProcessingError("Error desconocido procesando imagen", err);
  }

  const uuid = randomUUID();
  const folder = `products/${opts.productId ?? "unassigned"}`;

  let largeUrl: string;
  let mediumUrl: string;
  let thumbUrl: string;
  try {
    const [large, medium, thumb] = await Promise.all([
      put(variantPath(folder, uuid, "large"), processed.variants.large.buffer, {
        access: "public",
        token,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365, // 1 aÃ±o
      }),
      put(variantPath(folder, uuid, "medium"), processed.variants.medium.buffer, {
        access: "public",
        token,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
      put(variantPath(folder, uuid, "thumb"), processed.variants.thumb.buffer, {
        access: "public",
        token,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
    ]);
    largeUrl = large.url;
    mediumUrl = medium.url;
    thumbUrl = thumb.url;
  } catch (err) {
    throw new BlobUploadError("Fallo al subir a Vercel Blob", err);
  }

  let id: string | null = null;
  if (opts.productId) {
    const record = await db.productImage.create({
      data: {
        productId: opts.productId,
        url: largeUrl,
        urlMedium: mediumUrl,
        urlThumb: thumbUrl,
        alt: opts.alt,
        position: opts.position ?? 0,
        width: processed.variants.large.width,
        height: processed.variants.large.height,
        blurDataUrl: processed.blurDataUrl,
        source: opts.sourceType ?? "upload",
        originalUrl: opts.originalUrl,
      },
      select: { id: true },
    });
    id = record.id;
  }

  return {
    id,
    url: largeUrl,
    urlMedium: mediumUrl,
    urlThumb: thumbUrl,
    blurDataUrl: processed.blurDataUrl,
    width: processed.variants.large.width,
    height: processed.variants.large.height,
  };
}

/**
 * Sube una imagen genÃ©rica (cover blog, logo marca, imagen categorÃ­a).
 * No crea registro en DB â€” el caller actualiza el campo correspondiente.
 */
export async function uploadGenericImage(
  buffer: Buffer,
  opts: {
    folder: "blog" | "brands" | "categories" | "misc";
    name?: string;
    alt: string;
  },
): Promise<UploadGenericResult> {
  const token = assertBlobConfigured();

  const processed = await processImage(buffer);
  const uuid = randomUUID();
  const slug = opts.name
    ? `${opts.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 40)}-${uuid.slice(0, 8)}`
    : uuid;

  try {
    const [large, medium, thumb] = await Promise.all([
      put(variantPath(opts.folder, slug, "large"), processed.variants.large.buffer, {
        access: "public",
        token,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
      put(variantPath(opts.folder, slug, "medium"), processed.variants.medium.buffer, {
        access: "public",
        token,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
      put(variantPath(opts.folder, slug, "thumb"), processed.variants.thumb.buffer, {
        access: "public",
        token,
        contentType: "image/webp",
        addRandomSuffix: false,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      }),
    ]);
    return {
      url: large.url,
      urlMedium: medium.url,
      urlThumb: thumb.url,
      blurDataUrl: processed.blurDataUrl,
      width: processed.variants.large.width,
      height: processed.variants.large.height,
    };
  } catch (err) {
    throw new BlobUploadError("Fallo al subir a Vercel Blob", err);
  }
}

/**
 * Borra un blob por su URL. Tolera 404 (el blob ya no existe).
 */
export async function deleteBlobByUrl(url: string): Promise<void> {
  const token = assertBlobConfigured();
  const { del } = await import("@vercel/blob");
  try {
    await del(url, { token });
  } catch (err) {
    // Vercel Blob lanza si no existe. Solo logamos.
    console.warn("[blob] deleteBlobByUrl fallÃ³:", url, err);
  }
}

/**
 * Borra las 3 variantes asociadas a una URL "large". Ãštil para limpiar tras
 * eliminar una ProductImage del CRM. Se infieren las URLs reemplazando el
 * sufijo `-large.webp` por `-medium.webp` y `-thumb.webp`.
 */
export async function deleteAllVariantsFromLargeUrl(largeUrl: string): Promise<void> {
  const mediumUrl = largeUrl.replace(/-large\.webp(\?.*)?$/, "-medium.webp$1");
  const thumbUrl = largeUrl.replace(/-large\.webp(\?.*)?$/, "-thumb.webp$1");
  await Promise.all([
    deleteBlobByUrl(largeUrl),
    mediumUrl !== largeUrl ? deleteBlobByUrl(mediumUrl) : Promise.resolve(),
    thumbUrl !== largeUrl ? deleteBlobByUrl(thumbUrl) : Promise.resolve(),
  ]);
}
