import "server-only";

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Estados que cuentan como VENTA (excluye PENDING/CANCELLED/REFUNDED).
// ---------------------------------------------------------------------------

export const SOLD_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type SalesKpis = {
  ingresos: number;
  pedidos: number;
  ticketMedio: number;
  unidades: number;
  beneficio: number;
  /** Σ total de pedidos REFUNDED en la ventana (informativo, no resta de ingresos). */
  devueltos: number;
};

export type SalesByDay = Array<{ date: string; ingresos: number; pedidos: number }>;

export type TopProducto = { productName: string; unidades: number; ingresos: number };

export type VentasPorCanal = {
  online: { pedidos: number; ingresos: number };
  inStore: { pedidos: number; ingresos: number };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO yyyy-mm-dd en hora LOCAL (no UTC) para agrupar por día de calendario. */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Convierte Decimal de Prisma | DecimalJsLike | primitivos a number.
 * Tolerante a null/NaN (devuelve 0).
 */
function toNum(d: unknown): number {
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  if (d == null) return 0;
  if (typeof d === "number") return safe(d);
  if (typeof d === "string") return safe(Number(d));
  if (typeof d === "object" && d !== null) {
    const obj = d as { toString?: () => string };
    if (typeof obj.toString === "function") return safe(Number(obj.toString()));
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Cálculo PURO de beneficio (testeable sin DB)
// ---------------------------------------------------------------------------

/**
 * Línea de venta para el cálculo de margen. El coste es el `unitCost` CONGELADO
 * en el momento de la venta; si es null (pedidos antiguos previos a la columna)
 * cae al `costPrice` ACTUAL del producto. Si ambos faltan, coste = 0.
 */
export type ProfitLine = {
  unitPrice: number | string | { toString(): string } | null | undefined;
  unitCost?: number | string | { toString(): string } | null;
  quantity: number;
  product?: { costPrice: number | string | { toString(): string } | null } | null;
};

/**
 * Beneficio bruto = Σ (precioUnitario − coste) × cantidad.
 * coste = unitCost ?? product.costPrice ?? 0.
 * FUNCIÓN PURA: misma entrada → misma salida, sin efectos.
 */
export function computeProfit(items: ProfitLine[]): number {
  let profit = 0;
  for (const it of items) {
    const price = toNum(it.unitPrice);
    const cost =
      it.unitCost != null ? toNum(it.unitCost) : toNum(it.product?.costPrice);
    profit += (price - cost) * it.quantity;
  }
  return Math.round(profit * 100) / 100;
}

// ---------------------------------------------------------------------------
// KPIs de ventas
// ---------------------------------------------------------------------------

export async function getSalesKpis(days = 30): Promise<SalesKpis> {
  try {
    const gte = daysAgo(days);

    const [agg, unitsAgg, rawItems, refundedAgg] = await Promise.all([
      // Ingresos y nº de pedidos.
      db.order.aggregate({
        where: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      // Unidades vendidas (Σ quantity de las líneas de pedidos vendidos).
      db.orderItem.aggregate({
        where: {
          order: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte } },
        },
        _sum: { quantity: true },
      }),
      // Líneas de venta con el coste congelado. OrderItem.productId es un id
      // "suelto" (sin relación FK en el schema), así que el costPrice actual
      // (fallback para unitCost null) se resuelve aparte, en bloque.
      db.orderItem.findMany({
        where: {
          order: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte } },
        },
        select: { unitPrice: true, unitCost: true, quantity: true, productId: true },
      }),
      // Devoluciones (informativo).
      db.order.aggregate({
        where: { status: "REFUNDED", createdAt: { gte } },
        _sum: { total: true },
      }),
    ]);

    // costPrice ACTUAL por producto, solo para las líneas SIN unitCost congelado.
    const fallbackIds = [
      ...new Set(
        rawItems
          .filter((it) => it.unitCost == null && it.productId)
          .map((it) => it.productId as string),
      ),
    ];
    const costMap = new Map<string, unknown>();
    if (fallbackIds.length) {
      const products = await db.product.findMany({
        where: { id: { in: fallbackIds } },
        select: { id: true, costPrice: true },
      });
      for (const p of products) costMap.set(p.id, p.costPrice);
    }

    const items: ProfitLine[] = rawItems.map((it) => ({
      unitPrice: it.unitPrice,
      unitCost: it.unitCost,
      quantity: it.quantity,
      product:
        it.unitCost == null && it.productId
          ? {
              costPrice: (costMap.get(it.productId) ?? null) as
                | number
                | string
                | { toString(): string }
                | null,
            }
          : null,
    }));

    const ingresos = toNum(agg._sum.total);
    const pedidos = agg._count._all;
    const unidades = unitsAgg._sum.quantity ?? 0;
    const beneficio = computeProfit(items);
    const devueltos = toNum(refundedAgg._sum.total);

    return {
      ingresos,
      pedidos,
      ticketMedio: pedidos > 0 ? Math.round((ingresos / pedidos) * 100) / 100 : 0,
      unidades,
      beneficio,
      devueltos,
    };
  } catch {
    return {
      ingresos: 0,
      pedidos: 0,
      ticketMedio: 0,
      unidades: 0,
      beneficio: 0,
      devueltos: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Serie diaria de ventas
// ---------------------------------------------------------------------------

export async function getSalesByDay(days = 30): Promise<SalesByDay> {
  try {
    const since = daysAgo(days - 1);
    const orders = await db.order.findMany({
      where: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte: since } },
      select: { createdAt: true, total: true },
    });

    // Serie continua: rellena días sin ventas con 0.
    const bucket = new Map<string, { ingresos: number; pedidos: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      bucket.set(localDay(d), { ingresos: 0, pedidos: 0 });
    }
    for (const o of orders) {
      const k = localDay(o.createdAt);
      const cur = bucket.get(k);
      if (cur) {
        cur.ingresos = Math.round((cur.ingresos + toNum(o.total)) * 100) / 100;
        cur.pedidos += 1;
      }
    }
    return Array.from(bucket.entries()).map(([date, v]) => ({
      date,
      ingresos: v.ingresos,
      pedidos: v.pedidos,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Top productos vendidos
// ---------------------------------------------------------------------------

export async function getTopProductos(days = 30, limit = 8): Promise<TopProducto[]> {
  try {
    const gte = daysAgo(days);
    const rows = await db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });
    return rows.map((r) => ({
      productName: r.productName,
      unidades: r._sum.quantity ?? 0,
      ingresos: toNum(r._sum.subtotal),
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Ventas por canal (online vs tienda física)
// ---------------------------------------------------------------------------

export async function getVentasPorCanal(days = 30): Promise<VentasPorCanal> {
  try {
    const gte = daysAgo(days);
    const [inStore, all] = await Promise.all([
      db.order.aggregate({
        where: {
          status: { in: [...SOLD_STATUSES] },
          createdAt: { gte },
          deliveryMethod: "in_store",
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      db.order.aggregate({
        where: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte } },
        _sum: { total: true },
        _count: { _all: true },
      }),
    ]);

    const inStorePedidos = inStore._count._all;
    const inStoreIngresos = toNum(inStore._sum.total);
    const totalPedidos = all._count._all;
    const totalIngresos = toNum(all._sum.total);

    return {
      online: {
        pedidos: totalPedidos - inStorePedidos,
        ingresos: Math.round((totalIngresos - inStoreIngresos) * 100) / 100,
      },
      inStore: { pedidos: inStorePedidos, ingresos: inStoreIngresos },
    };
  } catch {
    return {
      online: { pedidos: 0, ingresos: 0 },
      inStore: { pedidos: 0, ingresos: 0 },
    };
  }
}
