import sharp from "sharp";

const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
// Keep supplier hosts aligned with next.config.ts images.remotePatterns.
const PHOTO_HOSTS = new Set([
  "zonasport.vercel.app",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "www.johnsmith-sport.com",
  "www.mas8000.com",
  "www.aguirreycia.es",
  "aguirreycia.es",
]);

/** Normalize imported WebP/AVIF photos before handing them to Satori. */
export async function productOgPhoto(source: string | null | undefined): Promise<string | null> {
  if (!source) return null;

  try {
    const url = new URL(source, "https://zonasport.vercel.app");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      (!PHOTO_HOSTS.has(url.hostname) &&
        !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(url.hostname))
    )
      return null;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      redirect: "error",
      next: { revalidate: 300 },
    });
    if (!response.ok || !response.body) return null;
    if (Number(response.headers.get("content-length")) > MAX_SOURCE_BYTES) {
      await response.body.cancel();
      return null;
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_SOURCE_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const png = await sharp(Buffer.concat(chunks), {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({ width: 796, height: 1116, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    // A slow/missing supplier image must not break the public preview endpoint.
    return null;
  }
}
