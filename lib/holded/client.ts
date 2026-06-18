/**
 * Cliente HTTP de Holded (Invoicing API v1), server-only.
 *
 * Filosofía (espejo de lib/stripe/client.ts): NO se construye nada en
 * import-time. Cada función lee `HOLDED_API_KEY` en runtime; si falta, las
 * llamadas lanzan un HoldedError 503 con mensaje útil (el build de Vercel no
 * falla por ausencia de la key, y los endpoints devuelven un error claro).
 *
 * Auth: la API v1 usa la cabecera `key: <API_KEY>` (NO Bearer; eso es la v2).
 * Base: https://api.holded.com/api/invoicing/v1
 *
 * IMPORTANTE (fiscal): crear un documento `invoice` EMITE una factura real; con
 * VeriFactu activo en Holded, al aprobarse se transmite a la AEAT. Para PROBAR
 * sin consecuencias se usa el tipo `proform` (proforma: no fiscal, no AEAT, no
 * consume numeración). Ver lib/holded/invoice.ts y /api/admin/holded-test.
 */
import "server-only";

const BASE = "https://api.holded.com/api/invoicing/v1";

/** Lee y limpia la API key. null si no está configurada. */
export function getHoldedKey(): string | null {
  const key = process.env.HOLDED_API_KEY;
  if (!key) return null;
  // Defensa: una key pegada en Vercel puede traer espacios/saltos de línea que
  // romperían la cabecera. Las keys de Holded no llevan whitespace.
  const clean = key.replace(/\s+/g, "");
  return clean || null;
}

export function isHoldedConfigured(): boolean {
  return Boolean(getHoldedKey());
}

/** Error de Holded con el status HTTP y el cuerpo (parseado si se pudo). */
export class HoldedError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "HoldedError";
  }
}

/** Tipos de documento soportados por la API (subset que usamos). */
export type HoldedDocType =
  | "invoice" // factura (fiscal → VeriFactu)
  | "salesreceipt" // recibo de venta
  | "creditnote" // factura rectificativa
  | "proform"; // proforma (NO fiscal — para pruebas)

/** Línea de documento. `subtotal` = precio UNITARIO SIN IVA; `tax` = % de IVA. */
export type HoldedItem = {
  name: string;
  desc?: string;
  units: number;
  subtotal: number;
  tax: number;
  discount?: number;
};

/** Cuerpo para crear un documento. Campos de contacto opcionales (factura
 *  simplificada = sin contactCode/NIF). */
export type HoldedCreateDocBody = {
  applyContactDefaults?: boolean;
  contactName?: string;
  contactCode?: string; // NIF/CIF
  contactEmail?: string;
  contactAddress?: string;
  contactCity?: string;
  contactCp?: string;
  contactProvince?: string;
  contactCountryCode?: string;
  date?: number; // unix SECONDS
  currency?: string;
  language?: string;
  items: HoldedItem[];
  notes?: string;
};

/** Respuesta típica de creación: { status:1, info:"Created", id:"…", invoiceNum?:"…" }. */
export type HoldedCreateResult = {
  status?: number | boolean;
  info?: string;
  id?: string;
  invoiceNum?: string;
  docNumber?: string;
};

/**
 * fetch tipado contra Holded. Lanza HoldedError si:
 *  - falta la key (503),
 *  - el HTTP no es 2xx,
 *  - el cuerpo trae `status` 0/false (Holded a veces responde 200 con error).
 */
async function holdedFetch<T>(path: string, init: RequestInit): Promise<T> {
  const key = getHoldedKey();
  if (!key) {
    throw new HoldedError("HOLDED_API_KEY no configurada en este entorno", 503, null);
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        key,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    throw new HoldedError(
      `Error de red llamando a Holded: ${e instanceof Error ? e.message : "desconocido"}`,
      0,
      null,
    );
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new HoldedError(`Holded HTTP ${res.status}: ${detail}`, res.status, body);
  }

  // Holded puede responder 200 con { status: 0, info: "<mensaje de error>" }.
  if (body && typeof body === "object" && "status" in body) {
    const st = (body as { status?: unknown }).status;
    if (st === 0 || st === false || st === "0") {
      const info = (body as { info?: unknown }).info;
      throw new HoldedError(
        `Holded rechazó la petición: ${typeof info === "string" ? info : "status 0"}`,
        res.status,
        body,
      );
    }
  }

  return body as T;
}

/** Crea un documento. Para `invoice` esto EMITE una factura real. */
export function createDocument(docType: HoldedDocType, body: HoldedCreateDocBody) {
  return holdedFetch<HoldedCreateResult>(`/documents/${docType}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Recupera un documento (para verificar totales calculados por Holded). */
export function getDocument(docType: HoldedDocType, id: string) {
  return holdedFetch<Record<string, unknown>>(`/documents/${docType}/${id}`, {
    method: "GET",
  });
}

/** Borra un documento (lo usamos para limpiar las proformas de prueba). */
export function deleteDocument(docType: HoldedDocType, id: string) {
  return holdedFetch<{ status?: number | boolean; info?: string }>(
    `/documents/${docType}/${id}`,
    { method: "DELETE" },
  );
}
