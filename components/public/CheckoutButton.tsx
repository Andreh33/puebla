"use client";

import { useTranslatedValue, useTranslatedTemplate } from "@/components/public/LocaleProvider";
import { useLocale } from "@/components/public/LocaleProvider";
import { SHIPPING_COUNTRIES, shippingCents, type ShippingCountry } from "@/lib/stripe/shipping";
import { LOCALE_INFO } from "@/lib/i18n/config";
import { useTranslations } from "@/components/public/LocaleProvider";
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
  const tx = useTranslatedValue();
  const t = useTranslations();
  const locale = useLocale();
  const [shippingCountry, setShippingCountry] = useState<ShippingCountry>("ES");
  const shipping = shippingCents(shippingCountry, "shipping");
  const countryLabels = {
    ES: "España",
    PT: "Portugal",
    FR: "Francia",
    IT: "Italia",
    DE: "Alemania",
  } as const;
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
        body: JSON.stringify({
          items: checkoutItems,
          deliveryMethod: "shipping",
          shippingCountry,
          locale,
          promoCode,
        }),
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
      toast.error(t("No se pudo iniciar el pago. Inténtalo de nuevo."));
    } catch {
      toast.error(t("Error de conexión. Comprueba tu red e inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="text-zs-ink mt-4 block text-xs font-semibold">
        {t("País de entrega")}
        <select
          value={shippingCountry}
          onChange={(event) => setShippingCountry(event.target.value as ShippingCountry)}
          disabled={loading}
          className="border-zs-border mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-sm"
        >
          {SHIPPING_COUNTRIES.map((country) => (
            <option key={country} value={country}>
              {t(countryLabels[country])}
            </option>
          ))}
        </select>
      </label>
      <p className="text-zs-muted mt-2 text-xs">
        {t("Envío")}:{" "}
        {new Intl.NumberFormat(LOCALE_INFO[locale].language, {
          style: "currency",
          currency: "EUR",
        }).format(shipping / 100)}
      </p>
      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled}
        className={
          className ??
          "bg-zs-blue-900 hover:bg-zs-blue-800 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
        }
        aria-label={t("Realizar pago")}
      >
        {tx(
          loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <CreditCard className="h-4 w-4" aria-hidden />
          ),
        )}
        {tx(loading ? t("Redirigiendo…") : t("Realizar pago"))}
      </button>
    </div>
  );
}
