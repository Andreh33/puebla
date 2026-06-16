"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, Trash2, MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCart } from "@/lib/cart/use-cart";
import { buildCartWhatsAppMessage } from "@/lib/cart/whatsapp-message";
import { whatsappUrl } from "@/lib/whatsapp";
import { formatPriceEUR } from "@/lib/utils";
import { itemKey } from "@/lib/cart/store";
import { CheckoutButton } from "@/components/public/CheckoutButton";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartDrawer({ open, onOpenChange }: Props) {
  const { items, count, total, updateQty, removeItem, ready } = useCart();

  const whatsappHref = whatsappUrl(buildCartWhatsAppMessage(items));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Tu carrito</SheetTitle>
          <SheetDescription>
            {count === 0
              ? "Aún no tienes nada seleccionado."
              : `${count} ${count === 1 ? "producto" : "productos"} listos para reservar.`}
          </SheetDescription>
        </SheetHeader>

        {/* Cuerpo con scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!ready ? (
            <EmptyHydrating />
          ) : items.length === 0 ? (
            <EmptyCart onClose={() => onOpenChange(false)} />
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={itemKey(item.productId, item.size)}
                  className="flex gap-3 rounded-xl border border-zs-border bg-white p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zs-surface">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zs-muted/60">
                        <ShoppingBag className="h-6 w-6" aria-hidden />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {item.brand && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zs-blue-700">
                            {item.brand}
                          </p>
                        )}
                        <Link
                          href={`/producto/${item.slug}`}
                          onClick={() => onOpenChange(false)}
                          className="line-clamp-2 text-sm font-semibold text-zs-ink hover:text-zs-blue-700"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-zs-muted">
                          {item.colorName && item.colorName !== "Único" && (
                            <span>{item.colorName}</span>
                          )}
                          {item.size && (
                            <span>
                              {item.colorName && item.colorName !== "Único" ? " · " : ""}
                              Talla {item.size}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId, item.size)}
                        aria-label={`Eliminar ${item.name} del carrito`}
                        className="rounded-md p-1 text-zs-muted transition-colors hover:bg-zs-surface hover:text-zs-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QtyStepper
                        value={item.qty}
                        onChange={(qty) =>
                          updateQty(item.productId, item.size, qty)
                        }
                        ariaLabel={`Cantidad de ${item.name}`}
                      />
                      <span className="text-sm font-bold tabular-nums text-zs-blue-900">
                        {formatPriceEUR(item.price * item.qty)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer fijo con total y CTAs */}
        {items.length > 0 && (
          <div className="border-t border-zs-border bg-zs-surface px-5 py-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <span className="text-sm text-zs-muted">Total</span>
              <span className="text-xl font-extrabold tabular-nums text-zs-blue-900">
                {formatPriceEUR(total)}
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-snug text-zs-muted">
              IVA incluido. Paga con tarjeta o confirma por WhatsApp.
            </p>
            <div className="flex flex-col gap-2">
              <CheckoutButton items={items} />
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-white px-4 text-sm font-semibold text-[#1a9e4c] transition hover:bg-[#f0fdf4]"
              >
                <MessageCircle className="h-4 w-4" /> Reservar por WhatsApp
              </a>
              <Link
                href="/carrito"
                onClick={() => onOpenChange(false)}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold text-zs-ink transition hover:bg-zs-surface"
              >
                Ver carrito
              </Link>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function QtyStepper({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (qty: number) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-zs-border bg-white"
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Reducir cantidad"
        className="inline-flex h-8 w-8 items-center justify-center rounded-l-lg text-zs-ink transition hover:bg-zs-surface disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar cantidad"
        className="inline-flex h-8 w-8 items-center justify-center rounded-r-lg text-zs-ink transition hover:bg-zs-surface"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EmptyHydrating() {
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <ShoppingBag className="h-10 w-10 text-zs-muted/40" aria-hidden />
      <p className="text-sm text-zs-muted">Cargando tu carrito…</p>
    </div>
  );
}

function EmptyCart({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-zs-blue-50 p-5">
        <ShoppingBag className="h-10 w-10 text-zs-blue-700" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-zs-blue-900">
          Tu carrito está vacío
        </p>
        <p className="text-sm text-zs-muted">
          Añade productos desde la tienda y vuelve aquí para reservar.
        </p>
      </div>
      <Link
        href="/marcas"
        onClick={onClose}
        className="inline-flex h-10 items-center justify-center rounded-xl bg-zs-blue-900 px-4 text-sm font-semibold text-white hover:bg-zs-blue-800"
      >
        Explorar marcas
      </Link>
    </div>
  );
}
