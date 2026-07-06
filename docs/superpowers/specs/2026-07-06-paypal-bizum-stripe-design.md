# PayPal + Bizum vía Stripe — Diseño

- **Fecha:** 2026-07-06
- **Alcance:** Añadir **PayPal** y **Bizum** como métodos de pago del checkout online, aprovechando los *métodos dinámicos* de Stripe. Reflejar en `/admin/pedidos` **con qué método** pagó cada cliente.
- **Fuera de alcance:** integración nativa de PayPal (SDK propio, pipeline paralelo), cambios de esquema/migraciones, tocar el flujo de reembolso.
- **Pantallas:** panel de Stripe (activación) + `/admin/pedidos` (mostrar método).

---

## 1. Contexto y hallazgo clave

El checkout online crea una **Stripe Checkout Session hospedada** (`app/api/stripe/create-checkout/route.ts`, `mode: "payment"`) y **no fija `payment_method_types`**. Eso significa que Stripe usa **métodos de pago dinámicos**: los métodos que se activen en el panel de Stripe (Configuración → Métodos de pago) aparecen automáticamente en la pantalla de pago, **sin desplegar código**.

Tracé el pipeline completo y **es agnóstico al método de pago**:

- **`createOrderFromCheckout`** (`lib/stripe/orders.ts`) lee de la sesión: `line_items`, `amount_total`/`amount_subtotal`, `payment_intent`, `customer_details`, `payment_status`. Ningún campo es específico de tarjeta.
- **El webhook** (`app/api/stripe/webhook/route.ts`) maneja `checkout.session.completed` **y** `checkout.session.async_payment_succeeded`, y solo crea el pedido cuando `payment_status === "paid"`. Esa guarda (pensada para métodos asíncronos) es justo lo que hace que Bizum/PayPal funcionen tanto si confirman síncrona como asíncronamente.
- **Reembolsos** (`markOrderRefunded` vía `charge.refunded`, y el reembolso por línea `performOnlineItemRefund`) operan contra el PaymentIntent/Charge de Stripe → agnósticos al método.
- **Factura Holded** → agnóstica.

**Conclusión:** activar PayPal + Bizum **no requiere código obligatorio**. Es configuración en el panel de Stripe. El único código de este spec es una mejora opcional: **mostrar el método usado en el admin**.

## 2. Objetivos y no-objetivos

**Objetivos**
- Activar **Bizum** y **PayPal** en el checkout online, vía panel de Stripe (métodos dinámicos).
- Capturar el **método realmente usado** en cada pedido online y mostrarlo en `/admin/pedidos` (tabla + detalle): *Bizum / PayPal / Tarjeta*.
- No introducir migraciones ni riesgo de despliegue.

**No-objetivos (explícito)**
- **No** integración nativa de PayPal (sin SDK de PayPal, sin webhook propio, sin cuenta PayPal fuera de Stripe). PayPal se procesa **a través de** Stripe.
- **No** fijar `payment_method_types` en el código: se dejan los métodos **dinámicos** para poder activar/desactivar desde el panel sin desplegar.
- **No** añadir columnas a la BD (sin migración). El método se guarda en `Order.metadata`.
- **No** tocar el flujo de reembolso ni el de creación de pedido salvo el `expand` y la captura del método.
- **No** tocar Holded.

## 3. Frente 1 · Activación en Stripe (operativo, sin código)

Se conduce por el navegador (extensión de Chrome) con el dueño logueado en su cuenta de Stripe, o mediante guía clic-a-clic. Pasos:

1. **Stripe → Configuración → Métodos de pago** → activar **Bizum**. Bizum se liquida directamente en el saldo de Stripe; no requiere cuenta externa.
2. En la misma pantalla → **PayPal** → lanzar el conector de Stripe y completar el login/consentimiento de la **cuenta PayPal Business** (lo teclea el dueño en el popup de PayPal; no se manejan sus credenciales).
3. **Verificar el webhook**: sigue apuntando a `https://zonasport.vercel.app/api/stripe/webhook` (⚠️ trampa conocida: **no** `zonasport.es`, que está aparcado) y mantiene suscritos los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `payment_intent.payment_failed`.

**Orden recomendado:** mergear primero el Frente 2 (código) y activar después, para que la primera venta por Bizum/PayPal ya se etiquete bien en el admin.

**Cosas a saber (operativa, no código):**
- **Bizum** es solo España (EUR) y tiene **límite de importe por operación**; Stripe **oculta** el método automáticamente si el carrito lo supera (no hay que codificar nada).
- **PayPal/Bizum** se reembolsan igual desde `/admin/pedidos`, pero Stripe impone una **ventana temporal** para el reembolso.
- Si un método **no aparece** en la pantalla de métodos de pago del panel, es cuestión de **elegibilidad de la cuenta** de Stripe, no de código.

## 4. Frente 2 · Código: mostrar el método en el admin (sin migración)

### 4.1 Sin cambios de esquema

Se reutiliza el JSON `Order.metadata` (que ya guarda `oversold`, `returns`, `stockRestored`, `promoCode`…). Se añade una clave:

```jsonc
"paymentMethod": "bizum"   // "bizum" | "paypal" | "card" | (ausente)
```

### 4.2 Captura del método en `createOrderFromCheckout` (`lib/stripe/orders.ts`)

Fuente canónica de "qué se usó realmente": el **cargo** asociado al PaymentIntent →
`payment_intent.latest_charge.payment_method_details.type` (devuelve `"card"`, `"paypal"`, `"bizum"`, …).

Cambios (todos **best-effort**, nunca rompen el pedido):

1. Ampliar el `expand` de la recuperación de sesión existente (líneas ~108-113) para traer el cargo:
   ```ts
   expand: ["line_items.data.price.product", "payment_intent.latest_charge"]
   ```
2. Extraer el método con un helper tolerante:
   ```ts
   function extractPaymentMethod(session: Stripe.Checkout.Session): string | null {
     const pi = session.payment_intent;
     if (!pi || typeof pi === "string") return null;
     const charge = pi.latest_charge;
     if (!charge || typeof charge === "string") return null;
     return charge.payment_method_details?.type ?? null;
   }
   ```
3. Persistir en `metadata`: al construir `baseMetadata` (línea ~167), añadir `paymentMethod` cuando exista:
   ```ts
   const paymentMethod = extractPaymentMethod(expandedSession);
   const baseMetadata = {
     ...(expandedSession.metadata ?? {}),
     ...(paymentMethod ? { paymentMethod } : {}),
   } as Record<string, unknown>;
   ```
   Así se guarda en el `create` y se conserva en el `update` de `oversold` (que hace spread de `baseMetadata`).

**Camino no-recuperado:** si la sesión llegara con `line_items` ya presente (raro en webhooks), no se recupera el cargo y `paymentMethod` queda ausente → la UI cae a la etiqueta genérica "Online". Aceptable para v1; no se añade un fetch extra por esto.

### 4.3 Helper de etiqueta (pura, testeable)

Nuevo `lib/stripe/payment-method.ts`:

```ts
export function paymentMethodLabel(
  method: string | null | undefined,
  deliveryMethod: string | null | undefined,
): string {
  switch (method) {
    case "bizum": return "Bizum";
    case "paypal": return "PayPal";
    case "card":   return "Tarjeta";
  }
  if (deliveryMethod === "in_store") return "TPV";
  return "Online";
}
```

(Las ventas TPV no tienen `metadata.paymentMethod` y son `deliveryMethod === "in_store"` → etiqueta "TPV".)

### 4.4 Serializers y tipos

- **`lib/stripe/types.ts`:** añadir `paymentMethod: string | null` a `OrderSummary` y `OrderDetail`.
- **`lib/stripe/orders.ts`:** en `toOrderSummary` y `toOrderDetail`, leer el método de `metadata` con un lector tolerante (al estilo de `hasOversold`):
  ```ts
  function readPaymentMethod(metadata: Prisma.JsonValue | null): string | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const m = (metadata as Record<string, unknown>).paymentMethod;
    return typeof m === "string" ? m : null;
  }
  ```
  y exponer `paymentMethod: readPaymentMethod(o.metadata)`.

### 4.5 UI (`app/admin/pedidos/PedidosTable.tsx`)

- Junto al estado de pago existente (tabla y modal de detalle), pintar un **chip** con `paymentMethodLabel(order.paymentMethod, order.deliveryMethod)`.
- Coherencia visual con los chips/estados ya presentes; sin librerías nuevas.
- No requiere cambios en las server actions ni en la carga de datos más allá del nuevo campo ya expuesto por los serializers.

## 5. Lo que NO cambia (y por qué es seguro)

- **`create-checkout/route.ts`:** sin cambios. Los métodos siguen dinámicos. (Si en el futuro alguien fijara `payment_method_types`, tendría que incluir `"paypal"` y `"bizum"` explícitamente — anotado como aviso.)
- **`webhook/route.ts`:** sin cambios (delega en `orders.ts`).
- **Reembolsos** (`markOrderRefunded`, `performOnlineItemRefund`): sin cambios; agnósticos al método.
- **Holded / factura:** sin cambios.
- **Migraciones:** ninguna.
- **Balance / sales-queries:** sin cambios (no dependen del método de pago).

## 6. Casos límite

- **Método no resoluble** (cargo no expandido, método exótico): `paymentMethod` ausente → etiqueta "Online". No rompe nada.
- **Pedido TPV** (`in_store`): sin `paymentMethod` → etiqueta "TPV".
- **Idempotencia del webhook:** el segundo `completed`/`async_payment_succeeded` encuentra el pedido ya creado y retorna el existente (comportamiento actual intacto); no re-escribe metadata.
- **Método nuevo de Stripe en el futuro** (p. ej. Apple Pay se reporta como `"card"`): cae a "Tarjeta"; correcto. Cualquier `type` desconocido → "Online".

## 7. Pruebas (Vitest)

- **`paymentMethodLabel`** (nuevo `tests/unit/payment-method-label.test.ts`): mapea `bizum`/`paypal`/`card`; `in_store` → "TPV"; `null`/desconocido → "Online".
- **Captura del método**: test al estilo de `tests/unit/stripe-orders-refund.test.ts` (mock de `@/lib/db` + Stripe): una sesión con `payment_intent.latest_charge.payment_method_details.type = "bizum"` crea el pedido con `metadata.paymentMethod === "bizum"`; una sesión sin cargo expandido lo crea sin la clave.
- **Serializer**: `toOrderSummary`/`toOrderDetail` exponen `paymentMethod` desde `metadata` (incluyendo el caso ausente → `null`).

## 8. Alternativas consideradas

1. **Columna `paymentMethod` en `Order` (migración aditiva).** Más "correcta" semánticamente, pero obliga a **migración** (`prisma migrate deploy` en el build → riesgo de despliegue). Descartada: la trampa de migraciones no compensa para un dato de visualización.
2. **Guardar el método en `metadata` (elegida).** Sin migración, mínima superficie, mismo patrón que `oversold`/`returns`.
3. **Integración nativa de PayPal.** Evita la comisión de Stripe sobre PayPal, pero exige un pipeline paralelo completo (checkout, webhook, creación de pedido, stock, Holded, reembolsos) y su mantenimiento. Descartada salvo que el volumen por PayPal justifique el coste de construir y mantener un segundo sistema de cobro.

## 9. Resumen de seguridad ("no rompe nada")

- 🚫 Migraciones: ninguna. 🚫 Reembolsos: sin cambios. 🚫 Holded: sin cambios. 🚫 Checkout: sin cambios (métodos dinámicos).
- ✅ Captura de método: best-effort, nunca lanza; si falla, "Online".
- ✅ Activación real (Bizum/PayPal): en el panel de Stripe, sin despliegue.
