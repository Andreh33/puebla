/**
 * POST /api/upload
 *
 * Recibe multipart/form-data con uno o varios archivos `file`.
 *
 * Query params:
 *   ?type=product   → guarda como ProductImage (requiere productId si se quiere
 *                     crear registro, si no se devuelve la URL para que el
 *                     caller la asocie luego).
 *   ?type=blog      → uploadGenericImage(folder=blog)
 *   ?type=brand     → uploadGenericImage(folder=brands)
 *   ?type=category  → uploadGenericImage(folder=categories)
 *
 * Form fields adicionales:
 *   - alt        (string, requerido para SEO)
 *   - productId  (string, opcional, sólo para type=product)
 *
 * Seguridad:
 *   - Requiere sesión admin.
 *   - Rate limit 50/h por usuario.
 *   - Mime real validado por magic bytes (no extensión).
 *   - Tamaño máximo 10 MB por archivo.
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

export const runtime = "nodejs"; // sharp requiere Node.js, no Edge
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

type UploadType = "product" | "blog" | "brand" | "category";

function detectMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  // WebP: "RIFF....WEBP"
  if (
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  // AVIF: ftypavif / ftypheic
  const ftyp = buf.slice(4, 8).toString("ascii");
  const brand = buf.slice(8, 12).toString("ascii");
  if (ftyp === "ftyp" && (brand === "avif" || brand === "heic" || brand === "mif1"))
    return "image/avif";
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rl = rateLimit(`upload:${session.user.id}`, {
    limit: 50,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Espera unos minutos." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const type = (req.nextUrl.searchParams.get("type") ?? "product") as UploadType;
  if (!["product", "blog", "brand", "category"].includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });
  }

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }

  const altRaw = String(form.get("alt") ?? "").trim();
  if (!altRaw) {
    return NextResponse.json(
      { error: "El campo 'alt' es obligatorio (SEO)" },
      { status: 400 },
    );
  }
  const alt = altRaw.slice(0, 200);
  const productId = String(form.get("productId") ?? "").trim() || undefined;

  const results: Array<{
    name: string;
    ok: boolean;
    data?: unknown;
    error?: string;
  }> = [];

  for (const file of files) {
    const safeName = sanitizeFilename(file.name);
    if (file.size > MAX_BYTES) {
      results.push({
        name: safeName,
        ok: false,
        error: `Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)} MB, máx 10 MB)`,
      });
      continue;
    }

    let buffer: Buffer;
    try {
      const ab = await file.arrayBuffer();
      buffer = Buffer.from(ab);
    } catch {
      results.push({ name: safeName, ok: false, error: "No se pudo leer el archivo" });
      continue;
    }

    const realMime = detectMime(buffer);
    if (!realMime || !ALLOWED_MIME.has(realMime)) {
      results.push({
        name: safeName,
        ok: false,
        error: `Formato no permitido (detectado: ${realMime ?? "desconocido"})`,
      });
      continue;
    }

    try {
      let data;
      if (type === "product") {
        data = await uploadProductImage(buffer, {
          productId,
          alt,
          originalName: safeName,
          sourceType: "upload",
        });
      } else {
        const folder = type === "blog" ? "blog" : type === "brand" ? "brands" : "categories";
        data = await uploadGenericImage(buffer, {
          folder,
          alt,
          name: safeName.replace(/\.[^.]+$/, ""),
        });
      }
      results.push({ name: safeName, ok: true, data });
    } catch (err) {
      if (err instanceof BlobConfigError) {
        return NextResponse.json({ error: err.message }, { status: 503 });
      }
      const msg =
        err instanceof ImageProcessingError
          ? err.message
          : err instanceof BlobUploadError
            ? "Error al subir al almacenamiento"
            : "Error desconocido";
      console.error("[api/upload] fallo en archivo", safeName, err);
      results.push({ name: safeName, ok: false, error: msg });
    }
  }

  const anyOk = results.some((r) => r.ok);
  return NextResponse.json({ results }, { status: anyOk ? 200 : 400 });
}

function sanitizeFilename(name: string): string {
  // NUNCA confiar en el nombre del cliente para el path. Esto es solo para
  // logging y respuesta — el path real en Blob usa UUID v4.
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}
