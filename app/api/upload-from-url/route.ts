/**
 * POST /api/upload-from-url
 *
 * Ingesta una imagen desde una URL externa (ej: Amazon, Miravia, johnsmith).
 * Body JSON: { url: string, alt: string, productId?: string, type?: "product"|"blog"|"brand"|"category" }
 *
 * Seguridad:
 *   - SesiÃ³n admin.
 *   - Rate limit 50/h por usuario.
 *   - Allowlist de dominios.
 *   - Timeout fetch 10s, mÃ¡ximo 10 MB.
 *   - Content-type real validado por magic bytes.
 */
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  uploadProductImage,
  uploadGenericImage,
  BlobConfigError,
  BlobUploadError,
} from "@/lib/blob/upload";
import { ImageProcessingError } from "@/lib/blob/process";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

const ALLOWED_HOSTS = new Set<string>([
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "www.johnsmith-sport.com",
  "johnsmith-sport.com",
  "www.mas8000.com",
  "mas8000.com",
  "shop.miravia.com",
  "miravia.com",
  "www.miravia.com",
  // Mayorista oficial John Smith / +8000 â€” fuente de imÃ¡genes del PRICAT.
  "www.aguirreycia.es",
  "aguirreycia.es",
]);

function isHostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  if (ALLOWED_HOSTS.has(h)) return true;
  // El propio dominio del Blob de Vercel (acaba en .public.blob.vercel-storage.com)
  if (h.endsWith(".public.blob.vercel-storage.com")) return true;
  return false;
}

function detectMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  const ftyp = buf.slice(4, 8).toString("ascii");
  const brand = buf.slice(8, 12).toString("ascii");
  if (ftyp === "ftyp" && (brand === "avif" || brand === "heic" || brand === "mif1"))
    return "image/avif";
  return null;
}

async function fetchBoundedBytes(url: string): Promise<Buffer> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        // User-Agent realista â€” algunos CDNs bloquean fetch sin UA.
        "User-Agent":
          "Mozilla/5.0 (compatible; ZonaSportBot/1.0; +https://zonasport.es)",
        Accept: "image/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cl = res.headers.get("content-length");
    if (cl && Number(cl) > MAX_BYTES) {
      throw new Error(`Imagen demasiado grande (${cl} bytes)`);
    }
    if (!res.body) throw new Error("Respuesta sin body");

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        reader.cancel();
        throw new Error("Imagen excede 10 MB");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((c) => Buffer.from(c)));
  } finally {
    clearTimeout(timeout);
  }
}

type Body = {
  url?: string;
  alt?: string;
  productId?: string;
  type?: "product" | "blog" | "brand" | "category";
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = rateLimit(`upload-url:${session.user.id}`, {
    limit: 50,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones." },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON invÃ¡lido" }, { status: 400 });
  }

  const urlStr = String(body.url ?? "").trim();
  const alt = String(body.alt ?? "").trim().slice(0, 200);
  const type: "product" | "blog" | "brand" | "category" = body.type ?? "product";

  if (!urlStr) return NextResponse.json({ error: "url requerida" }, { status: 400 });
  if (!alt) return NextResponse.json({ error: "alt requerido" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return NextResponse.json({ error: "URL invÃ¡lida" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Protocolo no permitido" }, { status: 400 });
  }
  if (!isHostAllowed(parsed.hostname)) {
    return NextResponse.json(
      { error: `Dominio no permitido: ${parsed.hostname}` },
      { status: 400 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = await fetchBoundedBytes(parsed.toString());
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timeout descargando la imagen"
          : err.message
        : "Error descargando la imagen";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const realMime = detectMime(buffer);
  if (!realMime) {
    return NextResponse.json(
      { error: "El contenido no parece ser una imagen vÃ¡lida" },
      { status: 400 },
    );
  }

  try {
    let data;
    if (type === "product") {
      data = await uploadProductImage(buffer, {
        productId: body.productId,
        alt,
        sourceType: parsed.hostname.includes("amazon")
          ? "amazon"
          : parsed.hostname.includes("miravia")
            ? "miravia"
            : "url-external",
        originalUrl: parsed.toString(),
      });
    } else {
      const folder = type === "blog" ? "blog" : type === "brand" ? "brands" : "categories";
      data = await uploadGenericImage(buffer, { folder, alt });
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof BlobConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof ImageProcessingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof BlobUploadError) {
      return NextResponse.json({ error: "Error al subir al almacenamiento" }, { status: 500 });
    }
    console.error("[api/upload-from-url] error", err);
    return NextResponse.json({ error: "Error desconocido" }, { status: 500 });
  }
}
