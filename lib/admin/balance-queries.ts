import "server-only";

import { db } from "@/lib/db";
import { SOLD_STATUSES } from "./sales-queries";

/**
 * Cuadro de mando de negocio (/admin/balance): por FAMILIA (textil/calzado/
 * complemento) × GÉNERO, combina:
 *   - INVENTARIO (de Product, siempre actual): coste = Σ(costPrice·stock),
 *     unidades en stock = Σ stock.
 *   - VENTAS del periodo (de OrderItem de pedidos vendidos): unidades vendidas,
 *     total ventas (Σ subtotal) y beneficio (Σ (precio−coste)·uds, con el coste
 *     CONGELADO en la venta; fallback al costPrice actual).
 * Más una tabla general por género y el beneficio por mes (12 meses).
 *
 * Familia: footwearType≠null ⇒ calzado; garmentType≠null ⇒ textil; si no ⇒
 * complemento (accesorios/varios). Género: Product.gender (UNISEX/sin = "Otros").
 */

// Tipos y etiquetas PUROS viven en ./balance-types (sin "server-only") para que
// el componente cliente pueda importarlos sin arrastrar este módulo al navegador.
import {
  GENDER_ORDER,
  FAMILY_ORDER,
  type FamilyKey,
  type GenderKey,
  type Period,
  type Metrics,
  type GenderRow,
  type FamilyTable,
  type BalanceData,
} from "./balance-types";

export type {
  FamilyKey,
  GenderKey,
  Period,
  Metrics,
  GenderRow,
  FamilyTable,
  BalanceData,
} from "./balance-types";
export { FAMILY_LABELS, GENDER_LABELS } from "./balance-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(d: unknown): number {
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  if (d == null) return 0;
  if (typeof d === "number") return safe(d);
  if (typeof d === "string") return safe(Number(d));
  if (typeof d === "object") {
    const obj = d as { toString?: () => string };
    if (typeof obj.toString === "function") return safe(Number(obj.toString()));
  }
  return 0;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function familyOf(footwearType: string | null, garmentType: string | null): FamilyKey {
  if (footwearType) return "calzado";
  if (garmentType) return "textil";
  return "complemento";
}

function genderKey(g: string | null | undefined): GenderKey {
  switch (g) {
    case "HOMBRE":
    case "MUJER":
    case "NINO":
    case "NINA":
    case "BEBE":
      return g;
    default:
      return "OTROS"; // UNISEX / NO_ESPECIFICADO / null
  }
}

function emptyMetrics(): Metrics {
  return { coste: 0, stock: 0, vendidas: 0, ventas: 0, beneficio: 0 };
}

/** Inicio del periodo para las VENTAS. null = sin límite ("todo"). */
function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "mes") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "ano") return new Date(now.getFullYear(), 0, 1);
  return null;
}

/** Clave family::gender. */
const cellKey = (f: FamilyKey, g: GenderKey) => `${f}::${g}`;

// ---------------------------------------------------------------------------
// Cuadro de mando
// ---------------------------------------------------------------------------

export async function getBalance(period: Period): Promise<BalanceData> {
  const cells = new Map<string, Metrics>();
  const cell = (f: FamilyKey, g: GenderKey): Metrics => {
    const k = cellKey(f, g);
    let m = cells.get(k);
    if (!m) {
      m = emptyMetrics();
      cells.set(k, m);
    }
    return m;
  };

  // --- 1) INVENTARIO (actual): coste = Σ costPrice·stock, uds en stock --------
  // Excluimos INACTIVE (descatalogados) del valor de inventario "vivo".
  const products = await db.product.findMany({
    where: { status: { not: "INACTIVE" } },
    select: { gender: true, footwearType: true, garmentType: true, stock: true, costPrice: true },
  });
  for (const p of products) {
    const m = cell(familyOf(p.footwearType, p.garmentType), genderKey(p.gender));
    m.stock += p.stock;
    m.coste += toNum(p.costPrice) * p.stock;
  }

  // --- 2) VENTAS del periodo: uds vendidas, ventas, beneficio -----------------
  const gte = periodStart(period);
  const items = await db.orderItem.findMany({
    where: {
      order: { status: { in: [...SOLD_STATUSES] }, ...(gte ? { createdAt: { gte } } : {}) },
    },
    select: {
      productId: true,
      quantity: true,
      unitPrice: true,
      unitCost: true,
      subtotal: true,
    },
  });

  // Resolver familia/género + costPrice de fallback de los productos vendidos.
  const soldIds = [...new Set(items.map((it) => it.productId).filter((x): x is string => !!x))];
  const prodInfo = new Map<string, { family: FamilyKey; gender: GenderKey; costPrice: unknown }>();
  if (soldIds.length) {
    const rows = await db.product.findMany({
      where: { id: { in: soldIds } },
      select: { id: true, gender: true, footwearType: true, garmentType: true, costPrice: true },
    });
    for (const p of rows) {
      prodInfo.set(p.id, {
        family: familyOf(p.footwearType, p.garmentType),
        gender: genderKey(p.gender),
        costPrice: p.costPrice,
      });
    }
  }

  for (const it of items) {
    const info = it.productId ? prodInfo.get(it.productId) : undefined;
    const family: FamilyKey = info?.family ?? "complemento";
    const gender: GenderKey = info?.gender ?? "OTROS";
    const m = cell(family, gender);
    const price = toNum(it.unitPrice);
    const cost = it.unitCost != null ? toNum(it.unitCost) : toNum(info?.costPrice);
    m.vendidas += it.quantity;
    m.ventas += toNum(it.subtotal);
    m.beneficio += (price - cost) * it.quantity;
  }

  // --- 3) Componer tablas por familia + general por género + total ------------
  const families: FamilyTable[] = FAMILY_ORDER.map((family) => {
    const rows: GenderRow[] = GENDER_ORDER.map((gender) => ({
      gender,
      metrics: roundMetrics(cells.get(cellKey(family, gender)) ?? emptyMetrics()),
    })).filter((r) => !isEmpty(r.metrics));
    const total = roundMetrics(sumMetrics(rows.map((r) => r.metrics)));
    return { family, rows, total };
  });

  const byGender: GenderRow[] = GENDER_ORDER.map((gender) => {
    const ms = FAMILY_ORDER.map((f) => cells.get(cellKey(f, gender))).filter(
      (x): x is Metrics => !!x,
    );
    return { gender, metrics: roundMetrics(sumMetrics(ms)) };
  }).filter((r) => !isEmpty(r.metrics));

  const grandTotal = roundMetrics(sumMetrics([...cells.values()]));

  const profitByMonth = await getProfitByMonth(12);

  return { period, families, byGender, grandTotal, profitByMonth };
}

function sumMetrics(list: Metrics[]): Metrics {
  const acc = emptyMetrics();
  for (const m of list) {
    acc.coste += m.coste;
    acc.stock += m.stock;
    acc.vendidas += m.vendidas;
    acc.ventas += m.ventas;
    acc.beneficio += m.beneficio;
  }
  return acc;
}

function roundMetrics(m: Metrics): Metrics {
  return {
    coste: r2(m.coste),
    stock: m.stock,
    vendidas: m.vendidas,
    ventas: r2(m.ventas),
    beneficio: r2(m.beneficio),
  };
}

function isEmpty(m: Metrics): boolean {
  return m.coste === 0 && m.stock === 0 && m.vendidas === 0 && m.ventas === 0 && m.beneficio === 0;
}

// ---------------------------------------------------------------------------
// Beneficio por mes (últimos N meses)
// ---------------------------------------------------------------------------

export async function getProfitByMonth(
  months = 12,
): Promise<Array<{ month: string; label: string; beneficio: number; ventas: number }>> {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const items = await db.orderItem.findMany({
    where: { order: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte: since } } },
    select: {
      quantity: true,
      unitPrice: true,
      unitCost: true,
      subtotal: true,
      productId: true,
      order: { select: { createdAt: true } },
    },
  });

  // Fallback de coste (unitCost null) → costPrice actual del producto.
  const ids = [
    ...new Set(items.filter((it) => it.unitCost == null && it.productId).map((it) => it.productId as string)),
  ];
  const costMap = new Map<string, unknown>();
  if (ids.length) {
    const rows = await db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, costPrice: true },
    });
    for (const p of rows) costMap.set(p.id, p.costPrice);
  }

  const bucket = new Map<string, { beneficio: number; ventas: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
    bucket.set(monthKey(d), { beneficio: 0, ventas: 0 });
  }
  for (const it of items) {
    const k = monthKey(it.order.createdAt);
    const b = bucket.get(k);
    if (!b) continue;
    const price = toNum(it.unitPrice);
    const cost =
      it.unitCost != null ? toNum(it.unitCost) : toNum(it.productId ? costMap.get(it.productId) : 0);
    b.beneficio += (price - cost) * it.quantity;
    b.ventas += toNum(it.subtotal);
  }

  return Array.from(bucket.entries()).map(([month, v]) => ({
    month,
    label: monthLabel(month),
    beneficio: r2(v.beneficio),
    ventas: r2(v.ventas),
  }));
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MESES_ES = [
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic",
];

function monthLabel(monthKeyStr: string): string {
  const [y, m] = monthKeyStr.split("-");
  const idx = Number(m) - 1;
  return `${MESES_ES[idx] ?? m} ${(y ?? "").slice(2)}`;
}
