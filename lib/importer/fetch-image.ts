/**
 * Descarga una imagen externa para el importador.
 *
 * Comparte la lógica de seguridad con `/api/upload-from-url`:
 *   - Fetch con AbortController (timeout 12s).
 *   - Lectura por chunks acotada a 10MB.
 *   - Validación del mime por magic bytes (no por extensión ni Content-Type).
 *   - User-Agent realista — aguirreycia.es y similares rechazan fetch sin UA.
 *
 * Devuelve { ok: true, buffer, mime } o { ok: false, error } sin lanzar.
 */

const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

function detectMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  const ftyp = buf.subarray(4, 8).toString("ascii");
  const brand = buf.subarray(8, 12).toString("ascii");
  if (ftyp === "ftyp" && (brand === "avif" || brand === "heic" || brand === "mif1")) {
    return "image/avif";
  }
  return null;
}

export type FetchImageResult =
  | { ok: true; buffer: Buffer; mime: string; finalUrl: string }
  | { ok: false; error: string };

export async function fetchImageBytes(url: string): Promise<FetchImageResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "URL inválida" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Protocolo no permitido" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // UA de browser real: el WordPress del cliente (Wordfence / WAF) bloquea
    // UAs que se autoidentifican como bots devolviendo HTTP 403. Headers
    // completos al estilo Chrome desktop para pasar filtros conservadores.
    const res = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "cross-site",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        // Algunos CDNs requieren Referer del propio dominio (a su raíz).
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
      },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const cl = res.headers.get("content-length");
    if (cl && Number(cl) > MAX_BYTES) {
      return { ok: false, error: `Imagen demasiado grande (${cl} bytes)` };
    }
    if (!res.body) return { ok: false, error: "Respuesta sin body" };

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return { ok: false, error: "Imagen excede 10 MB" };
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const mime = detectMime(buffer);
    if (!mime) {
      return { ok: false, error: "El contenido no es una imagen válida" };
    }
    return { ok: true, buffer, mime, finalUrl: parsed.toString() };
  } catch (err) {
    const e = err as Error;
    if (e.name === "AbortError") return { ok: false, error: "Timeout descargando imagen" };
    return { ok: false, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}
