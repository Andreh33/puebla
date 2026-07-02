import * as React from "react";

/**
 * Código de promoción aplicado en el carrito (cliente). Se guarda en
 * localStorage y se difunde por un evento para que carrito/drawer/botón de pago
 * lo compartan. La validación autoritativa la hace el servidor al pagar.
 */
export const PROMO_KEY = "zs_cart_promo";
export const PROMO_EVENT = "zs:cart-promo";

export function getStoredPromo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROMO_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredPromo(code: string | null): void {
  try {
    if (code) window.localStorage.setItem(PROMO_KEY, code);
    else window.localStorage.removeItem(PROMO_KEY);
    window.dispatchEvent(new CustomEvent(PROMO_EVENT, { detail: code }));
  } catch {
    /* localStorage no disponible */
  }
}

export function usePromoCode(): string | null {
  const [code, setCode] = React.useState<string | null>(null);
  React.useEffect(() => {
    setCode(getStoredPromo());
    const handler = (e: Event) => setCode((e as CustomEvent<string | null>).detail ?? null);
    window.addEventListener(PROMO_EVENT, handler);
    return () => window.removeEventListener(PROMO_EVENT, handler);
  }, []);
  return code;
}

/**
 * Código aplicado + su descuento en € para un `subtotal` dado. Revalida contra el
 * servidor cuando cambia el código o el subtotal; si el código deja de valer (p.
 * ej. caducó o baja del mínimo), lo quita solo. Es una PREVISUALIZACIÓN: el
 * descuento real lo fija create-checkout con los precios de BD.
 */
export function useCartPromo(subtotal: number): { code: string | null; discount: number } {
  const code = usePromoCode();
  const [discount, setDiscount] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    if (!code || subtotal <= 0) {
      setDiscount(0);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/promo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, subtotal }),
        });
        const data = (await res.json()) as { ok?: boolean; discount?: number };
        if (!alive) return;
        // Solo actualizamos el descuento mostrado. NO borramos el código aquí
        // (un 429 o bajar del mínimo un instante son transitorios); si de verdad
        // ya no vale, lo quita create-checkout al pagar (CheckoutButton).
        setDiscount(data.ok && typeof data.discount === "number" ? data.discount : 0);
      } catch {
        if (alive) setDiscount(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, subtotal]);
  return { code, discount };
}
