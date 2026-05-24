# TPV de tienda física (`/admin/pedidos`) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar ventas en tienda física desde `/admin/pedidos`: descontar stock, emitir un comprobante PDF + texto y enviarlo por WhatsApp, sin depender de Stripe.

**Architecture:** Lógica pura y testeable en `lib/pos/*` (SKU por variante, totales con IVA incluido, planificación de venta, texto del comprobante). La persistencia (descuento de stock + `Order`/`OrderItem`) vive en una server action dentro de una `$transaction`. El PDF se genera en servidor y se sube a Vercel Blob. La UI es un componente cliente colocado junto a la página de pedidos. La página de pedidos deja de bloquearse por Stripe.

**Tech Stack:** Next.js 15 (App Router, server actions), Prisma 6, React 19, Tailwind 4, `@react-pdf/renderer` (nuevo), `@vercel/blob` (ya instalado), vitest.

**Spec:** `docs/superpowers/specs/2026-05-24-tpv-tienda-fisica-design.md`

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/pos/sku.ts` | `buildVariantSku`, `skuOrFallback`, `productFamily`. Puro. |
| `lib/pos/totals.ts` | `planTotals` (IVA incluido, descuentos). Puro. |
| `lib/pos/receipt-text.ts` | `buildReceiptText`. Puro. |
| `lib/pos/sale.ts` | `planSale` (puro, valida + arma líneas/totales/deltas de stock) + `createInStoreSale` (persiste en `$transaction`). |
| `lib/pos/receipt.tsx` | `renderReceiptPdf(order)` con `@react-pdf/renderer`. |
| `app/admin/pedidos/pos-actions.ts` | `searchProductsForPos`, `createInStoreSaleAction`, `generateTicketAction`. |
| `app/admin/pedidos/PosSale.tsx` | UI cliente del TPV. |
| `app/admin/pedidos/page.tsx` | Reestructurar: TPV + tabla siempre; Stripe no bloquea. |
| `next.config.ts` | `serverExternalPackages += "@react-pdf/renderer"`. |
| Tests | `tests/unit/pos-sku.test.ts`, `pos-totals.test.ts`, `pos-receipt-text.test.ts`, `pos-plan-sale.test.ts`. |

---

## Task 1: Instalar dependencia PDF y marcarla como externa

**Files:**
- Modify: `package.json` (vía npm)
- Modify: `next.config.ts:60-75` (array `serverExternalPackages`)

- [ ] **Step 1: Instalar `@react-pdf/renderer`**

Run: `npm install @react-pdf/renderer@^4`
Expected: se añade a `dependencies` sin errores de peer deps.

- [ ] **Step 2: Marcarla como paquete externo del servidor**

En `next.config.ts`, dentro del array `serverExternalPackages`, añade la línea (tras `"stripe",`):

```ts
    "stripe",
    // @react-pdf/renderer es Node-only (fontkit/yoga); fuera del bundler de prod.
    "@react-pdf/renderer",
  ],
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore(tpv): add @react-pdf/renderer + serverExternalPackages"
```

---

## Task 2: `lib/pos/sku.ts` — SKU por variante (TDD)

**Files:**
- Create: `lib/pos/sku.ts`
- Test: `tests/unit/pos-sku.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// tests/unit/pos-sku.test.ts
import { describe, it, expect } from "vitest";
import { buildVariantSku, skuOrFallback, productFamily } from "@/lib/pos/sku";

describe("productFamily", () => {
  it("deriva calzado/textil/accesorio del slug de la categoría principal", () => {
    expect(productFamily("hombre-calzado")).toBe("calzado");
    expect(productFamily("mujer-textil")).toBe("textil");
    expect(productFamily("accesorios")).toBe("accesorio");
    expect(productFamily(null)).toBe("accesorio");
  });
});

describe("buildVariantSku", () => {
  it("calzado: SKU/talla", () => {
    expect(buildVariantSku({ baseSku: "LLO878", size: "40", family: "calzado" })).toBe("LLO878/40");
  });
  it("textil: SKU + letra de talla (sin barra)", () => {
    expect(buildVariantSku({ baseSku: "LLO878", size: "L", family: "textil" })).toBe("LLO878L");
  });
  it("sin talla: SKU base", () => {
    expect(buildVariantSku({ baseSku: "BAL123", size: null, family: "accesorio" })).toBe("BAL123");
    expect(buildVariantSku({ baseSku: "BAL123", size: "", family: "calzado" })).toBe("BAL123");
  });
});

describe("skuOrFallback", () => {
  it("usa sku; si no, modelCode; si no, externalId; si no, id corto en mayúsculas", () => {
    expect(skuOrFallback({ sku: "ABC", modelCode: "M1", externalId: "E1", id: "abcdefghij" })).toBe("ABC");
    expect(skuOrFallback({ sku: null, modelCode: "M1", externalId: "E1", id: "abcdefghij" })).toBe("M1");
    expect(skuOrFallback({ sku: null, modelCode: null, externalId: "E1", id: "abcdefghij" })).toBe("E1");
    expect(skuOrFallback({ sku: null, modelCode: null, externalId: null, id: "abcdefghij" })).toBe("ABCDEFGH");
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/pos-sku.test.ts`
Expected: FAIL ("Cannot find module '@/lib/pos/sku'").

- [ ] **Step 3: Implementar**

```ts
// lib/pos/sku.ts
export type ProductFamily = "calzado" | "textil" | "accesorio";

/** Familia a partir del slug de la categoría principal (mismo criterio que el admin). */
export function productFamily(primaryCategorySlug: string | null | undefined): ProductFamily {
  if (primaryCategorySlug?.endsWith("-calzado")) return "calzado";
  if (primaryCategorySlug?.endsWith("-textil")) return "textil";
  return "accesorio";
}

/** SKU por unidad vendida: calzado `SKU/talla`, textil `SKUtalla`, sin talla `SKU`. */
export function buildVariantSku(opts: {
  baseSku: string;
  size: string | null | undefined;
  family: ProductFamily;
}): string {
  const { baseSku, size, family } = opts;
  if (!size) return baseSku;
  return family === "calzado" ? `${baseSku}/${size}` : `${baseSku}${size}`;
}

/** SKU base o fallback (igual que la tabla de productos del admin). */
export function skuOrFallback(p: {
  sku: string | null;
  modelCode: string | null;
  externalId: string | null;
  id: string;
}): string {
  return p.sku || p.modelCode || p.externalId || p.id.slice(0, 8).toUpperCase();
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/pos-sku.test.ts`
Expected: PASS (todos verdes).

- [ ] **Step 5: Commit**

```bash
git add lib/pos/sku.ts tests/unit/pos-sku.test.ts
git commit -m "feat(tpv): SKU por variante (calzado/textil/accesorio)"
```

---

## Task 3: `lib/pos/totals.ts` — Totales con IVA incluido (TDD)

**Files:**
- Create: `lib/pos/totals.ts`
- Test: `tests/unit/pos-totals.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// tests/unit/pos-totals.test.ts
import { describe, it, expect } from "vitest";
import { round2, planTotals } from "@/lib/pos/totals";

describe("round2", () => {
  it("redondea a 2 decimales (half-up)", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(19.99)).toBe(19.99);
  });
});

describe("planTotals (IVA 21% incluido)", () => {
  it("una línea sin descuentos", () => {
    const t = planTotals({ lineSubtotals: [60], totalDiscount: 0 });
    expect(t.total).toBe(60);
    expect(t.tax).toBe(10.41); // 60 - 60/1.21
    expect(t.subtotal).toBe(49.59);
  });
  it("varias líneas con descuento total", () => {
    const t = planTotals({ lineSubtotals: [30, 30], totalDiscount: 10 });
    expect(t.total).toBe(50);
    expect(t.tax).toBe(8.68);
    expect(t.subtotal).toBe(41.32);
  });
  it("nunca devuelve total negativo", () => {
    const t = planTotals({ lineSubtotals: [10], totalDiscount: 999 });
    expect(t.total).toBe(0);
    expect(t.tax).toBe(0);
    expect(t.subtotal).toBe(0);
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/pos-totals.test.ts`
Expected: FAIL ("Cannot find module '@/lib/pos/totals'").

- [ ] **Step 3: Implementar**

```ts
// lib/pos/totals.ts
/** IVA por defecto (v1): 21% incluido en los precios retail. */
export const IVA_RATE = 21;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Totales de una venta con precios IVA-incluido. `lineSubtotals` ya trae cada
 * línea con su descuento de línea aplicado. `total = Σlíneas - totalDiscount`,
 * acotado a 0. `tax` = IVA contenido en el total; `subtotal` = base sin IVA.
 */
export function planTotals(opts: {
  lineSubtotals: number[];
  totalDiscount?: number;
  ivaRate?: number;
}): { subtotal: number; tax: number; total: number } {
  const ivaRate = opts.ivaRate ?? IVA_RATE;
  const gross = opts.lineSubtotals.reduce((a, b) => a + b, 0);
  const total = Math.max(0, round2(gross - (opts.totalDiscount ?? 0)));
  const base = round2(total / (1 + ivaRate / 100));
  const tax = round2(total - base);
  return { subtotal: base, tax, total };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/pos-totals.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pos/totals.ts tests/unit/pos-totals.test.ts
git commit -m "feat(tpv): cálculo de totales con IVA incluido"
```

---

## Task 4: `lib/pos/sale.ts` — `planSale` puro (TDD)

**Files:**
- Create: `lib/pos/sale.ts`
- Test: `tests/unit/pos-plan-sale.test.ts`

`planSale` recibe las líneas pedidas + el catálogo resuelto y devuelve líneas
calculadas, totales y deltas de stock, o lanza error si falta stock. Es la parte
pura y testeable; `createInStoreSale` (Task 7 lo usa) solo persiste.

- [ ] **Step 1: Escribir el test que falla**

```ts
// tests/unit/pos-plan-sale.test.ts
import { describe, it, expect } from "vitest";
import { planSale, type PosLineInput, type PosProduct } from "@/lib/pos/sale";

const SHOE: PosProduct = {
  id: "p1", name: "Zapatilla LLO878 Azul", sku: "LLO878", modelCode: null,
  externalId: null, primaryCategorySlug: "hombre-calzado", taxRate: 21,
  productStock: 0, sizes: [{ size: "40", stock: 3 }, { size: "41", stock: 0 }],
};
const BALL: PosProduct = {
  id: "p2", name: "Balón Joma", sku: "BAL1", modelCode: null,
  externalId: null, primaryCategorySlug: "accesorios", taxRate: 21,
  productStock: 5, sizes: [],
};

describe("planSale", () => {
  it("calzado: descuenta de la talla y compone SKU/talla", () => {
    const lines: PosLineInput[] = [{ productId: "p1", size: "40", quantity: 2, unitPrice: 30, lineDiscount: 0 }];
    const r = planSale(lines, [SHOE]);
    expect(r.items[0]!.productSku).toBe("LLO878/40");
    expect(r.items[0]!.subtotal).toBe(60);
    expect(r.totals.total).toBe(60);
    expect(r.stockDeltas).toEqual([{ productId: "p1", size: "40", quantity: 2 }]);
  });

  it("accesorio sin talla: descuenta de Product.stock y SKU base", () => {
    const r = planSale([{ productId: "p2", size: null, quantity: 1, unitPrice: 12, lineDiscount: 0 }], [BALL]);
    expect(r.items[0]!.productSku).toBe("BAL1");
    expect(r.stockDeltas).toEqual([{ productId: "p2", size: null, quantity: 1 }]);
  });

  it("lanza si la talla no tiene stock suficiente", () => {
    expect(() => planSale([{ productId: "p1", size: "41", quantity: 1, unitPrice: 30, lineDiscount: 0 }], [SHOE]))
      .toThrow(/stock/i);
  });

  it("lanza si el producto no existe o la cantidad es <= 0", () => {
    expect(() => planSale([{ productId: "x", size: null, quantity: 1, unitPrice: 1, lineDiscount: 0 }], [SHOE])).toThrow();
    expect(() => planSale([{ productId: "p2", size: null, quantity: 0, unitPrice: 1, lineDiscount: 0 }], [BALL])).toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/pos-plan-sale.test.ts`
Expected: FAIL ("Cannot find module '@/lib/pos/sale'").

- [ ] **Step 3: Implementar la parte pura (`planSale` + tipos)**

```ts
// lib/pos/sale.ts
import "server-only";
import { db, type Prisma } from "@/lib/db";
import { buildVariantSku, productFamily, skuOrFallback } from "@/lib/pos/sku";
import { planTotals, round2 } from "@/lib/pos/totals";

export type PosLineInput = {
  productId: string;
  size: string | null;
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
};

export type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  modelCode: string | null;
  externalId: string | null;
  primaryCategorySlug: string | null;
  taxRate: number;
  productStock: number;
  sizes: Array<{ size: string; stock: number }>;
};

export type PlannedItem = {
  productId: string;
  productName: string;
  productSku: string;
  variantSize: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type StockDelta = { productId: string; size: string | null; quantity: number };

export type PlannedSale = {
  items: PlannedItem[];
  stockDeltas: StockDelta[];
  totals: { subtotal: number; tax: number; total: number };
};

/** Valida stock y compone líneas/totales/deltas. Lanza Error con mensaje claro. */
export function planSale(
  lines: PosLineInput[],
  products: PosProduct[],
  totalDiscount = 0,
): PlannedSale {
  if (!lines.length) throw new Error("El carrito está vacío.");
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: PlannedItem[] = [];
  const stockDeltas: StockDelta[] = [];

  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p) throw new Error(`Producto no encontrado: ${line.productId}`);
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error(`Cantidad inválida para "${p.name}".`);
    }
    if (line.unitPrice < 0) throw new Error(`Precio inválido para "${p.name}".`);

    // Stock: por talla si se indicó; si no, stock del producto.
    if (line.size) {
      const ps = p.sizes.find((s) => s.size === line.size);
      if (!ps) throw new Error(`La talla ${line.size} no existe en "${p.name}".`);
      if (ps.stock < line.quantity) {
        throw new Error(`Sin stock suficiente de "${p.name}" talla ${line.size} (hay ${ps.stock}).`);
      }
    } else if (p.productStock < line.quantity) {
      throw new Error(`Sin stock suficiente de "${p.name}" (hay ${p.productStock}).`);
    }

    const family = productFamily(p.primaryCategorySlug);
    const baseSku = skuOrFallback(p);
    const subtotal = Math.max(0, round2(line.unitPrice * line.quantity - (line.lineDiscount ?? 0)));
    items.push({
      productId: p.id,
      productName: p.name,
      productSku: buildVariantSku({ baseSku, size: line.size, family }),
      variantSize: line.size,
      unitPrice: round2(line.unitPrice),
      quantity: line.quantity,
      subtotal,
    });
    stockDeltas.push({ productId: p.id, size: line.size, quantity: line.quantity });
  }

  const totals = planTotals({ lineSubtotals: items.map((i) => i.subtotal), totalDiscount });
  return { items, stockDeltas, totals };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/pos-plan-sale.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pos/sale.ts tests/unit/pos-plan-sale.test.ts
git commit -m "feat(tpv): planSale puro (validación de stock + líneas + totales)"
```

---

## Task 5: `createInStoreSale` — persistencia en transacción

**Files:**
- Modify: `lib/pos/sale.ts` (añadir al final)

(No hay test unitario de DB; se valida en el paso manual de la Task 10. La lógica
de riesgo —validación/stock— ya está cubierta por `planSale`.)

- [ ] **Step 1: Añadir tipos de entrada y la función persistente**

Añade al final de `lib/pos/sale.ts`:

```ts
export type PaymentMethod = "efectivo" | "tarjeta" | "bizum";

export type CreateSaleInput = {
  lines: PosLineInput[];
  paymentMethod: PaymentMethod;
  totalDiscount?: number;
  customer?: { name?: string; phone?: string };
};

export type CreatedSale = {
  orderId: string;
  ticketNumber: string;
  totals: { subtotal: number; tax: number; total: number };
};

/** Nº de ticket legible (no fiscal): ZS-AAAAMMDD-#### (count del día + 1). */
async function nextTicketNumber(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const dayStart = new Date(y, now.getMonth(), now.getDate());
  const dayEnd = new Date(y, now.getMonth(), now.getDate() + 1);
  const count = await tx.order.count({
    where: { createdAt: { gte: dayStart, lt: dayEnd }, deliveryMethod: "in_store" },
  });
  return `ZS-${y}${m}${d}-${String(count + 1).padStart(4, "0")}`;
}

/** Registra la venta en tienda: descuenta stock + crea Order/OrderItem. No toca status. */
export async function createInStoreSale(
  input: CreateSaleInput,
  userId?: string,
): Promise<CreatedSale> {
  // Catálogo necesario para planificar (dentro de la TX para consistencia de stock).
  const productIds = [...new Set(input.lines.map((l) => l.productId))];

  return db.$transaction(async (tx) => {
    const rows = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true, name: true, sku: true, modelCode: true, externalId: true,
        stock: true, taxRate: true,
        primaryCategory: { select: { slug: true } },
        sizes: { select: { size: true, stock: true } },
      },
    });
    const products: PosProduct[] = rows.map((r) => ({
      id: r.id, name: r.name, sku: r.sku, modelCode: r.modelCode, externalId: r.externalId,
      primaryCategorySlug: r.primaryCategory?.slug ?? null,
      taxRate: Number(r.taxRate), productStock: r.stock, sizes: r.sizes,
    }));

    const planned = planSale(input.lines, products, input.totalDiscount ?? 0);

    // Descontar stock (talla o producto).
    for (const delta of planned.stockDeltas) {
      if (delta.size) {
        await tx.productSize.updateMany({
          where: { productId: delta.productId, size: delta.size },
          data: { stock: { decrement: delta.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: delta.productId },
          data: { stock: { decrement: delta.quantity } },
        });
      }
    }

    const ticketNumber = await nextTicketNumber(tx);

    const order = await tx.order.create({
      data: {
        customerName: input.customer?.name || null,
        customerPhone: input.customer?.phone || null,
        subtotal: planned.totals.subtotal.toFixed(2),
        shippingCost: "0",
        tax: planned.totals.tax.toFixed(2),
        total: planned.totals.total.toFixed(2),
        currency: "EUR",
        status: "PAID",
        paymentStatus: input.paymentMethod,
        deliveryMethod: "in_store",
        metadata: { channel: "pos", paymentMethod: input.paymentMethod, ticketNumber },
        items: {
          create: planned.items.map((it) => ({
            productId: it.productId,
            productName: it.productName,
            productSku: it.productSku,
            variantSize: it.variantSize,
            unitPrice: it.unitPrice.toFixed(2),
            quantity: it.quantity,
            subtotal: it.subtotal.toFixed(2),
          })),
        },
      },
      select: { id: true },
    });

    await tx.productAudit.createMany({
      data: productIds.map((productId) => ({ productId, userId, action: "pos_sale" })),
    });

    return { orderId: order.id, ticketNumber, totals: planned.totals };
  });
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/pos/sale.ts
git commit -m "feat(tpv): createInStoreSale (descuenta stock + crea Order en transacción)"
```

---

## Task 6: `lib/pos/receipt-text.ts` — Comprobante en texto (TDD)

**Files:**
- Create: `lib/pos/receipt-text.ts`
- Test: `tests/unit/pos-receipt-text.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// tests/unit/pos-receipt-text.test.ts
import { describe, it, expect } from "vitest";
import { buildReceiptText } from "@/lib/pos/receipt-text";

describe("buildReceiptText", () => {
  const base = {
    ticketNumber: "ZS-20260524-0001",
    createdAt: new Date("2026-05-24T18:30:00"),
    items: [
      { productName: "Zapatilla LLO878 Azul", variantSize: "40", productSku: "LLO878/40", quantity: 1, subtotal: 49.99 },
    ],
    subtotal: 41.31, tax: 8.68, total: 49.99,
    paymentMethod: "efectivo" as const,
    ticketUrl: "https://blob.example/ticket.pdf",
  };

  it("incluye tienda, nº ticket, línea con talla y total", () => {
    const txt = buildReceiptText(base);
    expect(txt).toContain("Zona Sport");
    expect(txt).toContain("ZS-20260524-0001");
    expect(txt).toContain("Zapatilla LLO878 Azul");
    expect(txt).toContain("talla 40");
    expect(txt).toContain("49,99");
    expect(txt).toContain("https://blob.example/ticket.pdf");
  });

  it("omite el enlace si no hay ticketUrl", () => {
    const txt = buildReceiptText({ ...base, ticketUrl: null });
    expect(txt).not.toContain("Ver ticket");
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/unit/pos-receipt-text.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// lib/pos/receipt-text.ts
import { STORE_NAP } from "@/lib/seo/schema-org";

export type ReceiptData = {
  ticketNumber: string;
  createdAt: Date;
  items: Array<{
    productName: string;
    variantSize: string | null;
    productSku: string;
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "efectivo" | "tarjeta" | "bizum";
  ticketUrl: string | null;
};

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const PAY_LABEL: Record<ReceiptData["paymentMethod"], string> = {
  efectivo: "Efectivo", tarjeta: "Tarjeta", bizum: "Bizum",
};

/** Comprobante en texto plano para WhatsApp (no fiscal). */
export function buildReceiptText(r: ReceiptData): string {
  const date = r.createdAt.toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const lines = r.items.map((it) => {
    const size = it.variantSize ? ` (talla ${it.variantSize})` : "";
    return `• ${it.quantity}× ${it.productName}${size} — ${it.productSku} — ${eur(it.subtotal)}`;
  });
  const out = [
    `*Zona Sport* — Comprobante ${r.ticketNumber}`,
    `${STORE_NAP.streetAddress}, ${STORE_NAP.postalCode} ${STORE_NAP.addressLocality}`,
    date,
    "",
    ...lines,
    "",
    `Base: ${eur(r.subtotal)}  ·  IVA: ${eur(r.tax)}`,
    `*Total: ${eur(r.total)}*  (${PAY_LABEL[r.paymentMethod]})`,
    "",
    "Comprobante de venta — no es factura. Solicítala en tienda con tus datos fiscales.",
  ];
  if (r.ticketUrl) out.push("", `Ver ticket: ${r.ticketUrl}`);
  return out.join("\n");
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npx vitest run tests/unit/pos-receipt-text.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pos/receipt-text.ts tests/unit/pos-receipt-text.test.ts
git commit -m "feat(tpv): comprobante en texto para WhatsApp"
```

---

## Task 7: `lib/pos/receipt.tsx` — PDF del comprobante

**Files:**
- Create: `lib/pos/receipt.tsx`

(Generación de PDF; no se unit-testea la salida binaria. Se valida en Task 10.)

- [ ] **Step 1: Implementar el documento PDF**

```tsx
// lib/pos/receipt.tsx
import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { STORE_NAP } from "@/lib/seo/schema-org";
import type { ReceiptData } from "@/lib/pos/receipt-text";

const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} EUR`;

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#0b1220" },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  muted: { color: "#6b7280" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  hr: { borderBottomWidth: 1, borderColor: "#e5e7eb", marginVertical: 8 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", fontFamily: "Helvetica-Bold", fontSize: 12 },
  foot: { marginTop: 18, fontSize: 8, color: "#6b7280" },
});

export async function renderReceiptPdf(r: ReceiptData): Promise<Buffer> {
  const date = r.createdAt.toLocaleString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const doc = (
    <Document>
      <Page size="A5" style={s.page}>
        <Text style={s.h1}>Zona Sport</Text>
        <Text style={s.muted}>
          {STORE_NAP.streetAddress}, {STORE_NAP.postalCode} {STORE_NAP.addressLocality}
        </Text>
        <Text style={s.muted}>Tel. +34 689 11 06 91</Text>
        <View style={s.hr} />
        <View style={s.row}>
          <Text>Comprobante {r.ticketNumber}</Text>
          <Text style={s.muted}>{date}</Text>
        </View>
        <View style={s.hr} />
        {r.items.map((it, i) => (
          <View key={i} style={s.row}>
            <Text>
              {it.quantity}x {it.productName}
              {it.variantSize ? ` (talla ${it.variantSize})` : ""} — {it.productSku}
            </Text>
            <Text>{eur(it.subtotal)}</Text>
          </View>
        ))}
        <View style={s.hr} />
        <View style={s.row}>
          <Text style={s.muted}>Base</Text>
          <Text>{eur(r.subtotal)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.muted}>IVA (21%)</Text>
          <Text>{eur(r.tax)}</Text>
        </View>
        <View style={s.totalRow}>
          <Text>TOTAL</Text>
          <Text>{eur(r.total)}</Text>
        </View>
        <Text style={s.foot}>
          Comprobante de venta — no es factura. Solicítala en tienda con tus datos fiscales.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exit 0. (Si hay error de JSX en @react-pdf, confirmar que el archivo es `.tsx` y que `@react-pdf/renderer` está instalado.)

- [ ] **Step 3: Commit**

```bash
git add lib/pos/receipt.tsx
git commit -m "feat(tpv): PDF del comprobante (@react-pdf/renderer)"
```

---

## Task 8: `app/admin/pedidos/pos-actions.ts` — Server actions

**Files:**
- Create: `app/admin/pedidos/pos-actions.ts`

- [ ] **Step 1: Implementar las tres acciones**

```ts
// app/admin/pedidos/pos-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createInStoreSale, type CreateSaleInput } from "@/lib/pos/sale";
import { productFamily, skuOrFallback } from "@/lib/pos/sku";
import { renderReceiptPdf } from "@/lib/pos/receipt";
import { buildReceiptText, type ReceiptData } from "@/lib/pos/receipt-text";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  return session;
}

export type PosSearchResult = {
  id: string;
  name: string;
  baseSku: string;
  family: "calzado" | "textil" | "accesorio";
  mainImageUrl: string | null;
  unitPrice: number; // salePrice ?? retailPrice
  productStock: number;
  sizes: Array<{ size: string; stock: number }>;
};

/** Busca productos ACTIVE/visibles por nombre, sku, modelo o EAN para el TPV. */
export async function searchProductsForPos(q: string): Promise<PosSearchResult[]> {
  await requireSession();
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await db.product.findMany({
    where: {
      status: { in: ["ACTIVE", "OUT_OF_STOCK", "DRAFT"] },
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { modelCode: { contains: term, mode: "insensitive" } },
        { sizes: { some: { ean: { contains: term } } } },
      ],
    },
    take: 20,
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, sku: true, modelCode: true, externalId: true,
      mainImageUrl: true, retailPrice: true, salePrice: true, stock: true,
      primaryCategory: { select: { slug: true } },
      sizes: { select: { size: true, stock: true }, orderBy: { position: "asc" } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    baseSku: skuOrFallback(r),
    family: productFamily(r.primaryCategory?.slug ?? null),
    mainImageUrl: r.mainImageUrl,
    unitPrice: Number(r.salePrice ?? r.retailPrice),
    productStock: r.stock,
    sizes: r.sizes,
  }));
}

export async function createInStoreSaleAction(input: CreateSaleInput): Promise<
  { ok: true; orderId: string; ticketNumber: string } | { ok: false; error: string }
> {
  const session = await requireSession();
  try {
    const res = await createInStoreSale(input, session.user.id);
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/productos");
    return { ok: true, orderId: res.orderId, ticketNumber: res.ticketNumber };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al registrar la venta" };
  }
}

/** Genera el PDF del comprobante, lo sube a Blob y guarda la url + devuelve texto. */
export async function generateTicketAction(orderId: string): Promise<
  { ok: true; ticketUrl: string; text: string } | { ok: false; error: string }
> {
  await requireSession();
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return { ok: false, error: "Pedido no encontrado" };
    const meta = (order.metadata ?? {}) as Record<string, unknown>;
    const ticketNumber = String(meta.ticketNumber ?? order.id.slice(0, 8));
    const paymentMethod = (meta.paymentMethod as ReceiptData["paymentMethod"]) ?? "efectivo";

    const data: ReceiptData = {
      ticketNumber,
      createdAt: order.createdAt,
      items: order.items.map((it) => ({
        productName: it.productName,
        variantSize: it.variantSize,
        productSku: it.productSku ?? "",
        quantity: it.quantity,
        subtotal: Number(it.subtotal),
      })),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      paymentMethod,
      ticketUrl: null,
    };

    const pdf = await renderReceiptPdf(data);
    const blob = await put(`tickets/${ticketNumber}.pdf`, pdf, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });

    await db.order.update({
      where: { id: orderId },
      data: { metadata: { ...meta, ticketNumber, ticketUrl: blob.url } },
    });

    const text = buildReceiptText({ ...data, ticketUrl: blob.url });
    return { ok: true, ticketUrl: blob.url, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error al generar el ticket" };
  }
}
```

- [ ] **Step 2: Verificar typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/admin/pedidos/pos-actions.ts`
Expected: exit 0 (warnings ok).

- [ ] **Step 3: Commit**

```bash
git add app/admin/pedidos/pos-actions.ts
git commit -m "feat(tpv): server actions (buscar, registrar venta, generar ticket)"
```

---

## Task 9: `app/admin/pedidos/PosSale.tsx` — UI del TPV

**Files:**
- Create: `app/admin/pedidos/PosSale.tsx`

- [ ] **Step 1: Implementar el componente cliente**

```tsx
// app/admin/pedidos/PosSale.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Plus, Trash2, Receipt, MessageCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPriceEUR } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";
import {
  searchProductsForPos, createInStoreSaleAction, generateTicketAction,
  type PosSearchResult,
} from "./pos-actions";
import type { PaymentMethod } from "@/lib/pos/sale";

type CartLine = {
  key: string;
  productId: string;
  name: string;
  family: PosSearchResult["family"];
  size: string | null;
  sizes: PosSearchResult["sizes"];
  productStock: number;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
};

const IVA = 0.21;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function PosSale() {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<PosSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [payment, setPayment] = React.useState<PaymentMethod>("efectivo");
  const [totalDiscount, setTotalDiscount] = React.useState(0);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [lastSale, setLastSale] = React.useState<{ orderId: string; ticketNumber: string } | null>(null);
  const [ticket, setTicket] = React.useState<{ url: string; text: string } | null>(null);

  // Buscador con debounce
  React.useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchProductsForPos(q)); }
      catch { toast.error("Error buscando productos"); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function addToCart(p: PosSearchResult) {
    const hasSizes = p.sizes.length > 0;
    const defaultSize = hasSizes ? (p.sizes.find((s) => s.stock > 0)?.size ?? p.sizes[0]!.size) : null;
    setCart((c) => [
      ...c,
      {
        key: `${p.id}-${defaultSize ?? "u"}-${Date.now()}`,
        productId: p.id, name: p.name, family: p.family,
        size: defaultSize, sizes: p.sizes, productStock: p.productStock,
        quantity: 1, unitPrice: p.unitPrice, lineDiscount: 0,
      },
    ]);
    setQ(""); setResults([]);
  }

  function patch(key: string, data: Partial<CartLine>) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, ...data } : l)));
  }
  function removeLine(key: string) { setCart((c) => c.filter((l) => l.key !== key)); }

  const lineSubtotal = (l: CartLine) => Math.max(0, round2(l.unitPrice * l.quantity - l.lineDiscount));
  const gross = cart.reduce((a, l) => a + lineSubtotal(l), 0);
  const total = Math.max(0, round2(gross - totalDiscount));
  const tax = round2(total - total / (1 + IVA));
  const base = round2(total - tax);

  async function registrar(generarTicket: boolean) {
    if (!cart.length) { toast.error("Carrito vacío"); return; }
    setSaving(true);
    try {
      const res = await createInStoreSaleAction({
        lines: cart.map((l) => ({
          productId: l.productId, size: l.size, quantity: l.quantity,
          unitPrice: l.unitPrice, lineDiscount: l.lineDiscount,
        })),
        paymentMethod: payment,
        totalDiscount,
        customer: { name: customerName || undefined, phone: customerPhone || undefined },
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Venta registrada (${res.ticketNumber}) · stock descontado`);
      setLastSale({ orderId: res.orderId, ticketNumber: res.ticketNumber });
      setTicket(null);
      // Reset del carrito; mantenemos cliente por si encadena varias.
      setCart([]); setTotalDiscount(0);
      if (generarTicket) await generar(res.orderId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function generar(orderId: string) {
    const res = await generateTicketAction(orderId);
    if (!res.ok) { toast.error(res.error); return; }
    setTicket({ url: res.ticketUrl, text: res.text });
    toast.success("Ticket generado");
  }

  return (
    <section className="mb-10 rounded-2xl border border-zs-border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-1 font-display text-lg font-bold text-zs-blue-900">Venta en tienda (TPV físico)</h2>
      <p className="mb-4 text-sm text-zs-muted">
        Busca productos, descuenta stock y emite el comprobante. El pago es presencial.
      </p>

      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, SKU, modelo o EAN…" className="pl-9" />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zs-border bg-white shadow-lg">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => addToCart(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zs-surface">
                  <span className="truncate">{p.name} <span className="text-zs-muted">· {p.baseSku}</span></span>
                  <span className="flex items-center gap-2 text-zs-muted">
                    {formatPriceEUR(p.unitPrice)}
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searching && <p className="mt-1 text-xs text-zs-muted">Buscando…</p>}
      </div>

      {/* Carrito */}
      {cart.length > 0 && (
        <div className="mt-4 space-y-2">
          {cart.map((l) => (
            <div key={l.key} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-zs-border p-2 text-sm">
              <span className="col-span-12 truncate font-medium sm:col-span-4">{l.name}</span>
              {l.sizes.length > 0 ? (
                <div className="col-span-4 sm:col-span-2">
                  <Select value={l.size ?? ""} onValueChange={(v) => patch(l.key, { size: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Talla" /></SelectTrigger>
                    <SelectContent>
                      {l.sizes.map((s) => (
                        <SelectItem key={s.size} value={s.size} disabled={s.stock <= 0}>
                          {s.size} ({s.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="col-span-4 text-xs text-zs-muted sm:col-span-2">Stock: {l.productStock}</span>
              )}
              <Input type="number" min={1} value={l.quantity} aria-label="Cantidad"
                onChange={(e) => patch(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                className="col-span-3 h-9 sm:col-span-1" />
              <Input type="number" min={0} step="0.01" value={l.unitPrice} aria-label="Precio"
                onChange={(e) => patch(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                className="col-span-3 h-9 sm:col-span-2" />
              <Input type="number" min={0} step="0.01" value={l.lineDiscount} aria-label="Descuento línea"
                onChange={(e) => patch(l.key, { lineDiscount: Math.max(0, Number(e.target.value) || 0) })}
                className="col-span-3 h-9 sm:col-span-1" placeholder="Dto." />
              <span className="col-span-2 text-right font-semibold tabular-nums sm:col-span-1">{formatPriceEUR(lineSubtotal(l))}</span>
              <button type="button" onClick={() => removeLine(l.key)} aria-label="Quitar"
                className="col-span-1 inline-flex justify-center text-zs-muted hover:text-zs-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Totales + datos */}
      {cart.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-zs-muted">Método de pago</label>
            <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="bizum">Bizum</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Nombre del cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input placeholder="WhatsApp del cliente (ej. 34600111222)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-1 rounded-xl border border-zs-border bg-zs-surface/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zs-muted">Descuento total</span>
              <Input type="number" min={0} step="0.01" value={totalDiscount}
                onChange={(e) => setTotalDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 w-28 text-right" />
            </div>
            <div className="flex justify-between"><span className="text-zs-muted">Base</span><span>{formatPriceEUR(base)}</span></div>
            <div className="flex justify-between"><span className="text-zs-muted">IVA (21%)</span><span>{formatPriceEUR(tax)}</span></div>
            <div className="flex justify-between border-t border-zs-border pt-1 text-base font-bold"><span>Total</span><span>{formatPriceEUR(total)}</span></div>
          </div>
        </div>
      )}

      {/* Botones */}
      {cart.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={() => registrar(false)}>
            Registrar venta y descontar stock
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => registrar(true)}>
            <Receipt className="mr-2 h-4 w-4" /> Registrar + generar ticket
          </Button>
          <Button type="button" variant="outline" disabled title="Disponible al configurar Stripe">
            <CreditCard className="mr-2 h-4 w-4" /> Cobrar con Stripe
          </Button>
        </div>
      )}

      {/* Post-venta: ticket + WhatsApp */}
      {lastSale && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-900">Última venta: {lastSale.ticketNumber}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!ticket && (
              <Button type="button" size="sm" variant="outline" onClick={() => generar(lastSale.orderId)}>
                <Receipt className="mr-2 h-4 w-4" /> Generar ticket
              </Button>
            )}
            {ticket && (
              <>
                <a href={ticket.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-zs-border bg-white px-3 text-sm font-semibold hover:bg-zs-surface">
                  <Receipt className="h-4 w-4" /> Ver/Imprimir PDF
                </a>
                <a
                  href={customerPhone ? whatsappUrl(ticket.text, customerPhone) : "#"}
                  target="_blank" rel="noopener noreferrer"
                  aria-disabled={!customerPhone}
                  onClick={(e) => { if (!customerPhone) { e.preventDefault(); toast.error("Indica el WhatsApp del cliente"); } }}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-[#25D366] px-3 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verificar typecheck + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/admin/pedidos/PosSale.tsx`
Expected: exit 0 (warnings ok).

- [ ] **Step 3: Commit**

```bash
git add app/admin/pedidos/PosSale.tsx
git commit -m "feat(tpv): UI de venta en tienda (carrito, totales, ticket, WhatsApp)"
```

---

## Task 10: Reestructurar `page.tsx` + verificación manual + deploy

**Files:**
- Modify: `app/admin/pedidos/page.tsx`

- [ ] **Step 1: Sacar el TPV fuera del gate de Stripe**

Reemplaza el bloque `if (!configured) { return (...StripeNotConfigured...) }` para
que NO haga early-return. En su lugar, renderiza siempre `<PosSale/>` arriba y, si
no hay Stripe, muestra el aviso como banner encima de la tabla. Estructura final
del `return` (sustituye el JSX final del componente):

```tsx
  return (
    <div>
      <AdminPageHeader
        title="Pedidos"
        description="Venta en tienda (TPV físico) y pedidos del TPV online."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Pedidos" }]}
      />

      {/* TPV físico — disponible siempre, no depende de Stripe */}
      <PosSale />

      {!configured && (
        <div className="mb-6">
          <StripeNotConfigured
            missing={missing}
            envKeys={STRIPE_ENV_VARS}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://zonasport.es"}
          />
        </div>
      )}

      <PedidosTable
        orders={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ q, status, from, to }}
        counts={countMap}
        role={role}
      />
    </div>
  );
```

Mueve el cálculo de `q/status/from/to/page/pageSize`, el `where`, y el
`Promise.all([...])` que cargan `orders/total/counts` para que se ejecuten SIEMPRE
(actualmente están después del early-return; al quitarlo ya quedan en el flujo
normal). Añade el import: `import { PosSale } from "./PosSale";`.

- [ ] **Step 2: Verificar typecheck + lint + tests**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/admin/pedidos/page.tsx && npx vitest run tests/unit/pos-*.test.ts`
Expected: exit 0 / tests PASS.

- [ ] **Step 3: Verificación manual en local**

Run: `npm run dev` y entra a `http://localhost:3000/admin/pedidos` (login admin).
Verifica:
- Aparece "Venta en tienda" aunque Stripe no esté configurado.
- Buscar un producto con tallas → añadir → elegir talla → cantidad → "Registrar venta y descontar stock". Comprobar en `/admin/productos` que el stock de esa talla bajó.
- "Registrar + generar ticket" → se abre el PDF; el texto de WhatsApp incluye el SKU por unidad (calzado `SKU/talla`).
- Con un balón (sin tallas) → descuenta `Product.stock`.
- Botón "Cobrar con Stripe" deshabilitado.

- [ ] **Step 4: Commit + push (deploy Vercel)**

```bash
git add app/admin/pedidos/page.tsx
git commit -m "feat(tpv): /admin/pedidos muestra el TPV físico (sin bloqueo por Stripe)"
git push origin master
```

---

## Self-review (cubierto)

- **Cobertura del spec:** reestructura página (Task 10), UI (9), acciones (8), PDF (7), texto (6), stock+Order (5), planSale/validación (4), totales (3), SKU (2), dependencia (1). No-auto-borrador: `createInStoreSale` no toca `status`. Stripe stub: botón disabled en UI. WhatsApp click-to-chat: `whatsappUrl(text, phone)`.
- **Sin placeholders:** todo el código está escrito.
- **Consistencia de tipos:** `PaymentMethod`, `CreateSaleInput`, `PosSearchResult`, `ReceiptData` se usan igual en acciones y UI. `buildVariantSku`/`skuOrFallback`/`productFamily` con las mismas firmas en sku.ts, sale.ts y pos-actions.ts.
