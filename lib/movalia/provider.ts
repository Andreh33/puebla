/**
 * Zona Sport — interface abstracta del feed Movalia.
 *
 * Movalia (proveedor de moda deportiva) no expone API pública estable a fecha
 * de hoy: trabajamos con un fichero (CSV / XML / JSON) que llega por SFTP /
 * descarga manual / endpoint web. Esta capa de abstracción nos permite
 * cambiar el origen sin tocar la lógica de sync.
 *
 * Para implementar un nuevo origen:
 *   1. Crea `lib/movalia/adapters/<source>.ts` que exporte
 *      `createXxxProvider(opts)` devolviendo un `MovaliaProvider`.
 *   2. Mapea los campos del feed a `MovaliaItem` (Title Case en español).
 *   3. Tolera vacíos, encodings ISO-8859-1 / Windows-1252 y separadores varios.
 */

export class MovaliaNotConfiguredError extends Error {
  constructor(message = "Movalia no está configurado") {
    super(message);
    this.name = "MovaliaNotConfiguredError";
  }
}

export interface MovaliaItemSize {
  size: string;        // "M", "42", "ÚNICA"
  ean?: string | null; // EAN del SKU final si está disponible
  stock?: number;      // 0 si no se conoce
}

export interface MovaliaItem {
  /** Identificador estable en el catálogo Movalia (clave de upsert). */
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
  sizes: MovaliaItemSize[];
  imageUrls: string[];
  /** Payload original (para auditoría / debug). */
  raw: Record<string, unknown>;
}

export interface MovaliaProvider {
  name: string;
  fetchCatalog(): AsyncIterable<MovaliaItem>;
}

export function isMovaliaConfigured(): boolean {
  return process.env.MOVALIA_ENABLED === "true" && !!process.env.MOVALIA_FEED_URL;
}
