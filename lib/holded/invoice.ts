/**
 * Mapeo pedido → documento Holded y emisión de la factura. Server-only.
 *
 * Modelo B: aquí SOLO se factura lo que debe ir a VeriFactu — pedidos online y
 * facturas a petición. Las ventas de TPV (tienda) NO llaman a esto.
 *
 * IVA: nuestros precios son CON IVA (21% incl.). Holded espera el precio
 * UNITARIO SIN IVA por línea + el % de IVA, y recalcula el total. Enviamos el
 * neto en alta precisión (sin pre-redondear) para que Holded redondee UNA vez
 * al final y el total reconstruya el importe cobrado. Tras emitir se VERIFICA
 * que el total de Holded == el total del pedido; si no cuadra se deja marcado en
 * metadata + logs (la factura ya es irreversible, pero nunca queda mal en
 * silencio). El endpoint /api/admin/holded-test valida esto con una proforma.
 */
import "server-only";
import { db, type Prisma } from "@/lib/db";
import {
  createDocument,
  getDocument,
  type HoldedCreateDocBody,
  type HoldedItem,
} from "./client";

const DEFAULT_VAT = 21;

/** Precio unitario SIN IVA a partir del precio CON IVA (sin pre-redondear). */
function netUnit(grossInclVat: number, vatPct = DEFAULT_VAT): number {
  if (!Number.isFinite(grossInclVat) || grossInclVat <= 0) return 0;
  return grossInclVat / (1 + vatPct / 100);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Convierte Prisma.Decimal / string / number a number. */
function decToNum(d: unknown): number {
  if (d == null) return 0;
  if (typeof d === "number") return Number.isFinite(d) ? d : 0;
  const n = Number(typeof d === "string" ? d : (d as { toString(): string }).toString());
  return Number.isFinite(n) ? n : 0;
}

/** Lee el total (gross) de un documento devuelto por Holded. null si no se puede. */
function readDocTotal(doc: Record<string, unknown>): number | null {
  const t = doc.total;
  if (typeof t === "number") return Number.isFinite(t) ? t : null;
  if (typeof t === "string" && t.trim() !== "") {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Datos fiscales para una factura COMPLETA (con NIF). Sin esto = simplificada. */
export type FiscalData = {
  nif?: string;
  name?: string;
  address?: string;
  city?: string;
  cp?: string;
  province?: string;
};

export type IssueInvoiceOptions = {
  fiscal?: FiscalData;
  /** % de IVA (por defecto 21). */
  vatPct?: number;
};

/** Forma mínima de pedido que necesita el mapeo (DB o sintética para pruebas). */
export type OrderForInvoice = {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  shippingCost: unknown;
  total: unknown;
  items: Array<{
    productName: string;
    variantSize: string | null;
    unitPrice: unknown;
    quantity: number;
  }>;
};

/** Construye el cuerpo del documento + el total que esperamos que devuelva Holded. */
export function buildInvoiceBody(
  order: OrderForInvoice,
  opts: IssueInvoiceOptions = {},
): { body: HoldedCreateDocBody; expectedTotal: number } {
  const vat = opts.vatPct ?? DEFAULT_VAT;

  const items: HoldedItem[] = order.items.map((it) => ({
    name: it.productName + (it.variantSize ? ` (Talla ${it.variantSize})` : ""),
    units: it.quantity,
    subtotal: netUnit(decToNum(it.unitPrice), vat),
    tax: vat,
  }));

  const shipping = decToNum(order.shippingCost);
  if (shipping > 0) {
    items.push({ name: "Gastos de envío", units: 1, subtotal: netUnit(shipping, vat), tax: vat });
  }

  const f = opts.fiscal;
  const body: HoldedCreateDocBody = {
    applyContactDefaults: false,
    contactName: f?.name || order.customerName || "Cliente de mostrador",
    contactEmail: order.customerEmail || undefined,
    contactCode: f?.nif || undefined,
    contactAddress: f?.address || undefined,
    contactCity: f?.city || undefined,
    contactCp: f?.cp || undefined,
    contactProvince: f?.province || undefined,
    contactCountryCode: "ES",
    // Fecha de EMISIÓN (hoy), no la del pedido: el id del documento es la fecha
    // de expedición de la factura. Holded la muestra en la zona horaria de la
    // cuenta (España), evitando el desfase UTC de medianoche.
    date: Math.floor(Date.now() / 1000),
    currency: "eur",
    language: "es",
    items,
    notes: `Pedido ${order.id}`,
  };

  return { body, expectedTotal: round2(decToNum(order.total)) };
}

export type IssueResult = {
  ok: boolean;
  alreadyInvoiced?: boolean;
  docId?: string;
  invoiceNumber?: string | null;
  /** Aviso no fatal: factura emitida pero su total no cuadra con lo cobrado. */
  warning?: string;
  error?: string;
};

/**
 * Emite la factura (documento `invoice`, fiscal) de un pedido en Holded.
 *
 * Anti-duplicado (Stripe entrega eventos at-least-once + dos tipos de evento):
 * se RECLAMA el pedido de forma atómica (updateMany con guarda holdedDocId/
 * invoicedAt NULL) ANTES de llamar a Holded. Si no se obtiene el reclamo, otro
 * proceso ya está facturando → no se re-emite. Si Holded falla, se LIBERA el
 * reclamo para poder reintentar. Así dos entregas simultáneas no generan dos
 * facturas/numeraciones AEAT.
 *
 * Tras crear la factura se verifica el total contra el cobrado; un descuadre se
 * marca en metadata + logs (la factura ya es irreversible).
 */
export async function issueInvoiceForOrder(
  orderId: string,
  opts: IssueInvoiceOptions = {},
): Promise<IssueResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      shippingCost: true,
      total: true,
      holdedDocId: true,
      metadata: true,
      items: {
        select: { productName: true, variantSize: true, unitPrice: true, quantity: true },
      },
    },
  });
  if (!order) return { ok: false, error: "Pedido no encontrado" };
  if (order.holdedDocId) {
    return { ok: true, alreadyInvoiced: true, docId: order.holdedDocId };
  }
  if (!order.items.length) return { ok: false, error: "El pedido no tiene líneas" };

  // Reclamo ATÓMICO: marca invoicedAt SOLO si nadie lo ha reclamado/facturado.
  const claim = await db.order.updateMany({
    where: { id: orderId, holdedDocId: null, invoicedAt: null },
    data: { invoicedAt: new Date() },
  });
  if (claim.count === 0) {
    const fresh = await db.order.findUnique({
      where: { id: orderId },
      select: { holdedDocId: true },
    });
    return { ok: true, alreadyInvoiced: true, docId: fresh?.holdedDocId ?? undefined };
  }

  // A partir de aquí SOMOS los dueños del reclamo. Si algo falla antes de
  // persistir el docId, liberamos el reclamo (invoicedAt → null) para reintentar.
  const releaseClaim = () =>
    db.order.updateMany({
      where: { id: orderId, holdedDocId: null },
      data: { invoicedAt: null },
    });

  const { body, expectedTotal } = buildInvoiceBody(order, opts);

  let docId: string | undefined;
  let invoiceNumber: string | null = null;
  try {
    const res = await createDocument("invoice", body);
    docId = res.id;
    invoiceNumber = res.invoiceNum ?? res.docNumber ?? null;
  } catch (e) {
    await releaseClaim();
    throw e;
  }
  if (!docId) {
    await releaseClaim();
    return { ok: false, error: "Holded no devolvió id de documento" };
  }

  // Verificación post-emisión: ¿el total de Holded == el cobrado? La factura ya
  // existe (irreversible); un descuadre se deja VISIBLE, nunca se ignora.
  let warning: string | undefined;
  let mismatch: { expected: number; holded: number } | null = null;
  try {
    const doc = await getDocument("invoice", docId);
    const holdedTotal = readDocTotal(doc);
    if (holdedTotal != null && Math.abs(holdedTotal - expectedTotal) >= 0.005) {
      mismatch = { expected: expectedTotal, holded: holdedTotal };
      warning = `Factura ${invoiceNumber ?? docId} emitida, pero el total de Holded (${holdedTotal} €) no cuadra con lo cobrado (${expectedTotal} €). Revisar en Holded.`;
      console.error(`[holded] DESCUADRE total en ${docId} (pedido ${orderId}): esperado ${expectedTotal}, Holded ${holdedTotal}`);
    }
  } catch {
    /* el GET de verificación no debe bloquear: la factura ya está emitida */
  }

  const existingMeta =
    order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
      ? (order.metadata as Record<string, unknown>)
      : {};

  await db.order.update({
    where: { id: order.id },
    data: {
      holdedDocId: docId,
      holdedInvoiceNumber: invoiceNumber,
      invoicedAt: new Date(),
      ...(mismatch
        ? { metadata: { ...existingMeta, invoiceTotalMismatch: mismatch } as Prisma.InputJsonValue }
        : {}),
    },
  });

  return { ok: true, docId, invoiceNumber, warning };
}
