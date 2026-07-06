# Desglose de ventas por método de pago en /admin/balance — Diseño

- **Fecha:** 2026-07-07
- **Alcance:** Nueva tarjeta "Ventas por método de pago" en `/admin/balance` (panel solo-OWNER). Aditiva y de solo lectura.
- **Fuera de alcance:** separar efectivo/tarjeta dentro de TPV; export CSV; tocar el cálculo existente de familia/género/beneficio.

---

## 1. Contexto

`/admin/balance` (`app/admin/balance/`) muestra un cuadro de mando con widgets reordenables/ocultables (persistidos en `localStorage`, key `zs:balance:layout:v1`). `getBalance(period)` (`lib/admin/balance-queries.ts`) agrega ventas/beneficio por familia×género para `period ∈ {mes, ano, todo}` sobre pedidos con `SOLD_STATUSES` (PAID/PROCESSING/SHIPPED/DELIVERED). El método de pago vive en `Order.metadata.paymentMethod` (`"card"|"paypal"|"bizum"`), capturado desde ayer; TPV y online antiguos no lo tienen.

## 2. Objetivos

- Tarjeta nueva que desglosa, por **método de pago**, el **nº de pedidos**, el **importe cobrado (€)** y su **%** sobre el total del periodo seleccionado.
- Respeta el mismo selector de periodo (mes/año/todo) ya presente.
- Los cubos **suman el 100%** del periodo (elección del cliente): se incluyen TPV y online sin método.

## 3. Cubos (una sola fuente de verdad: el helper existente)

Se agrupa cada pedido por `paymentMethodLabel(metadata.paymentMethod, deliveryMethod)` (`lib/stripe/payment-method.ts`, puro), que ya devuelve: **Bizum / PayPal / Tarjeta / TPV / Online**. En esta vista, la etiqueta `"Online"` se muestra como **"Online (sin especificar)"** (online antiguos sin método capturado). TPV = ventas `deliveryMethod === "in_store"`.

## 4. Métrica

Por cubo: `pedidos` (nº de pedidos), `importe` (Σ `order.total` = dinero cobrado, IVA y envío incluidos; neto de reembolsos parciales, igual que el resto del balance), `pct` (`importe / Σimporte · 100`). Orden: por `importe` descendente, desempate por etiqueta.

> `importe` = Σ `order.total`, coherente con la cifra de **ingresos** de `getSalesSummary` (que también usa `order.total`). Puede diferir levemente de la columna "Ventas" de las tablas de familia/género (Σ `OrderItem.subtotal`, sin envío); es esperado.

## 5. Arquitectura (unidades pequeñas y testeables)

- **`lib/admin/payment-breakdown.ts` (NUEVO, puro, sin `server-only`):**
  - `export type PaymentMethodRow = { label: string; pedidos: number; importe: number; pct: number }`
  - `export function buildPaymentBreakdown(orders: Array<{ total: number; paymentMethod: string | null; deliveryMethod: string | null }>): PaymentMethodRow[]` — agrupa con `paymentMethodLabel`, suma, calcula `pct`, renombra `"Online"→"Online (sin especificar)"`, ordena. Importa solo el helper puro → testeable sin DB.
- **`lib/admin/balance-types.ts`:** `import type { PaymentMethodRow }` desde `./payment-breakdown`, re-exportar el tipo, y añadir `paymentMethods: PaymentMethodRow[]` a `BalanceData`.
- **`lib/admin/balance-queries.ts`:** `getPaymentMethodBreakdown(period)` — consulta `db.order.findMany({ where: { status in SOLD_STATUSES, createdAt gte periodStart }, select: { total, metadata, deliveryMethod } })`, extrae `paymentMethod` del `metadata` (lector tolerante), y llama a `buildPaymentBreakdown`. `getBalance` la ejecuta e incluye `paymentMethods` en su retorno.
- **`app/admin/balance/BalanceClient.tsx`:** nuevo widget `"metodos"` en `WIDGET_IDS`/`WIDGET_TITLE`/`renderWidget`, con un componente `PaymentMethodTable` (tabla Método · Pedidos · Importe · % + barrita de % estilo `MonthlyTable`). El merge de layout ya añade IDs nuevos al final → no rompe layouts guardados.

## 6. Casos límite

- **Periodo sin ventas:** `buildPaymentBreakdown([])` → `[]`; la tabla muestra "Sin datos en este periodo.".
- **Importe total 0** (p. ej. todo a 0 €): `pct = 0` para todas (sin división por cero).
- **Método capturado desconocido** (no card/paypal/bizum) en un pedido online: `paymentMethodLabel` lo mapea a `"Online"` → cubo "Online (sin especificar)". Aceptable.
- **TPV con `metadata.paymentMethod`** (no debería ocurrir): el helper prioriza el método → iría a su cubo; inofensivo.

## 7. Pruebas (Vitest)

`tests/unit/payment-breakdown.test.ts` sobre `buildPaymentBreakdown`:
- Agrupa por etiqueta (card→Tarjeta, bizum→Bizum, paypal→PayPal, in_store→TPV, online-sin-método→"Online (sin especificar)").
- Suma `pedidos` e `importe`; `pct` correcto y suma ~100.
- Orden por importe desc.
- Lista vacía → `[]`; total 0 → `pct` 0 sin NaN.

## 8. Seguridad ("no rompe nada")

- 🚫 Migraciones: ninguna (método ya en `Order.metadata`). 🚫 Stripe/reembolsos/checkout/Holded: sin cambios. 🚫 Cálculo familia/género/beneficio: sin cambios (solo se **añade** `paymentMethods` a `BalanceData`).
- ✅ Solo lectura, panel solo-OWNER. Peor caso: cifra mal pintada en página interna.
