/**
 * Zona Sport â€” interface abstracta del feed Miravia.
 *
 * Miravia (proveedor de moda deportiva) no expone API pública estable a fecha
 * de hoy: trabajamos con un fichero (CSV / XML / JSON) que llega por SFTP /
 * descarga manual / endpoint web. Esta capa de abstracción nos permite
 * cambiar el origen sin tocar la lógica de sync.
 *
 * Para implementar un nuevo origen:
 *   1. Crea `lib/miravia/adapters/<source>.ts` que exporte
 *      `createXxxProvider(opts)` devolviendo un `MiraviaProvider`.
 *   2. Mapea los campos del feed a `MiraviaItem` (Title Case en español).
 *   3. Tolera vacíos, encodings ISO-8859-1 / Windows-1252 y separadores varios.
 */

export class MiraviaNotConfiguredError extends Error {
  constructor(message = "Miravia no está configurado") {
    super(message);
    this.name = "MiraviaNotConfiguredError";
  }
}

export interface MiraviaItemSize {
  size: string;        // "M", "42", "ÃšNICA"
  ean?: string | null; // EAN del SKU final si está disponible
  stock?: number;      // 0 si no se conoce
}

export interface MiraviaItem {
  /** Identificador estable en el catálogo Miravia (clave de upsert). */
  externalId: string;
  modelCode?: string;
  name: string;
  description?: string;
  brand: string;
  category: string;
  colorName: string;
  colorHex?: string;
  gender?: string;
  composition?: string;
  costPrice?: number | null;
  retailPrice: number;
  sportUse?: string;
  sizes: MiraviaItemSize[];
  imageUrls: string[];
  /** Payload original (para auditoría / debug). */
  raw: Record<string, unknown>;
}

export interface MiraviaProvider {
  name: string;
  fetchCatalog(): AsyncIterable<MiraviaItem>;
}

export function isMiraviaConfigured(): boolean {
  return process.env.MIRAVIA_ENABLED === "true" && !!process.env.MIRAVIA_FEED_URL;
}
