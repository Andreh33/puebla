"use client";

import { useState } from "react";
import { MessageCircle, ExternalLink } from "lucide-react";
import { SizeSelector, type SizeOption } from "./SizeSelector";
import { AddToCartButton, type AddToCartProduct } from "./AddToCartButton";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";

type Props = {
  productName: string;
  sizes: SizeOption[];
  source?: "LOCAL" | "MIRAVIA" | "AMAZON";
  externalUrl?: string | null;
  /** Datos necesarios para añadir al carrito. Si falta, sólo mostramos WhatsApp. */
  product?: AddToCartProduct;
};

export function ProductActions({
  productName,
  sizes,
  source,
  externalUrl,
  product,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // Detectar "única" sola
  const onlyUnica =
    sizes.length === 1 &&
    (sizes[0]!.size.toUpperCase() === "ÃšNICA" || sizes[0]!.size.toUpperCase() === "UNICA");
  const requiresSize = sizes.length > 0 && !onlyUnica;
  const effectiveSize: string | null = onlyUnica ? "ÃšNICA" : selected;
  const canCta = !requiresSize || !!selected;

  const reservationHref = whatsappUrl(
    WhatsAppMessages.reservation(productName, effectiveSize ?? undefined),
  );

  if (source === "AMAZON" && externalUrl) {
    return (
      <div className="space-y-5">
        {sizes.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-zs-ink">Tallas disponibles</p>
            <SizeSelector sizes={sizes} onChange={setSelected} />
          </div>
        )}
        <a
          href={externalUrl}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-base font-semibold text-zs-blue-950 shadow-sm transition hover:bg-amber-400"
        >
          <ExternalLink className="h-5 w-5" /> Comprar en Amazon
        </a>
        <a
          href={reservationHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
        >
          <MessageCircle className="h-5 w-5 text-emerald-600" /> O consúltanos por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-zs-ink">Tallas disponibles</p>
          <SizeSelector sizes={sizes} onChange={setSelected} />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {product ? (
          <AddToCartButton
            product={product}
            selectedSize={effectiveSize}
            requiresSize={requiresSize}
            className="flex-1"
          />
        ) : null}
        <a
          href={reservationHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!canCta}
          onClick={(e) => {
            if (!canCta) {
              e.preventDefault();
            }
          }}
          className={
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-6 text-base font-semibold shadow-sm transition " +
            (canCta
              ? "border-[#25D366] bg-white text-[#107a3e] hover:bg-[#e8fbf0]"
              : "cursor-not-allowed border-zs-border bg-white text-zs-muted")
          }
        >
          <MessageCircle className="h-5 w-5 text-emerald-600" /> Reservar directo por WhatsApp
        </a>
      </div>
      {requiresSize && !selected && (
        <p className="text-xs text-zs-muted">Selecciona una talla para continuar.</p>
      )}
      <p className="text-[11px] leading-snug text-zs-muted">
        Pagos online próximamente. Añade al carrito y confirma por WhatsApp; te
        lo reservamos para recogida en tienda.
      </p>
    </div>
  );
}
