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
