/**
 * Validación de archivos ANTES de subirlos (cliente). Pura y testeable: no toca
 * DOM ni red, así que la usa la UI y los tests por igual. Produce "issues" con
 * mensajes específicos y en lenguaje claro para mostrarlos en un aviso centrado
 * (ver components/admin/UploadErrorDialog.tsx).
 *
 * Filosofía: solo rechazamos lo que el servidor RECHAZARÍA con seguridad (no
 * imagen / tabla evidente, vacío, o por encima del tamaño máximo). En concreto
 * NO bloqueamos HEIC: las fotos de iPhone pueden subirse bien por la ruta de
 * compresión en Safari/iOS, y bloquearlas rompería ese camino.
 */

export type UploadIssueCode = "empty" | "type" | "size" | "missing-alt" | "too-many";

export type UploadIssue = {
  code: UploadIssueCode;
  /** Nombre del archivo afectado (si aplica). */
  fileName?: string;
  /** Título corto y específico del problema. */
  title: string;
  /** Explicación clara de qué pasa y cómo resolverlo. */
  message: string;
};

/** Estructura lista para pintar en el modal centrado. */
export type UploadError = {
  title: string;
  issues: Array<{ fileName?: string; message: string }>;
  /** Pie opcional con formatos/límite aceptados. */
  hint?: string;
};

export const IMAGE_MAX_MB = 10;
export const TABLE_MAX_MB = 20;

/** Extensiones que "parecen" imagen (fallback cuando el navegador no da MIME). */
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
  ".heic",
  ".heif",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
];

export type FileLike = { name: string; type: string; size: number };

function fmtMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Valida una imagen. Devuelve el problema o null si es válida. Orden: vacío →
 * tipo → tamaño (el mensaje más relevante primero).
 */
export function validateImageFile(
  file: FileLike,
  maxSizeMB: number = IMAGE_MAX_MB,
): UploadIssue | null {
  if (file.size === 0) {
    return {
      code: "empty",
      fileName: file.name,
      title: "El archivo está vacío",
      message: `«${file.name}» no tiene contenido (0 KB). Puede que la copia o la descarga se cortara; vuelve a generarlo y reinténtalo.`,
    };
  }

  const lower = file.name.toLowerCase();
  const looksImageExt = IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  // Aceptamos si CUALQUIERA de las dos señales dice "imagen": el MIME del
  // navegador O la extensión. Algunos móviles etiquetan fotos como
  // `application/octet-stream`; el servidor las acepta (valida por magic bytes),
  // así que el cliente no debe bloquear una imagen real por un MIME genérico.
  // Solo rechazamos cuando AMBAS señales fallan (p. ej. un .pdf real).
  const typeIsImage = file.type.startsWith("image/") || looksImageExt;
  if (!typeIsImage) {
    return {
      code: "type",
      fileName: file.name,
      title: "Eso no es una imagen",
      message: `«${file.name}» no es una imagen. Solo admito fotos en JPG, PNG, WebP o AVIF.`,
    };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      code: "size",
      fileName: file.name,
      title: "La imagen pesa demasiado",
      message: `«${file.name}» ocupa ${fmtMB(file.size)} y el máximo son ${maxSizeMB} MB. Haz la foto con menos resolución o redúcela antes de subirla.`,
    };
  }

  return null;
}

/**
 * Valida un archivo de tabla/catálogo (importaciones). Orden: tipo (extensión) →
 * vacío → tamaño, igual que la validación previa de los importadores.
 */
export function validateTableFile(
  file: FileLike,
  opts: { exts: string[]; maxSizeMB?: number; label?: string },
): UploadIssue | null {
  const { exts, maxSizeMB = TABLE_MAX_MB, label } = opts;
  const lower = file.name.toLowerCase();

  if (!exts.some((ext) => lower.endsWith(ext))) {
    return {
      code: "type",
      fileName: file.name,
      title: "Formato no soportado",
      message: `«${file.name}» no tiene un formato válido. Acepto: ${label ?? exts.join(", ")}.`,
    };
  }
  if (file.size === 0) {
    return {
      code: "empty",
      fileName: file.name,
      title: "El archivo está vacío",
      message: `«${file.name}» no tiene contenido (0 KB). Vuelve a exportarlo y reinténtalo.`,
    };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      code: "size",
      fileName: file.name,
      title: "El archivo pesa demasiado",
      message: `«${file.name}» ocupa ${fmtMB(file.size)} y el máximo son ${maxSizeMB} MB.`,
    };
  }

  return null;
}

/**
 * Agrupa una lista de problemas en un UploadError para el modal. Devuelve null
 * si no hay problemas. Con uno usa su propio título; con varios, un título con
 * el conteo.
 */
export function issuesToUploadError(
  issues: UploadIssue[],
  hint?: string,
): UploadError | null {
  if (!issues.length) return null;
  const title =
    issues.length === 1
      ? issues[0]!.title
      : `${issues.length} archivos no se pudieron añadir`;
  return {
    title,
    issues: issues.map((i) => ({ fileName: i.fileName, message: i.message })),
    hint,
  };
}
