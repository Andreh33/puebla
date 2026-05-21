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
  // Bloque 1: trabajamos sólo con tallas que tienen stock real (> 0). Las
  // tallas agotadas no se muestran ni cuentan para la CTA — el stock es la
  // fuente de verdad exportada del WP antiguo.
  const inStock = sizes.filter((s) => s.stock > 0);
  const hasSizes = sizes.length > 0;
  const allOutOfStock = hasSizes && inStock.length === 0;

  // "Talla única" con stock → no exige selección.
  const onlyUnica =
    inStock.length === 1 &&
    (inStock[0]!.size.toUpperCase() === "ÚNICA" ||
      inStock[0]!.size.toUpperCase() === "UNICA");

  // Pre-selección: si sólo queda una talla con stock (y no es "única"), la
  // dejamos elegida de entrada para acelerar la compra/reserva.
  const presetSize = !onlyUnica && inStock.length === 1 ? inStock[0]!.size : null;
  const [selected, setSelected] = useState<string | null>(presetSize);

  const requiresSize = inStock.length > 0 && !onlyUnica;
  const effectiveSize: string | null = onlyUnica ? "ÚNICA" : selected;
  const canCta = !requiresSize || !!selected;

  const reservationHref = whatsappUrl(
    WhatsAppMessages.reservation(productName, effectiveSize ?? undefined),
  );

  // Caso sin stock: el producto tiene tallas pero ninguna disponible. Ocultamos
  // el selector y ofrecemos consulta directa por WhatsApp con el nombre ya
  // pre-rellenado. (No aplica a Amazon, que se compra en el marketplace.)
  if (allOutOfStock && source !== "AMAZON") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Temporalmente sin stock</p>
          <p className="mt-1 text-sm text-amber-800">
            Consulta disponibilidad por WhatsApp y te avisamos en cuanto vuelva.
          </p>
        </div>
        <a
          href={whatsappUrl(WhatsAppMessages.product(productName))}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-white px-6 text-base font-semibold text-[#107a3e] shadow-sm transition hover:bg-[#e8fbf0]"
        >
          <MessageCircle className="h-5 w-5 text-emerald-600" /> Consultar disponibilidad
        </a>
      </div>
    );
  }

  if (source === "AMAZON" && externalUrl) {
    return (
      <div className="space-y-5">
        {inStock.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-zs-ink">Tallas disponibles</p>
            <SizeSelector
              sizes={inStock}
              defaultSize={presetSize ?? undefined}
              onChange={setSelected}
            />
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
      {inStock.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-zs-ink">Tallas disponibles</p>
          <SizeSelector
            sizes={inStock}
            defaultSize={presetSize ?? undefined}
            onChange={setSelected}
          />
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
