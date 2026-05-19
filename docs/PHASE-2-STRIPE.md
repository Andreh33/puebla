# Fase 2 — Integración de Stripe (pendiente)

> Este documento es la **referencia** de cómo añadir pagos online sobre la arquitectura
> actual sin romper nada. La implementación se desencadena con un prompt aparte cuando
> el cliente confirme la fecha.

## Estado actual (MVP)

El sitio ya muestra productos, gestiona el catálogo, blog, leads y CRM, pero:

- No hay tabla `Order` ni `Payment` en la DB.
- El botón "Comprar" abre un `<AlertDialog>` con CTA a WhatsApp.
- Existe `CartIntent` en Prisma (modelo placeholder) que guarda intenciones del visitante
  en `localStorage` y en server opcionalmente. Esto permite arrancar carrito real sin
  perder los intentos previos.
- Componentes `CartIcon` y `CartDrawer` existen como placeholders en `components/public/`.

## Plan de migración

### 1. Schema Prisma

Añadir (NO modificar lo existente):

```prisma
model Order {
  id           String       @id @default(cuid())
  number       String       @unique             // "ZS-2026-0001"
  status       OrderStatus  @default(PENDING)
  customerEmail String
  customerName  String
  customerPhone String?
  shippingAddressId String?
  shippingAddress   Address? @relation("ShippingAddress", fields: [shippingAddressId], references: [id])
  billingAddressId  String?
  billingAddress    Address? @relation("BillingAddress", fields: [billingAddressId], references: [id])
  items        OrderItem[]
  payments     Payment[]
  subtotal     Decimal @db.Decimal(10,2)
  shippingCost Decimal @db.Decimal(10,2) @default(0)
  taxAmount    Decimal @db.Decimal(10,2)
  total        Decimal @db.Decimal(10,2)
  currency     String  @default("EUR")
  cartIntentId String?
  stripeCheckoutSessionId String? @unique
  stripePaymentIntentId   String? @unique
  notes        String?  @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  productSnapshot Json   // copia inmutable de nombre, precio, imagen al momento de la compra
  size      String?
  qty       Int
  unitPrice Decimal @db.Decimal(10,2)
  lineTotal Decimal @db.Decimal(10,2)
}

model Payment {
  id        String @id @default(cuid())
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider  String                                // "stripe"
  status    String                                // "succeeded" | "pending" | "failed" | "refunded"
  amount    Decimal @db.Decimal(10,2)
  currency  String @default("EUR")
  externalId String?                              // pi_xxx / cs_xxx
  rawEvent  Json?
  createdAt DateTime @default(now())
}

model Address {
  id          String @id @default(cuid())
  fullName    String
  line1       String
  line2       String?
  city        String
  postalCode  String
  region      String?
  country     String @default("ES")
  phone       String?
  userId      String?
  shippingOrders Order[] @relation("ShippingAddress")
  billingOrders  Order[] @relation("BillingAddress")
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}
```

### 2. Variables de entorno

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_TAX_RATE=tax_rate_xxx          # IVA 21% configurado en Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3. Rutas a crear

- `POST /api/checkout/create-session` — crea Checkout Session a partir de un cart server-side.
- `POST /api/stripe/webhook` — handler de webhooks (`checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, etc.). Verificar firma con `STRIPE_WEBHOOK_SECRET`.
- `GET /pedido/[number]/confirmacion` — post-purchase.
- `/admin/pedidos` — listado de pedidos con filtros.
- `/admin/pedidos/[id]` — detalle, cambio de estado, reembolsos.

### 4. UI

- `components/public/CartDrawer.tsx` se conecta al cart real (`/api/cart` GET/POST/DELETE).
- Botón "Pagar" sustituye al `<AlertDialog>` placeholder. Si Stripe falla, fallback al modal de WhatsApp (manteniendo la experiencia previa).
- Página `/checkout` con Payment Element embebido O redirección a Checkout Session (decisión por DX vs UX).

### 5. Webhooks idempotentes

- Tabla `WebhookEvent` con `externalId @unique` para no procesar dos veces.
- Procesar de forma desacoplada (no bloquear respuesta 200 con lógica pesada).

### 6. Transportistas y envíos

- Tabla `ShippingZone` y `ShippingRate` con reglas por código postal / peso.
- Inicialmente: tres zonas (España península / Baleares / Canarias) + recogida en tienda gratis.
- Integración con Correos / MRW / GLS (out of scope inicial, queda para fase 2.1).

### 7. Recibos por email

- Plantilla `order-confirmation.tsx` con Resend.
- Plantilla `shipping-notification.tsx`.
- Plantilla `refund-notification.tsx`.

### 8. Tests

- Vitest unit sobre cálculo de totales (IVA, descuentos, envíos).
- Playwright E2E con Stripe test mode (`4242 4242 4242 4242`).
- Verificar idempotencia de webhooks.

### 9. RGPD

- Actualizar política de privacidad: añadir Stripe como encargado del tratamiento (transferencia internacional, DPF).
- Actualizar política de cookies si Stripe Elements añade cookies.

### 10. Migración suave

1. Desplegar la fase 2 en preview con `FEATURE_FLAG_STRIPE=true`.
2. QA completo en staging con Stripe test mode.
3. Activar `STRIPE_LIVE=true` solo cuando todo verificado.
4. El placeholder de WhatsApp se mantiene como fallback durante el primer mes (si Stripe da error, se vuelve al CTA WhatsApp).

---

## Referencias

- [Stripe Checkout vs Payment Element](https://stripe.com/docs/payments)
- [Webhooks signing](https://stripe.com/docs/webhooks/signatures)
- [Tax in Spain](https://stripe.com/docs/tax/spain)
- Skill local: `stripe-best-practices` (invocar `/stripe-best-practices` en Claude Code).
