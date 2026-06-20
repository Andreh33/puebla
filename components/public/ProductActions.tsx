"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MessageCircle, ExternalLink } from "lucide-react";
import { SizeSelector, type SizeOption } from "./SizeSelector";
import { AddToCartButton, type AddToCartProduct } from "./AddToCartButton";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";

type Props = {
  productName: string;
  /** Precio ya formateado (p. ej. "39,95 €") — se incluye en el mensaje de WhatsApp. */
  priceLabel?: string;
  sizes: SizeOption[];
  source?: "LOCAL" | "MIRAVIA" | "AMAZON";
  externalUrl?: string | null;
  /** Datos necesarios para añadir al carrito. Si falta, sólo mostramos WhatsApp. */
  product?: AddToCartProduct;
  /** Bloque que se muestra ENTRE el selector de talla y el botón de añadir al
   *  carrito (p. ej. la descripción técnica). Se renderiza en el servidor. */
  descriptionSlot?: ReactNode;
};

export function ProductActions({
  productName,
  priceLabel,
  sizes,
  source,
  externalUrl,
  product,
  descriptionSlot,
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

  // URL del producto (cliente): se añade al mensaje de WhatsApp para que el chat
  // muestre la vista previa con la imagen OG — la "mini-ficha".
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const requiresSize = inStock.length > 0 && !onlyUnica;
  const effectiveSize: string | null = onlyUnica ? "ÚNICA" : selected;
  const canCta = !requiresSize || !!selected;

  // Stock de la talla elegida → se pasa al botón para capar la cantidad en el
  // carrito y avisar antes de llegar al checkout (1 color = 1 producto, la
  // talla es la variante con stock propio).
  const selectedSizeStock = onlyUnica
    ? inStock[0]?.stock ?? null
    : selected != null
      ? inStock.find((s) => s.size === selected)?.stock ?? null
      : null;

  const reservationHref = whatsappUrl(
    WhatsAppMessages.reservation(productName, effectiveSize ?? undefined, {
      url: pageUrl || undefined,
      price: priceLabel,
    }),
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
        {descriptionSlot}
        <a
          href={whatsappUrl(
            WhatsAppMessages.product(productName, undefined, {
              url: pageUrl || undefined,
              price: priceLabel,
            }),
          )}
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
        {descriptionSlot}
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

      {descriptionSlot}

      <div className="flex flex-col gap-2 sm:flex-row">
        {product ? (
          <AddToCartButton
            product={product}
            selectedSize={effectiveSize}
            requiresSize={requiresSize}
            maxStock={selectedSizeStock}
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
        Paga online con tarjeta de forma segura, o resérvalo por WhatsApp para
        recogerlo en tienda.
      </p>
    </div>
  );
}
