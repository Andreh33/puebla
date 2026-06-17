"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { useCart } from "@/lib/cart/use-cart";
import { itemKey } from "@/lib/cart/store";
import { buildCartWhatsAppMessage } from "@/lib/cart/whatsapp-message";
import { whatsappUrl } from "@/lib/whatsapp";
import { formatPriceEUR } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/public/CheckoutButton";

export function CartView() {
  const { items, count, total, updateQty, removeItem, clear, ready } =
    useCart();

  if (!ready) {
    return (
      <div className="rounded-2xl border border-zs-border bg-white p-10 text-center">
        <p className="text-sm text-zs-muted">Cargando tu carrito…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  const whatsappHref = whatsappUrl(buildCartWhatsAppMessage(items));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* Lista de items */}
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={itemKey(item.productId, item.size)}
            className="grid grid-cols-[96px_1fr] gap-4 rounded-2xl border border-zs-border bg-white p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center"
          >
            <Link
              href={`/producto/${item.slug}`}
              className="relative aspect-square overflow-hidden rounded-xl bg-zs-surface"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 96px, 120px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zs-muted/60">
                  <ShoppingBag className="h-8 w-8" aria-hidden />
                </div>
              )}
            </Link>

            <div className="min-w-0">
              {item.brand && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zs-blue-700">
                  {item.brand}
                </p>
              )}
              <Link
                href={`/producto/${item.slug}`}
                className="line-clamp-2 text-base font-semibold text-zs-ink hover:text-zs-blue-700"
              >
                {item.name}
              </Link>
              <p className="mt-1 text-xs text-zs-muted">
                {item.colorName && item.colorName !== "Único" && (
                  <span>{item.colorName}</span>
                )}
                {item.size && (
                  <span>
                    {item.colorName && item.colorName !== "Único" ? " · " : ""}
                    Talla <strong className="text-zs-ink">{item.size}</strong>
                  </span>
                )}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <QtyStepper
                  value={item.qty}
                  max={item.maxStock}
                  onChange={(qty) =>
                    updateQty(item.productId, item.size, qty)
                  }
                  ariaLabel={`Cantidad de ${item.name}`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.size)}
                  aria-label={`Eliminar ${item.name} del carrito`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zs-muted transition hover:text-zs-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-xs text-zs-muted">
                {formatPriceEUR(item.price)} / ud
              </p>
              <p className="text-lg font-extrabold tabular-nums text-zs-blue-900">
                {formatPriceEUR(item.price * item.qty)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Resumen sticky */}
      <aside className="lg:sticky lg:top-24">
        <div className="rounded-2xl border border-zs-border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-zs-blue-900">Resumen</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zs-muted">
                {count} {count === 1 ? "producto" : "productos"}
              </dt>
              <dd className="font-semibold tabular-nums text-zs-ink">
                {formatPriceEUR(total)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zs-muted">IVA</dt>
              <dd className="text-zs-muted">incluido</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zs-muted">Recogida en tienda</dt>
              <dd className="text-emerald-600">gratis</dd>
            </div>
          </dl>
          <div className="my-4 border-t border-zs-border" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-zs-ink">Total</span>
            <span className="text-2xl font-extrabold tabular-nums text-zs-blue-900">
              {formatPriceEUR(total)}
            </span>
          </div>

          <CheckoutButton
            items={items}
            className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zs-blue-900 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-zs-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-white px-4 text-sm font-semibold text-[#1a9e4c] transition hover:bg-[#f0fdf4]"
          >
            <MessageCircle className="h-5 w-5" /> Reservar por WhatsApp
          </a>

          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "¿Vaciar el carrito? Esta acción no se puede deshacer.",
                )
              ) {
                clear();
              }
            }}
            className="mt-2 inline-flex h-10 w-full items-center justify-center text-xs font-semibold text-zs-muted transition hover:text-zs-red-600"
          >
            Vaciar carrito
          </button>
        </div>
      </aside>
    </div>
  );
}

function QtyStepper({
  value,
  onChange,
  ariaLabel,
  max,
}: {
  value: number;
  onChange: (qty: number) => void;
  ariaLabel: string;
  max?: number | null;
}) {
  const atMax = max != null && value >= max;
  return (
    <div className="inline-flex flex-col gap-1">
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
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-l-lg text-zs-ink transition hover:bg-zs-surface",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-9 px-1 text-center text-sm font-semibold tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={atMax}
          aria-label="Aumentar cantidad"
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-r-lg text-zs-ink transition hover:bg-zs-surface",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {atMax && (
        <span className="text-[11px] leading-none text-zs-muted">
          Máx. {max} disponible{max === 1 ? "" : "s"}
        </span>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-zs-border bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-full bg-zs-blue-50">
        <ShoppingBag className="h-10 w-10 text-zs-blue-700" aria-hidden />
      </div>
      <h2 className="text-xl font-bold text-zs-blue-900">
        Aún no tienes nada en el carrito
      </h2>
      <p className="mt-2 text-sm text-zs-muted">
        Explora nuestra tienda y añade productos para reservarlos. Te los
        guardamos para que pases a recogerlos cuando te venga bien.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/marcas"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zs-blue-900 px-5 text-sm font-semibold text-white hover:bg-zs-blue-800"
        >
          Ver marcas <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-5 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
