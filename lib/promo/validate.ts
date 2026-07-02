import "server-only";
import { db } from "@/lib/db";
import { computeDiscount, normalizeCode, type DiscountType } from "./compute";

export type PromoValidation =
  | { ok: true; code: string; discount: number; discountType: DiscountType; value: number }
  | { ok: false; error: string };

/**
 * Valida un código contra la BD y calcula el descuento en € sobre `subtotalGross`
 * (bruto, IVA incl.). Comprueba: existe, activo, dentro de fechas, compra mínima
 * y límite de usos. El nº de usos se cuenta desde los pedidos que ya lo llevan en
 * `metadata.promoCode` (solo pedidos reales/pagados), sin contador aparte.
 *
 * NUNCA lanza: devuelve `{ ok:false, error }` con un mensaje claro para la UI.
 */
export async function validatePromoCode(
  rawCode: string,
  subtotalGross: number,
): Promise<PromoValidation> {
  const code = normalizeCode(rawCode ?? "");
  if (!code) return { ok: false, error: "Introduce un código." };

  try {
    const promo = await db.promoCode.findUnique({ where: { code } });
    if (!promo || !promo.active) return { ok: false, error: "Código no válido." };

    const now = new Date();
    if (promo.startsAt && now < promo.startsAt) return { ok: false, error: "Este código aún no está activo." };
    if (promo.endsAt && now > promo.endsAt) return { ok: false, error: "Este código ha caducado." };

    const min = promo.minSubtotal != null ? Number(promo.minSubtotal) : 0;
    if (min > 0 && subtotalGross < min) {
      return { ok: false, error: `Compra mínima de ${min.toFixed(2)} € para este código.` };
    }

    if (promo.maxRedemptions != null) {
      const used = await db.order.count({
        where: {
          metadata: { path: ["promoCode"], equals: code },
          status: { notIn: ["REFUNDED", "CANCELLED"] },
        },
      });
      if (used >= promo.maxRedemptions) return { ok: false, error: "Este código ya no tiene usos disponibles." };
    }

    const type = (promo.discountType === "FIXED" ? "FIXED" : "PERCENT") as DiscountType;
    const value = Number(promo.value);
    const discount = computeDiscount(type, value, subtotalGross);
    if (discount <= 0) return { ok: false, error: "El código no aplica a esta compra." };

    return { ok: true, code, discount, discountType: type, value };
  } catch {
    return { ok: false, error: "No se pudo validar el código. Inténtalo de nuevo." };
  }
}
