"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState, type MouseEvent } from "react";
import { ImageOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceEUR } from "@/lib/utils";
import { effectivePrice } from "@/lib/price";
import { cn } from "@/lib/utils";
import { stripHtml, decodeEntities } from "@/lib/utils/html";
import { useSwipe } from "@/hooks/use-swipe";
import { stockBadge, type ProductCardProduct } from "@/components/public/ProductCard";
import { hasAnimatedBorder } from "@/lib/products/visual";

type Props = {
  product: ProductCardProduct & { secondaryImageUrl?: string | null };
  priority?: boolean;
  sizes?: string;
  className?: string;
  /**
   * Controla el borde pastel animado. Si el listado lo pasa (selección ~20% del
   * listado actual vía selectAnimatedBorderIds) tiene prioridad; si se omite,
   * fallback al hash determinista por slug (hasAnimatedBorder).
   */
  animated?: boolean;
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
  animated,
  onQuickView,
}: Props) {
  const { final, retail, onSale, discountPct } = effectivePrice(
    Number(product.retailPrice),
    product.salePrice != null ? Number(product.salePrice) : null,
  );

  // Usamos `name` (nombre real) y NO `shortName`: en el feed WooCommerce
  // el shortName es la primera frase de la descripción, no un título.
  // Igualamos la card a lo que muestra la ficha del producto. stripHtml
  // por si el feed dejó <strong> o spans en el name.
  const title = stripHtml(product.name || product.shortName);
  const isAmazon = product.source === "AMAZON";
  const secondary = product.secondaryImageUrl ?? null;
  // Borde pastel animado: si el listado pasa `animated` (selección ~20% del
  // listado actual) lo respetamos; si no, fallback al hash por slug.
  const animatedBorder = animated ?? hasAnimatedBorder(product.slug);
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

  // Tilt 3D que sigue al cursor (Bloque 7.7; el brillo se quitó por feedback —
  // se mantiene solo en las tarjetas del hub "¿Qué buscas hoy?").
  function handleMove(e: MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 9}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 11}deg`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
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
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      href={`/producto/${product.slug}`}
      className={cn(
        "zs-tilt-luxe group relative block overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition-all duration-500 ease-out",
        "hover:shadow-[var(--shadow-zs-blue-glow-lg)]",
        animatedBorder && "product-card--animated",
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
              {decodeEntities(product.brand.name)}
            </Badge>
          ) : (
            <span />
          )}
          <div className="flex flex-col items-end gap-1">
            {(() => {
              const sb = stockBadge(product.totalStock);
              return sb ? (
                <Badge className={cn("shadow-sm", sb.cls)}>{sb.label}</Badge>
              ) : null;
            })()}
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
        {/* Tallas disponibles (stock > 0) — Bloque 8.3 */}
        {product.availableSizes && product.availableSizes.length > 0 && (
          <p className="pt-0.5 text-[11px] font-medium tracking-wide text-zs-muted">
            {product.availableSizes.slice(0, 4).join(" · ")}
            {product.availableSizes.length > 4 && (
              <span className="text-zs-muted/70"> +{product.availableSizes.length - 4}</span>
            )}
          </p>
        )}
      </div>

      <style>{`
        @keyframes zs-ripple { from { width: 0; height: 0; opacity: 0.6; } to { width: 220%; height: 220%; opacity: 0; } }
        @media (hover: hover) and (pointer: fine) {
          .zs-tilt-luxe { transform-style: preserve-3d; transition: transform 200ms ease-out, box-shadow 500ms ease; }
          .zs-tilt-luxe:hover { transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); }
        }
      `}</style>
    </Link>
  );
}
