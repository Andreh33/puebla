"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CartItem } from "@/lib/cart/store";
import type { CheckoutCartItem, CreateCheckoutResponse } from "@/lib/stripe/types";
import { getStoredPromo, setStoredPromo } from "@/lib/cart/promo-code";

interface Props {
  items: CartItem[];
  className?: string;
}

/**
 * Botón reutilizable "Realizar pago" que envía los items del carrito al
 * endpoint /api/stripe/create-checkout y redirige a la URL de Stripe (donde el
 * cliente elige método: tarjeta, Bizum, etc. — métodos dinámicos).
 *
 * Se desactiva automáticamente cuando el carrito está vacío o durante la
 * petición. El servidor re-valida precios; el cliente solo manda los items.
 */
export function CheckoutButton({ items, className }: Props) {
  const [loading, setLoading] = useState(false);

  const disabled = items.length === 0 || loading;

  async function handleCheckout() {
    if (disabled) return;
    setLoading(true);
    try {
      const checkoutItems: CheckoutCartItem[] = items.map((it) => ({
        productId: it.productId,
        slug: it.slug,
        name: it.name,
        brand: it.brand,
        imageUrl: it.imageUrl,
        colorName: it.colorName,
        size: it.size,
        price: it.price,
        qty: it.qty,
      }));

      const promoCode = getStoredPromo() || undefined;
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems, deliveryMethod: "shipping", promoCode }),
      });

      const data: CreateCheckoutResponse = await res.json();

      if (data.ok) {
        window.location.href = data.url;
        // No quitamos el loading aquí porque la página va a redirigir
        return;
      }

      // Si el código ya no vale (caducó entre el carrito y el pago), lo quitamos
      // para que el cliente pueda pagar sin él.
      if (!data.ok && (data.error === "promo_invalid" || data.error === "promo_too_big")) {
        setStoredPromo(null);
      }
      // Error devuelto por el servidor
      toast.error(data.message ?? "No se pudo iniciar el pago. Inténtalo de nuevo.");
    } catch {
      toast.error("Error de conexión. Comprueba tu red e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={disabled}
      className={
        className ??
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zs-blue-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      }
      aria-label="Realizar pago"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <CreditCard className="h-4 w-4" aria-hidden />
      )}
      {loading ? "Redirigiendo…" : "Realizar pago"}
    </button>
  );
}
