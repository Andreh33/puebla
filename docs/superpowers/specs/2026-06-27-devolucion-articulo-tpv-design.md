# Devolución de un artículo suelto en ventas de TPV — Diseño (Fase 1)

- **Fecha:** 2026-06-27
- **Alcance:** SOLO ventas de tienda (TPV / `deliveryMethod = "in_store"`).
- **Fuera de alcance (Fase 2):** pedidos online (Stripe), factura rectificativa en Holded.
- **Pantalla:** `/admin/pedidos` → detalle del pedido.

---

## 1. Problema

Hoy en `/admin/pedidos` solo se puede **anular el pedido entero**:

- **TPV:** botón **"Cancelar venta"** → `updateOrderStatus(orderId, "CANCELLED")` → `restoreStockForOrder` repone **TODO** el stock del pedido.
- **Online:** no hay botón; el reembolso se hace en el panel de Stripe y el webhook `charge.refunded` → `markOrderRefunded` marca el pedido entero `REFUNDED` y repone **TODO** el stock.

El cliente quiere poder **devolver un solo artículo** de un pedido (una "x" por línea), no la lista entera. Esta fase resuelve el caso **TPV**, que es el más habitual (el cliente vuelve a la tienda con un artículo) y el más seguro (no toca dinero electrónico ni facturación fiscal).

## 2. Objetivos y no-objetivos

**Objetivos**
- Botón **"Devolver"** por línea en el detalle del pedido, **solo para ventas TPV**.
- Si la línea tiene varias unidades, **elegir cuántas devolver** (por defecto, todas).
- Devolver al inventario el stock del/los artículo(s) devuelto(s).
- Que el **panel de balance** (`/admin/balance`) siga cuadrado: ingresos, beneficio y unidades bajan exactamente lo devuelto.
- Dejar **registro** de la devolución (log en `metadata` + nota visible).

**No-objetivos (explícito)**
- **No** mover dinero electrónico. El TPV es efectivo/tarjeta en mano; el dueño devuelve el importe físicamente. La app solo le indica cuánto.
- **No** tocar Stripe ni el webhook.
- **No** tocar Holded (las ventas TPV no se facturan ahí — Modelo B).
- **No** generar PDF de "ticket de devolución" (queda en las notas; posible mejora futura).
- **No** cambiar la estructura de la base de datos (sin migración).

## 3. Trampa conocida en online (documentada, NO se aborda aquí)

`markOrderRefunded` (en `lib/stripe/orders.ts`) reacciona a **cualquier** `charge.refunded` marcando el pedido **entero** `REFUNDED` y reponiendo **todo** el stock. Es decir, **un reembolso parcial hecho a mano en el panel de Stripe hoy se interpretaría como devolución total**.

→ **Regla operativa mientras no exista la Fase 2:** en pedidos **online**, reembolsar siempre el **pedido completo** en Stripe. No reembolsar líneas sueltas en Stripe todavía. La Fase 2 (online) deberá arreglar esto distinguiendo reembolso parcial de total.

## 4. Diseño

### 4.1 Sin cambios de esquema (sin migración)

Se reutilizan columnas existentes y el JSON `Order.metadata` (que ya guarda `stockRestored`, `oversold`, `ticketNumber`, etc.). **No se añade ninguna columna** → riesgo de despliegue mínimo.

Una devolución de línea registra en `Order.metadata.returns` un array acumulativo:

```jsonc
"returns": [
  {
    "itemId": "ckxyz...",
    "productName": "Camiseta Padel Pro",
    "variantSize": "M",
    "qty": 1,
    "amount": 19.99,        // bruto (IVA incl.) devuelto
    "at": "2026-06-27T10:32:00.000Z"
  }
]
```

La cantidad **original** comprada de cada línea siempre es recuperable como
`OrderItem.quantity (actual) + Σ returns[itemId].qty`.

### 4.2 Server action

Nueva acción en `app/admin/pedidos/_actions.ts` (módulo `"use server"`: solo funciones async — respetar la regla de no exportar consts):

```ts
export async function returnOrderItem(
  orderId: string,
  itemId: string,
  qty: number,
): Promise<ActionResult<{ status: OrderStatus; refundedAmount: number }>>
```

Pasos, **todo dentro de una transacción** `db.$transaction`:

1. **Sesión** requerida (`requireSession`, como el resto del módulo).
2. **Re-leer** pedido + líneas dentro de la transacción.
3. **Validar:**
   - El pedido existe y es `deliveryMethod === "in_store"`. Si no, error: "Aquí solo se devuelven artículos de ventas de tienda (TPV)."
   - El pedido no está `CANCELLED` ni `REFUNDED`.
   - La línea `itemId` pertenece al pedido.
   - `qty` es entero y `1 ≤ qty ≤ quantityActual` de la línea (impide doble devolución y carreras).
4. **Reponer stock** de esa línea (mismo patrón probado que `restoreStockForOrder`, pero **solo para esta línea**):
   - Si la línea tiene `variantSize`: `productSize.updateMany({ productId, size }, { stock: { increment: qty } })`.
   - Si no: `product.updateMany({ id: productId }, { stock: { increment: qty } })`.
   - `recomputeProductStock(tx, productId)` para sincronizar el agregado.
   - ⚠️ **No** marcar `metadata.stockRestored` (esa marca es para la reposición de pedido completo; reservarla para "Cancelar venta").
5. **Calcular el bruto devuelto** (agnóstico a descuentos):
   - `returnedGross = round2(item.subtotal * qty / item.quantity)`.
6. **Reducir la línea:**
   - `quantity := quantity - qty`.
   - `subtotal := round2(item.subtotal - returnedGross)`.
   - (Si `quantity` llega a 0, la línea queda como devuelta por completo; se conserva la fila.)
7. **Reducir los totales del pedido** (modelo IVA-incluido, igual que `planTotals`):
   - `total := max(0, round2(order.total - returnedGross))`.
   - `subtotal(base) := round2(total / (1 + IVA/100))` con `IVA = 21`.
   - `tax := round2(total - base)`.
8. **Registrar** en `metadata.returns` (append) y añadir una línea a `Order.notes`:
   `"[2026-06-27 10:32 · DEVOLUCIÓN] 1× Camiseta Padel Pro (talla M) · 19,99 €"`.
9. **Estado del pedido:** si tras la devolución **todas** las líneas quedan en `quantity === 0`, marcar `status = "CANCELLED"` y `metadata.stockRestored = true` (defensivo; el stock ya está repuesto línea a línea). Si no, **mantener** el estado (`PAID`/`PROCESSING`/…); la "devolución parcial" se deriva de `metadata.returns`.
10. `revalidatePath("/admin/pedidos")` y `revalidatePath("/admin/productos")`.

> El IVA se asume 21% (constante `IVA_RATE`), igual que en la creación de ventas TPV (`lib/pos/totals.ts`). Coherente con el resto del TPV.

### 4.3 Función pura testeable

Para poder testear la aritmética sin DB, extraer una función pura (p. ej. en `lib/pos/returns.ts`):

```ts
applyItemReturn(
  order: { total: number },
  item: { quantity: number; subtotal: number },
  qty: number,
  ivaRate = 21,
): {
  returnedGross: number;
  item: { quantity: number; subtotal: number };
  order: { subtotal: number; tax: number; total: number };
}
```

La server action la usa y persiste el resultado.

### 4.4 Interacción con lo existente

- **"Cancelar venta" (pedido entero):** sigue igual. Si antes hubo devoluciones de línea (cantidades ya reducidas), `restoreStockForOrder` repondrá solo las cantidades **restantes** → **no hay doble reposición**. Como la devolución de línea **no** marca `stockRestored`, "Cancelar venta" sigue funcionando para lo que quede.
- **Panel de balance — `lib/admin/sales-queries.ts` Y `lib/admin/balance-queries.ts`:** **no se modifican ninguno**. Ambos leen `Order.total` (ya reducido) y `OrderItem.quantity/subtotal/unitCost` (ya reducidos) de pedidos `SOLD_STATUSES`, así que ingresos/ventas, beneficio, unidades y top-productos **netean solos** la devolución. `unitPrice`/`unitCost` por unidad no cambian; el beneficio `(unitPrice − unitCost) × quantity` baja por la `quantity` reducida. Además `balance-queries` valora el **inventario** desde `Product.stock` (que la reposición incrementa), así que el coste/uds de inventario sube correctamente al devolver. Verificado leyendo ambos módulos.
- **Ticket (`generateTicketAction`):** si se **regenera** un ticket tras una devolución, reflejará las cantidades actuales (reducidas). El PDF original ya emitido no cambia. Aceptable.

### 4.5 UI (`app/admin/pedidos/PedidosTable.tsx`)

En el modal de detalle, sección "Productos":

- Por cada línea con `deliveryMethod === "in_store"`, pedido **no** `CANCELLED`/`REFUNDED`, y `quantity > 0`: botón pequeño **"Devolver"**.
- Si `quantity === 1`: diálogo de confirmación con el importe ("Devuelve 19,99 € al cliente. El artículo vuelve al inventario.").
- Si `quantity > 1`: selector de cuántas unidades (1…quantity, por defecto `quantity`) + el importe calculado.
- Líneas ya devueltas (total o parcialmente): mostrar la cantidad devuelta tachada / "Devuelto" y el subtotal actualizado.
- En cabecera del pedido: etiqueta **"Devolución parcial"** si `metadata.returns` no está vacío y el pedido no está cancelado.
- Tras la acción: `toast` de éxito ("Devuelto · 19,99 € · stock repuesto"), refrescar el detalle (`getOrderDetail`) y `router.refresh()`.
- Reutilizar patrones ya presentes (componentes `Dialog`, `Button`, `toast`, estados de carga). Mantener la coherencia visual con el botón "Cancelar venta".

`getOrderDetail`/`toOrderDetail` deben exponer lo necesario para pintar la "x" y el estado de devolución: el `OrderDetail.items` ya trae `id`, `quantity`, `subtotal`; añadir a `OrderDetail` la lista `returns` (desde `metadata.returns`) para marcar líneas devueltas y la etiqueta.

## 5. Casos límite

- **qty fuera de rango / línea inexistente / pedido no TPV / pedido cancelado:** la acción devuelve `{ ok: false, error }` claro; la UI muestra `toast.error`.
- **Doble clic / concurrencia:** la guarda `qty ≤ quantity` re-leída dentro de la transacción impide pasarse. (Concurrencia real bajísima: una sola caja.)
- **Producto/talla borrados después de la venta:** si `updateMany` afecta 0 filas al reponer, **no** se aborta la devolución (el histórico de la venta debe poder corregirse igual). Comportamiento decidido: se registra la devolución y se reducen línea/totales igualmente; la acción devuelve un aviso (`{ ok: true, data: { ..., warning } }`) y la UI muestra un `toast` informativo ("Artículo ya no existe en el catálogo; stock no repuesto, pero la venta se ha corregido").
- **Pedido con descuento de pedido (`totalDiscount`):** no se persiste por línea; restar el bruto de la línea es la convención de devolución estándar y es suficiente (posible sobre-crédito sub-céntimo si hubo descuento de pedido; aceptable en v1).

## 6. Pruebas (Vitest)

- **Unitarias de `applyItemReturn`:** devolución de 1 de 1, de 1 de 2, de 2 de 2; comprobación de `returnedGross`, nuevos `item.subtotal`, y `order.{subtotal,tax,total}` consistentes (`base + tax === total`).
- **Stock:** test al estilo de `tests/unit/stripe-orders-refund.test.ts` (mock de `@/lib/db` + `recomputeProductStock`) verificando que se incrementa solo la talla/producto de la línea por `qty`, y que **no** se marca `stockRestored`.
- **Estado:** devolver todas las líneas deja el pedido `CANCELLED`; devolver parte lo deja en su estado con `returns` poblado.

## 7. Alternativas consideradas

1. **Columna `refundedQty` en `OrderItem` (migración aditiva) + netear en `sales-queries`.** Mantiene el histórico inmutable, pero obliga a **migración** y a **reescribir las consultas del balance** (4 funciones + su test), aumentando superficie de cambio y riesgo. Descartada para v1 por el requisito "no romper el balance / nada de nada".
2. **Mutar cantidades/total + log en `metadata` (elegida).** Sin migración, **sin tocar `sales-queries`** (netea solo), histórico preservado en `metadata.returns`. Menor superficie, menor riesgo.
3. **Reembolso/integración de dinero en TPV.** Innecesario: el TPV es en mano. Fuera de alcance.

## 8. Resumen de seguridad ("no rompe nada")

- 🚫 Stripe: sin cambios. 🚫 Holded: sin cambios. 🚫 Migraciones: ninguna. 🚫 `sales-queries`/balance: sin cambios (netea solo).
- ✅ Stock: reposición por línea con el patrón probado, sin doble reposición frente a "Cancelar venta".
- ✅ Histórico de la venta preservado en `metadata.returns` + notas.
