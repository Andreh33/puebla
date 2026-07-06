# PayPal + Bizum vía Stripe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflejar en `/admin/pedidos` con qué método pagó cada cliente (Bizum / PayPal / Tarjeta), capturándolo del PaymentIntent de Stripe sin migración de BD. La activación real de los métodos se hace en el panel de Stripe (fuera de este plan de código).

**Architecture:** El pipeline de Stripe ya es agnóstico al método. Se lee el método realmente usado (`payment_intent.latest_charge.payment_method_details.type`) al crear el pedido en el webhook, se guarda en `Order.metadata.paymentMethod`, se expone en los serializers (`toOrderSummary`/`toOrderDetail`) y se pinta un chip en la tabla y en el detalle. Un helper puro `paymentMethodLabel` mapea el código a etiqueta.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma 6, Stripe SDK 22 (`apiVersion: "2026-04-22.dahlia"`), Vitest 2, Tailwind, componente `Badge` de la casa.

## Global Constraints

- **Sin migraciones de BD.** El método se guarda en el JSON `Order.metadata` (clave `paymentMethod`). No se añaden columnas.
- **No fijar `payment_method_types`** en `create-checkout`. Los métodos siguen dinámicos (se activan/desactivan desde el panel de Stripe sin desplegar).
- **Captura best-effort:** la extracción del método NUNCA lanza ni bloquea la creación del pedido. Si no se resuelve, la clave queda ausente y la UI cae a la etiqueta genérica.
- **Valores del método** (los que reporta Stripe en `payment_method_details.type`): `"card"`, `"paypal"`, `"bizum"`. Etiquetas exactas: `Bizum`, `PayPal`, `Tarjeta`, `TPV`, `Online`.
- **No tocar** el flujo de reembolso, Holded ni el checkout.
- **Tests:** Vitest. Ejecutar con `npx vitest run <ruta>`. Typecheck con `npm run typecheck`.
- Rama de trabajo: `feat/paypal-bizum-stripe` (ya creada).

---

### Task 1: Helper puro `paymentMethodLabel`

**Files:**
- Create: `lib/stripe/payment-method.ts`
- Test: `tests/unit/payment-method-label.test.ts`

**Interfaces:**
- Produces: `paymentMethodLabel(method: string | null | undefined, deliveryMethod: string | null | undefined): string`

Módulo **sin** `server-only` y **sin** importar `stripe` — lo consume `PedidosTable.tsx` (componente cliente), igual que `lib/stripe/types.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/payment-method-label.test.ts
import { describe, it, expect } from "vitest";
import { paymentMethodLabel } from "@/lib/stripe/payment-method";

describe("paymentMethodLabel", () => {
  it("mapea los métodos concretos de Stripe", () => {
    expect(paymentMethodLabel("bizum", "shipping")).toBe("Bizum");
    expect(paymentMethodLabel("paypal", "shipping")).toBe("PayPal");
    expect(paymentMethodLabel("card", "shipping")).toBe("Tarjeta");
  });

  it("sin método: TPV para in_store, Online para el resto", () => {
    expect(paymentMethodLabel(null, "in_store")).toBe("TPV");
    expect(paymentMethodLabel(undefined, "shipping")).toBe("Online");
    expect(paymentMethodLabel(null, null)).toBe("Online");
  });

  it("método desconocido cae a Online", () => {
    expect(paymentMethodLabel("klarna", "shipping")).toBe("Online");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/payment-method-label.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/stripe/payment-method"`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/stripe/payment-method.ts
/**
 * Etiqueta legible del método de pago de un pedido.
 *
 * `method` es el `payment_method_details.type` de Stripe guardado en
 * `Order.metadata.paymentMethod` ("card" | "paypal" | "bizum" | …). Para
 * pedidos sin método capturado, cae a "TPV" (ventas de tienda) u "Online".
 * Puro y sin dependencias de servidor: lo usa el componente cliente de admin.
 */
export function paymentMethodLabel(
  method: string | null | undefined,
  deliveryMethod: string | null | undefined,
): string {
  switch (method) {
    case "bizum":
      return "Bizum";
    case "paypal":
      return "PayPal";
    case "card":
      return "Tarjeta";
  }
  if (deliveryMethod === "in_store") return "TPV";
  return "Online";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/payment-method-label.test.ts`
Expected: PASS (4 assertions en 3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/stripe/payment-method.ts tests/unit/payment-method-label.test.ts
git commit -m "feat(stripe): helper paymentMethodLabel (Bizum/PayPal/Tarjeta)"
```

---

### Task 2: Exponer `paymentMethod` en los serializers de pedido

**Files:**
- Modify: `lib/stripe/types.ts` (interfaz `OrderSummary`)
- Modify: `lib/stripe/orders.ts` (helper `readPaymentMethod` + `toOrderSummary` + `toOrderDetail`)
- Test: `tests/unit/order-serializer-payment-method.test.ts`

**Interfaces:**
- Produces: `OrderSummary.paymentMethod: string | null` (heredado por `OrderDetail`). `toOrderSummary`/`toOrderDetail` lo rellenan desde `metadata.paymentMethod`.
- Consumes: nada de tareas previas.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/order-serializer-payment-method.test.ts
import { describe, it, expect, vi } from "vitest";

// El módulo importa db/stock/client; los stubbeamos para que cargue limpio.
// toOrderSummary/toOrderDetail son puras (solo leen campos), no usan estos mocks.
vi.mock("@/lib/db", () => ({ db: {}, Prisma: { PrismaClientKnownRequestError: class {} } }));
vi.mock("@/lib/products/stock", () => ({ recomputeProductStock: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: () => null }));

function fakeOrder(metadata: Record<string, unknown> | null) {
  return {
    id: "o1",
    stripeSessionId: "cs_1",
    stripePaymentIntentId: "pi_1",
    stripeCustomerId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    subtotal: 10,
    shippingCost: 0,
    tax: 2,
    total: 12,
    currency: "EUR",
    status: "PAID",
    paymentStatus: "paid",
    deliveryMethod: "shipping",
    shippingAddress: null,
    notes: null,
    holdedInvoiceNumber: null,
    invoicedAt: null,
    createdAt: new Date("2026-07-06T10:00:00.000Z"),
    metadata,
    _count: { items: 1 },
    items: [],
  };
}

describe("serializers exponen paymentMethod desde metadata", () => {
  it("toOrderSummary lee metadata.paymentMethod", async () => {
    const { toOrderSummary } = await import("@/lib/stripe/orders");
    const o = fakeOrder({ paymentMethod: "bizum" });
    expect(toOrderSummary(o as unknown as Parameters<typeof toOrderSummary>[0]).paymentMethod).toBe("bizum");
  });

  it("toOrderDetail lee metadata.paymentMethod", async () => {
    const { toOrderDetail } = await import("@/lib/stripe/orders");
    const o = fakeOrder({ paymentMethod: "paypal" });
    expect(toOrderDetail(o as unknown as Parameters<typeof toOrderDetail>[0]).paymentMethod).toBe("paypal");
  });

  it("sin la clave → null", async () => {
    const { toOrderSummary } = await import("@/lib/stripe/orders");
    expect(toOrderSummary(fakeOrder({ source: "x" }) as unknown as Parameters<typeof toOrderSummary>[0]).paymentMethod).toBeNull();
    expect(toOrderSummary(fakeOrder(null) as unknown as Parameters<typeof toOrderSummary>[0]).paymentMethod).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/order-serializer-payment-method.test.ts`
Expected: FAIL — `toOrderSummary(...).paymentMethod` es `undefined` (aún no existe el campo).

- [ ] **Step 3a: Añadir el campo al tipo**

En `lib/stripe/types.ts`, dentro de `interface OrderSummary`, tras la línea `deliveryMethod: string | null;` añadir:

```ts
  /** Método de pago usado (de Stripe): "card" | "paypal" | "bizum". null si TPV o no capturado. */
  paymentMethod: string | null;
```

(`OrderDetail extends OrderSummary`, así que lo hereda automáticamente.)

- [ ] **Step 3b: Añadir el lector tolerante en `orders.ts`**

En `lib/stripe/orders.ts`, junto a `hasOversold` (justo antes de `readReturns`), añadir:

```ts
/** Lee `metadata.paymentMethod` (método de pago de Stripe). null si ausente. */
function readPaymentMethod(metadata: Prisma.JsonValue | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const m = (metadata as Record<string, unknown>).paymentMethod;
  return typeof m === "string" ? m : null;
}
```

- [ ] **Step 3c: Rellenar el campo en ambos serializers**

En `toOrderSummary`, dentro del objeto devuelto, tras `deliveryMethod: o.deliveryMethod,` añadir:

```ts
    paymentMethod: readPaymentMethod(o.metadata),
```

En `toOrderDetail`, dentro del objeto devuelto, tras `deliveryMethod: o.deliveryMethod,` añadir la misma línea:

```ts
    paymentMethod: readPaymentMethod(o.metadata),
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run tests/unit/order-serializer-payment-method.test.ts`
Expected: PASS (3 tests).

Run: `npm run typecheck`
Expected: sin errores (todos los usos de `toOrderSummary`/`toOrderDetail` siguen compilando; el campo es aditivo).

- [ ] **Step 5: Commit**

```bash
git add lib/stripe/types.ts lib/stripe/orders.ts tests/unit/order-serializer-payment-method.test.ts
git commit -m "feat(pedidos): exponer paymentMethod en serializers de Order"
```

---

### Task 3: Capturar el método al crear el pedido (webhook)

**Files:**
- Modify: `lib/stripe/orders.ts` (`createOrderFromCheckout`: `expand` + helper `extractPaymentMethod` + `baseMetadata`)
- Test: `tests/unit/extract-payment-method.test.ts`

**Interfaces:**
- Produces: `extractPaymentMethod(session: Stripe.Checkout.Session): string | null` (exportada para testear). `createOrderFromCheckout` la usa para escribir `metadata.paymentMethod`.
- Consumes: nada de tareas previas.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/extract-payment-method.test.ts
import { describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("@/lib/db", () => ({ db: {}, Prisma: { PrismaClientKnownRequestError: class {} } }));
vi.mock("@/lib/products/stock", () => ({ recomputeProductStock: vi.fn() }));
vi.mock("@/lib/stripe/client", () => ({ getStripe: () => null }));

function session(pi: unknown): Stripe.Checkout.Session {
  return { payment_intent: pi } as unknown as Stripe.Checkout.Session;
}

describe("extractPaymentMethod", () => {
  it("devuelve el type del cargo cuando está expandido", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    const s = session({ latest_charge: { payment_method_details: { type: "paypal" } } });
    expect(extractPaymentMethod(s)).toBe("paypal");
  });

  it("bizum", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    const s = session({ latest_charge: { payment_method_details: { type: "bizum" } } });
    expect(extractPaymentMethod(s)).toBe("bizum");
  });

  it("payment_intent como string → null", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    expect(extractPaymentMethod(session("pi_123"))).toBeNull();
  });

  it("latest_charge como string (no expandido) → null", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    expect(extractPaymentMethod(session({ latest_charge: "ch_123" }))).toBeNull();
  });

  it("sin payment_intent → null", async () => {
    const { extractPaymentMethod } = await import("@/lib/stripe/orders");
    expect(extractPaymentMethod(session(null))).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/extract-payment-method.test.ts`
Expected: FAIL — `extractPaymentMethod` no está exportada (`is not a function`).

- [ ] **Step 3a: Añadir el helper exportado**

En `lib/stripe/orders.ts`, justo antes de `export async function createOrderFromCheckout(` (tras `extractShippingAddress`), añadir:

```ts
/**
 * Extrae el método de pago realmente usado desde una Checkout Session con el
 * `payment_intent.latest_charge` expandido: `payment_method_details.type`
 * ("card" | "paypal" | "bizum" | …). Devuelve null si no se puede resolver
 * (PI/charge no expandidos). Best-effort: nunca lanza.
 */
export function extractPaymentMethod(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  if (!pi || typeof pi === "string") return null;
  const charge = pi.latest_charge;
  if (!charge || typeof charge === "string") return null;
  return charge.payment_method_details?.type ?? null;
}
```

- [ ] **Step 3b: Ampliar el `expand` para traer el cargo**

En `createOrderFromCheckout`, en la recuperación de la sesión, cambiar el array `expand`:

De:
```ts
      expand: ["line_items.data.price.product", "payment_intent"],
```
A:
```ts
      expand: ["line_items.data.price.product", "payment_intent.latest_charge"],
```

(Expandir la ruta anidada expande también el `payment_intent`, así que el resto del código que lee `expandedSession.payment_intent.id` sigue funcionando.)

- [ ] **Step 3c: Escribir el método en el metadata base**

En `createOrderFromCheckout`, localizar:
```ts
  const baseMetadata = (expandedSession.metadata ?? {}) as Record<string, unknown>;
```
y sustituir por:
```ts
  const paymentMethod = extractPaymentMethod(expandedSession);
  const baseMetadata = {
    ...((expandedSession.metadata ?? {}) as Record<string, unknown>),
    ...(paymentMethod ? { paymentMethod } : {}),
  } as Record<string, unknown>;
```

(`baseMetadata` se usa tanto en el `create` como en el `update` de `oversold`, así que el método persiste en ambos caminos.)

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run tests/unit/extract-payment-method.test.ts`
Expected: PASS (5 tests).

Run: `npx vitest run tests/unit/stripe-orders-refund.test.ts`
Expected: PASS (los tests existentes de orders.ts siguen verdes — no se tocó su lógica).

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add lib/stripe/orders.ts tests/unit/extract-payment-method.test.ts
git commit -m "feat(pedidos): capturar método de pago (Bizum/PayPal/Tarjeta) en el webhook"
```

---

### Task 4: Chip del método en `/admin/pedidos` (tabla + detalle)

**Files:**
- Modify: `app/admin/pedidos/PedidosTable.tsx`

**Interfaces:**
- Consumes: `paymentMethodLabel` (Task 1) y `OrderSummary.paymentMethod` (Task 2).

Sin test unitario (componente cliente); se verifica con `typecheck` + revisión visual. El chip se muestra **solo** cuando hay método concreto capturado (`o.paymentMethod` truthy), para no meter ruido "Online" en pedidos antiguos.

- [ ] **Step 1: Importar el helper**

En `app/admin/pedidos/PedidosTable.tsx`, tras `import { computeItemReturn } from "@/lib/pos/returns";` añadir:

```ts
import { paymentMethodLabel } from "@/lib/stripe/payment-method";
```

- [ ] **Step 2: Chip en la celda de estado de la tabla**

En la celda de estado (`<div className="flex flex-col items-start gap-1">`), tras el bloque `{o.oversold && ( … )}`, añadir:

```tsx
                      {o.paymentMethod && (
                        <Badge variant="outline">
                          {paymentMethodLabel(o.paymentMethod, o.deliveryMethod)}
                        </Badge>
                      )}
```

- [ ] **Step 3: Chip en la cabecera del detalle**

En el modal de detalle, en el grupo `<div className="flex items-center gap-2">`, justo tras `{statusBadge(selected.status)}`, añadir:

```tsx
                    {selected.paymentMethod && (
                      <Badge variant="outline">
                        {paymentMethodLabel(selected.paymentMethod, selected.deliveryMethod)}
                      </Badge>
                    )}
```

- [ ] **Step 4: Typecheck + lint + revisión visual**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npm run lint`
Expected: sin errores nuevos.

Revisión visual (manual, con datos reales o de prueba): en `/admin/pedidos`, un pedido pagado con tarjeta muestra el chip **Tarjeta** bajo su estado y en el detalle; los pedidos TPV y los antiguos sin método capturado **no** muestran chip. (Bizum/PayPal se verán en cuanto entren pedidos reales tras la activación en Stripe.)

- [ ] **Step 5: Commit**

```bash
git add app/admin/pedidos/PedidosTable.tsx
git commit -m "feat(pedidos): chip del método de pago en tabla y detalle"
```

---

### Task 5: Documentar activación en Stripe + verificación final

**Files:**
- Modify: `docs/PHASE-2-STRIPE.md`

- [ ] **Step 1: Añadir sección de métodos de pago**

Añadir al final de `docs/PHASE-2-STRIPE.md` la sección:

```markdown
## Métodos de pago: PayPal y Bizum (métodos dinámicos)

El checkout (`app/api/stripe/create-checkout/route.ts`) **no fija
`payment_method_types`** → usa **métodos dinámicos**: lo que se active en
**Stripe → Configuración → Métodos de pago** aparece solo en el checkout, sin
desplegar código.

Para activar:
1. **Bizum:** activar el toggle (España, EUR; se liquida directo en Stripe).
   Bizum tiene límite de importe por operación; Stripe lo oculta solo si el
   carrito lo supera.
2. **PayPal:** conectar la cuenta **PayPal Business** desde el conector de Stripe.
3. Verificar que el webhook sigue en `https://zonasport.vercel.app/api/stripe/webhook`
   (⚠️ NO `zonasport.es`) con los eventos `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `charge.refunded`,
   `payment_intent.payment_failed`.

El método usado se captura en el webhook
(`payment_intent.latest_charge.payment_method_details.type`), se guarda en
`Order.metadata.paymentMethod` y se muestra como chip en `/admin/pedidos`.
Reembolsos: agnósticos al método (mismo flujo de Stripe), con la ventana
temporal que imponga Stripe para PayPal/Bizum.

> Si en el futuro se fijara `payment_method_types` en el checkout, habría que
> incluir explícitamente `"paypal"` y `"bizum"`.
```

- [ ] **Step 2: Verificación final de toda la suite**

Run: `npx vitest run`
Expected: toda la suite en verde (incluidos los 3 test files nuevos).

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add docs/PHASE-2-STRIPE.md
git commit -m "docs(stripe): activación de PayPal + Bizum y captura de método"
```

---

## Notas de ejecución

- **Frente operativo (fuera de este plan de código):** activar Bizum + conectar PayPal en el panel de Stripe. Se hará por el navegador con el dueño logueado, **tras** mergear este código, para que la primera venta ya se etiquete.
- **Sin migración:** no ejecutar `prisma migrate`. El campo vive en `Order.metadata`.
