/**
 * POST /api/admin/holded-test
 *
 * Verifica la integración con Holded SIN emitir ninguna factura fiscal:
 *   1. Construye el cuerpo del documento desde un pedido (real con ?orderId=…
 *      o uno sintético de ejemplo).
 *   2. Crea una PROFORMA (`proform`) — NO es factura, NO va a la AEAT, NO
 *      consume numeración.
 *   3. La recupera para leer el total que calcula Holded y compararlo con el
 *      total esperado (valida el mapeo del IVA).
 *   4. La BORRA (salvo ?keep=1).
 *
 * Auth: Header `Authorization: Bearer ${SETUP_TOKEN}`.
 *
 * Uso:
 *   curl -X POST ".../api/admin/holded-test" -H "authorization: Bearer <TOKEN>"
 *   curl -X POST ".../api/admin/holded-test?orderId=<id>&keep=1" -H "authorization: Bearer <TOKEN>"
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  isHoldedConfigured,
  createDocument,
  getDocument,
  deleteDocument,
  HoldedError,
} from "@/lib/holded/client";
import { buildInvoiceBody, type OrderForInvoice } from "@/lib/holded/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.SETUP_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SETUP_TOKEN no configurado en este entorno" },
      { status: 503 },
    );
  }
  const header = req.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (got !== expected) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  return null;
}

/**
 * Pedido de ejemplo con precios CON IVA realistas.
 *  - por defecto: 124,88 € (1×19,95 + 2×49,99 + 4,95 envío).
 *  - ?basket=awkward: 120,62 € (3×9,99 + 7×12,95) — cantidades > 1 y precios
 *    "feos" que estresan el redondeo por línea del IVA.
 */
function syntheticOrder(basket: string | null): OrderForInvoice {
  if (basket === "awkward") {
    return {
      id: "PRUEBA-REDONDEO",
      customerName: "Prueba Zona Sport",
      customerEmail: null,
      shippingCost: 0,
      total: 120.62,
      items: [
        { productName: "Calcetines técnicos", variantSize: null, unitPrice: 9.99, quantity: 3 },
        { productName: "Camiseta algodón", variantSize: "L", unitPrice: 12.95, quantity: 7 },
      ],
    };
  }
  return {
    id: "PRUEBA-CONEXION",
    customerName: "Prueba Zona Sport",
    customerEmail: null,
    shippingCost: 4.95,
    total: 124.88,
    items: [
      { productName: "Camiseta técnica", variantSize: "M", unitPrice: 19.95, quantity: 1 },
      { productName: "Zapatillas running", variantSize: "42", unitPrice: 49.99, quantity: 2 },
    ],
  };
}

function extractTotal(doc: Record<string, unknown>): number | null {
  const t = doc.total;
  if (typeof t === "number") return Number.isFinite(t) ? t : null;
  if (typeof t === "string" && t.trim() !== "") {
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauthorized = checkAuth(req);
  if (unauthorized) return unauthorized;

  if (!isHoldedConfigured()) {
    return NextResponse.json(
      { ok: false, error: "HOLDED_API_KEY no configurada en Vercel (añádela y vuelve a desplegar)" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");
  const keep = url.searchParams.get("keep") === "1";

  let order: OrderForInvoice;
  if (orderId) {
    const o = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        shippingCost: true,
        total: true,
        items: {
          select: { productName: true, variantSize: true, unitPrice: true, quantity: true },
        },
      },
    });
    if (!o) {
      return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
    }
    order = o;
  } else {
    order = syntheticOrder(url.searchParams.get("basket"));
  }

  const { body, expectedTotal } = buildInvoiceBody(order);

  try {
    // 1. Crear PROFORMA (no fiscal — seguro para pruebas).
    const created = await createDocument("proform", body);
    const docId = created.id;
    if (!docId) {
      return NextResponse.json(
        { ok: false, step: "create", error: "Holded no devolvió id de documento", created },
        { status: 502 },
      );
    }

    // 2. Recuperar la proforma para leer el total calculado por Holded.
    let holdedTotal: number | null = null;
    try {
      const fetched = await getDocument("proform", docId);
      holdedTotal = extractTotal(fetched);
    } catch {
      /* el GET puede fallar sin invalidar la prueba de creación */
    }

    // 3. Borrar la proforma de prueba (salvo ?keep=1).
    let deleted = false;
    if (!keep) {
      try {
        await deleteDocument("proform", docId);
        deleted = true;
      } catch {
        /* se informa abajo: la proforma quedó creada y hay que borrarla a mano */
      }
    }

    const totalsMatch =
      holdedTotal != null && Math.abs(holdedTotal - expectedTotal) < 0.005;

    return NextResponse.json({
      ok: true,
      connection: "OK",
      source: orderId ? `pedido ${orderId}` : "pedido sintético de ejemplo",
      proformaId: docId,
      expectedTotal,
      holdedTotal,
      totalsMatch,
      deleted,
      kept: keep,
      sentItems: body.items,
      note: totalsMatch
        ? "✅ Conexión OK y el total cuadra: el mapeo del IVA es correcto."
        : "⚠️ Conexión OK pero el total no cuadra todavía: revisar formato del IVA/redondeo antes de emitir facturas reales.",
    });
  } catch (e) {
    if (e instanceof HoldedError) {
      const authIssue = e.status === 401 || e.status === 400;
      const hint = authIssue
        ? "Holded rechaza el token. Revisa: (1) que el token tenga PERMISOS de Facturación/Ventas + Contactos (un token sin permisos da 401), (2) que esté pegado COMPLETO en Vercel HOLDED_API_KEY, (3) que el plan esté activo. Tras cambiarlo en Vercel hay que REDESPLEGAR."
        : undefined;
      return NextResponse.json(
        { ok: false, error: e.message, status: e.status, body: e.body, ...(hint ? { hint } : {}) },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "error desconocido" },
      { status: 500 },
    );
  }
}
