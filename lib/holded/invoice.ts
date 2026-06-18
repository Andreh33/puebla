/**
 * Mapeo pedido → documento Holded y emisión de la factura. Server-only.
 *
 * Modelo B: aquí SOLO se factura lo que debe ir a VeriFactu — pedidos online y
 * facturas a petición. Las ventas de TPV (tienda) NO llaman a esto.
 *
 * IVA: nuestros precios son CON IVA (21% incl.). Holded espera el precio
 * UNITARIO SIN IVA por línea + el % de IVA, y recalcula el total. Enviamos el
 * neto en alta precisión (sin pre-redondear) para que Holded redondee UNA vez
 * al final y el total reconstruya el importe cobrado. El endpoint de prueba
 * (/api/admin/holded-test) verifica que el total de Holded == total del pedido.
 */
import "server-only";
import { db } from "@/lib/db";
import {
  createDocument,
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
  createdAt: Date;
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
    date: Math.floor(order.createdAt.getTime() / 1000),
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
  error?: string;
};

/**
 * Emite la factura (documento `invoice`, fiscal) de un pedido en Holded.
 * Idempotente: si el pedido ya tiene holdedDocId, no re-emite. Guarda el id +
 * número + fecha en el pedido.
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
      createdAt: true,
      holdedDocId: true,
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

  const { body } = buildInvoiceBody(order, opts);
  const res = await createDocument("invoice", body);
  const docId = res.id;
  if (!docId) return { ok: false, error: "Holded no devolvió id de documento" };

  const invoiceNumber = res.invoiceNum ?? res.docNumber ?? null;
  await db.order.update({
    where: { id: order.id },
    data: { holdedDocId: docId, holdedInvoiceNumber: invoiceNumber, invoicedAt: new Date() },
  });

  return { ok: true, docId, invoiceNumber };
}
