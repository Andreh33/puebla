# TPV de tienda física en `/admin/pedidos` — Diseño

**Fecha:** 2026-05-24
**Estado:** Aprobado por el cliente (verbal "adelante"). Pendiente de revisión del spec escrito.

## 1. Objetivo

Permitir registrar **ventas en tienda física** (no online) desde `/admin/pedidos`:
buscar productos, descontar su stock, emitir un **comprobante** (PDF + texto) y
enviarlo por **WhatsApp** al cliente. El cobro con tarjeta online (Stripe) queda
como botón **deshabilitado** (stub) hasta que se configuren las claves.

No se construye pasarela de pago: en tienda el pago es presencial
(efectivo/tarjeta/Bizum); solo se **registra** la venta y se emite el comprobante.

## 2. Alcance y decisiones (cerradas con el cliente)

- **Sin Stripe:** el TPV físico funciona ya. La página deja de estar bloqueada
  por `isStripeConfigured()`.
- **Comprobante:** PDF imprimible (subido a Vercel Blob para poder enlazarlo) +
  versión en texto. **No fiscal** hasta tener el CIF (pendiente en aviso legal);
  el pie lo deja claro.
- **WhatsApp:** click-to-chat (`wa.me/<num>?text=`) con el comprobante en texto +
  enlace al PDF. No hay envío automático de adjuntos (requeriría WhatsApp Business
  API; queda fuera de alcance).
- **No auto-borrador:** la venta SOLO descuenta stock. El paso a borrador de los
  productos sin stock lo controla el dueño con el botón manual ya existente
  (`draftAllZeroStockAction`). El TPV no cambia el `status` de productos.
- **SKU por unidad vendida** (en el comprobante y en `OrderItem.productSku`):
  - Calzado → `{sku}/{talla}` (p.ej. `llo878/40`, `llo878/41`).
  - Ropa (textil) → `{sku}{talla}` (p.ej. `llo878L`, `llo878M`).
  - Accesorios sin talla → `{sku}`.
  - Si el producto no tiene `sku`, se usa el mismo fallback que la tabla de
    productos: `modelCode` → `externalId` → `id` corto en mayúsculas.
- **Descuentos:** precio unitario editable por línea + descuento opcional (línea y
  total). Defaults al precio de venta del catálogo.
- **Métodos de pago:** Efectivo / Tarjeta / Bizum.
- **Nº de ticket:** `ZS-AAAAMMDD-####` (referencia, no fiscal).

## 3. Arquitectura

### 3.1 Reestructurar `app/admin/pedidos/page.tsx`
Hoy hace `return <StripeNotConfigured/>` si Stripe no está configurado, ocultando
todo. Nuevo comportamiento:
- Render **siempre** de la sección **"Venta en tienda (TPV físico)"** (componente
  nuevo `PosSale`).
- Render **siempre** de la tabla de pedidos (lee `Order`, no depende de Stripe).
  Las ventas de tienda aparecen ahí también.
- El aviso `StripeNotConfigured` pasa a ser un banner informativo dentro de la
  zona "pedidos online" (no bloquea la página). El botón "Sincronizar con Stripe"
  solo se muestra/activa si `isStripeConfigured()`.

### 3.2 Componentes y módulos nuevos

| Archivo | Responsabilidad |
|---|---|
| `app/admin/pedidos/PosSale.tsx` (client) | UI del TPV: buscador, carrito, totales, método de pago, cliente, botones de acción. Colocado junto a la página, como `PedidosTable.tsx`/`StripeNotConfigured.tsx`. |
| `lib/pos/sku.ts` | `buildVariantSku({ baseSku, size, family })` → SKU por unidad (calzado `/`, ropa append, accesorio base). + helper de fallback de SKU. |
| `lib/pos/sale.ts` (server, `"use server"` o módulo server-only usado por acciones) | `createInStoreSale(input)`: valida stock, descuenta (talla o producto) en `$transaction`, crea `Order` + `OrderItem`, audita. Devuelve `{ orderId, totals, ticketNumber }`. |
| `lib/pos/receipt.tsx` | Documento PDF con `@react-pdf/renderer` (cabecera Zona Sport + NAP, nº ticket, fecha, líneas, IVA, total, método pago, pie no-fiscal). |
| `lib/pos/receipt-text.ts` | `buildReceiptText(order)` → comprobante en texto plano para WhatsApp (+ se le concatena el enlace al PDF). |
| `app/admin/pedidos/pos-actions.ts` (`"use server"`) | `searchProductsForPos(q)`, `createInStoreSaleAction(input)`, `generateTicketAction(orderId)` (genera PDF + sube a Blob + guarda url en `Order.metadata.ticketUrl`). Todas con `requireSession()`. |
| `app/api/admin/pos/ticket/[orderId]/route.ts` (Node runtime) — *opcional* | Servir/descargar el PDF si se prefiere streaming en vez de Blob. (Por defecto usamos Blob, ver §3.4.) |

### 3.3 Descuento de stock (`createInStoreSale`)
- Input: `{ items: Array<{ productId, size: string | null, quantity, unitPrice, lineDiscount? }>, paymentMethod, customer?: { name?, phone? }, totalDiscount?, generateTicket: boolean }`.
- En `db.$transaction`:
  1. Para cada item:
     - Si `size` != null → localizar `ProductSize` (`productId_size`), comprobar
       `stock >= quantity`, `decrement` stock.
     - Si `size` == null → comprobar `Product.stock >= quantity`, `decrement`.
     - Si no hay stock suficiente → abortar transacción con error enumerable
       (no se descuenta nada, no se crea el pedido).
  2. Calcular totales (ver §3.5).
  3. Crear `Order` (status `PAID`, `deliveryMethod="in_store"`,
     `metadata={ channel:"pos", paymentMethod, ticketNumber }`, `customerName/Phone`).
  4. Crear `OrderItem` por línea con `productSku` = SKU por unidad (§2),
     `variantSize`, `unitPrice`, `quantity`, `subtotal`.
  5. `ProductAudit` `action:"pos_sale"` por producto.
- **No** modifica `Product.status` (ver decisión "no auto-borrador").

### 3.4 Comprobante (PDF + texto)
- PDF con `@react-pdf/renderer` (nueva dependencia). Se renderiza en servidor
  (`renderToBuffer`) dentro de `generateTicketAction`, se sube a Vercel Blob
  (`put`, acceso `public`), y la URL se guarda en `Order.metadata.ticketUrl`.
- Texto (`buildReceiptText`) para WhatsApp: cabecera tienda, nº ticket, fecha,
  líneas `cant× nombre (talla) — sku — subtotal`, total, método de pago, y
  `Ver ticket: <url Blob>`.
- WhatsApp: `whatsappUrl(textoComprobante, telefonoCliente)` (helper existente).

### 3.5 Cálculo de importes (IVA incluido)
Convención retail española: los precios mostrados **incluyen IVA**.
- `lineSubtotal = unitPrice * quantity - lineDiscount`.
- `total = Σ lineSubtotal - totalDiscount` (lo que paga el cliente).
- `tax = total - total / (1 + taxRate/100)` (IVA contenido; `taxRate` por defecto 21).
- `subtotal (base) = total - tax`.
- Se guardan en `Order.subtotal/tax/total`. (Si hay tipos de IVA mixtos, se usa
  el `taxRate` de cada producto para su parte; v1 asume 21% salvo que el producto
  indique otro.)

### 3.6 Dependencia nueva
- `@react-pdf/renderer`. Añadir a `serverExternalPackages` en `next.config.ts` si
  el bundler de producción se queja (es Node-only y pesado, mismo patrón que
  `exceljs`/`stripe`). Verificar build en preview antes de producción.

## 4. Modelo de datos
Se reutiliza tal cual (sin migración): `Order` + `OrderItem`. El canal y método de
pago viven en `Order.metadata` (Json) y `paymentStatus`. La url del PDF en
`Order.metadata.ticketUrl`. El nº de ticket en `Order.metadata.ticketNumber`.

## 5. Permisos
Solo admin (la sección `/admin` ya está protegida por auth + middleware). Todas
las server actions llaman `requireSession()`. Las acciones que tocan stock/dinero
exigen sesión válida; opcionalmente restringir a OWNER (a decidir; v1 permite
OWNER y EDITOR, como el resto del admin).

## 6. Errores y casos límite
- **Sin stock suficiente:** error claro, no se registra la venta (transacción).
- **Producto sin SKU:** fallback (modelCode/externalId/id).
- **Producto sin tallas (accesorio):** descuenta `Product.stock`.
- **Carrito vacío / cantidades ≤ 0:** botones deshabilitados / validación.
- **Fallo al generar/subir PDF:** la venta YA quedó registrada (stock descontado);
  el ticket se puede regenerar después con `generateTicketAction(orderId)`.
- **Sin teléfono de cliente:** el botón de WhatsApp queda deshabilitado (o pide el
  número antes de abrir el chat).

## 7. Testing
- `lib/pos/sku.test.ts`: composición de SKU (calzado `/talla`, ropa append,
  accesorio base, fallback sin sku).
- `lib/pos/totals.test.ts`: IVA incluido, descuentos línea/total.
- `lib/pos/sale.test.ts` (o e2e/unit con mock de Prisma): descuento de stock por
  talla vs producto; aborta si no hay stock; crea Order/OrderItem correctos; no
  cambia `status` del producto.
- `buildReceiptText`: formato estable del texto.

## 8. Fuera de alcance (v1)
- Cobro real con tarjeta (Stripe) — botón stub deshabilitado.
- Factura fiscal legal (requiere CIF). El comprobante es no fiscal.
- Envío automático de PDF por WhatsApp Business API.
- Numeración fiscal correlativa certificada / TicketBAI / Veri*factu.
- Devoluciones/abonos desde el TPV (futuro).
