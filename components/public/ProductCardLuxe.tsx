"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type MouseEvent } from "react";
import { ImageOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceEUR } from "@/lib/utils";
import { effectivePrice } from "@/lib/price";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/hooks/use-swipe";
import type { ProductCardProduct } from "@/components/public/ProductCard";

type Props = {
  product: ProductCardProduct & { secondaryImageUrl?: string | null };
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** Callback opcional para abrir un "quick view" tipo Sheet. */
  onQuickView?: (product: ProductCardProduct) => void;
};

/**
 * ProductCardLuxe — variante premium de ProductCard.
 *
 * Interacciones:
 *  - Hover desktop: imagen rota 1deg, escala 1.02, sombra eleva, overlay 5%.
 *  - Badge precio surge bottom-left con slide-up.
 *  - Si hay segunda imagen: crossfade 300ms.
 *  - Click → ripple effect desde el punto del click antes de navegar.
 *  - Botón "Quick view" en hover desktop.
 *  - Mobile: swipe horizontal entre imágenes.
 */
export function ProductCardLuxe({
  product,
  priority = false,
  sizes,
  className,
  onQuickView,
}: Props) {
  const { final, retail, onSale, discountPct } = effectivePrice(
    Number(product.retailPrice),
    product.salePrice != null ? Number(product.salePrice) : null,
  );

  const title = product.shortName || product.name;
  const isAmazon = product.source === "AMAZON";
  const secondary = product.secondaryImageUrl ?? null;
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [mobileIndex, setMobileIndex] = useState(0);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const id = Date.now();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 650);
  }

  const images = [product.mainImageUrl, secondary].filter(Boolean) as string[];
  const mobileImg = images[mobileIndex] ?? product.mainImageUrl ?? null;

  const swipe = useSwipe({
    enabled: images.length > 1,
    threshold: 40,
    onSwipeLeft: () => setMobileIndex((i) => (i + 1) % images.length),
    onSwipeRight: () =>
      setMobileIndex((i) => (i - 1 + images.length) % images.length),
  });

  return (
    <Link
      ref={ref}
      onClick={handleClick}
      href={`/producto/${product.slug}`}
      className={cn(
        "zs-tilt-luxe group relative block overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition-all duration-500 ease-out",
        "hover:-translate-y-1 hover:shadow-[var(--shadow-zs-blue-glow-lg)]",
        className,
      )}
      aria-label={`${title}${product.colorName ? ` — ${product.colorName}` : ""} · ${formatPriceEUR(final.toNumber())}`}
      data-cursor="Ver"
    >
      <div
        className="relative aspect-square w-full overflow-hidden bg-zs-surface touch-pan-y"
        {...swipe.bind}
      >
        {product.mainImageUrl ? (
          <>
            <Image
              src={(typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches
                ? mobileImg
                : product.mainImageUrl)!}
              alt={`${title}${product.colorName ? ` — color ${product.colorName}` : ""}`}
              fill
              className={cn(
                "object-cover transition-all duration-500 ease-out",
                "group-hover:scale-[1.02] group-hover:rotate-[1deg]",
                secondary && "group-hover:opacity-0",
              )}
              sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
              priority={priority}
              placeholder={product.blurDataUrl ? "blur" : "empty"}
              blurDataURL={product.blurDataUrl ?? undefined}
            />
            {secondary && (
              <Image
                src={secondary}
                alt=""
                fill
                aria-hidden
                className="hidden object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 md:block"
                sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
              />
            )}
            {/* Overlay 5% */}
            <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/[0.05]" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zs-muted/60">
            <ImageOff className="h-10 w-10" aria-hidden />
            <span className="sr-only">Sin imagen</span>
          </div>
        )}

        {/* Badges */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2">
          {product.brand?.name ? (
            <Badge
              variant="secondary"
              className="bg-white/95 text-zs-blue-900 shadow-sm backdrop-blur"
            >
              {product.brand.name}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-end gap-1">
            {onSale && (
              <Badge variant="sale" className="shadow-sm">
                -{discountPct}%
              </Badge>
            )}
            {isAmazon && (
              <Badge variant="amazon" className="shadow-sm">
                Amazon
              </Badge>
            )}
          </div>
        </div>

        {/* Badge precio bottom-left surge en hover */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-2 left-2 z-10 translate-y-2 rounded-full bg-zs-blue-900/95 px-3 py-1 text-xs font-bold text-white opacity-0 shadow-md backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          {formatPriceEUR(final.toNumber())}
        </div>

        {/* Quick view (sólo desktop) */}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            className="pointer-events-auto absolute bottom-2 right-2 z-10 hidden translate-y-2 items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-zs-blue-900 opacity-0 shadow-md transition-all duration-300 hover:bg-white group-hover:translate-y-0 group-hover:opacity-100 md:inline-flex"
            data-cursor="Ver rápido"
          >
            <Eye className="h-3.5 w-3.5" /> Ver rápido
          </button>
        )}

        {/* Ripple */}
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden
            className="pointer-events-none absolute z-20 block h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zs-blue-900/15"
            style={{
              left: r.x,
              top: r.y,
              animation: "zs-ripple 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          />
        ))}

        {/* Indicador swipe mobile */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1 md:hidden">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 w-3 rounded-full transition-colors",
                  i === mobileIndex ? "bg-white" : "bg-white/40",
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1 p-3 sm:p-4">
        <p className="line-clamp-2 text-sm font-semibold text-zs-ink transition-colors group-hover:text-zs-blue-700">
          {title}
        </p>
        {product.colorName && product.colorName !== "Único" && (
          <p className="text-xs text-zs-muted">{product.colorName}</p>
        )}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-base font-bold tabular-nums text-zs-blue-900">
            {formatPriceEUR(final.toNumber())}
          </span>
          {onSale && (
            <span className="text-xs text-zs-muted line-through tabular-nums">
              {formatPriceEUR(retail.toNumber())}
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes zs-ripple { from { width: 0; height: 0; opacity: 0.6; } to { width: 220%; height: 220%; opacity: 0; } }
        @media (hover: hover) and (pointer: fine) {
          .zs-tilt-luxe { transform-style: preserve-3d; transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 600ms ease, translate 600ms ease; }
          .zs-tilt-luxe:hover { transform: perspective(900px) rotateX(2.5deg) rotateY(-1.5deg) translateY(-4px); }
        }
      `}</style>
    </Link>
  );
}
