import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceEUR } from "@/lib/utils";
import { effectivePrice } from "@/lib/price";
import { cn } from "@/lib/utils";

export type ProductCardProduct = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  colorName?: string | null;
  mainImageUrl?: string | null;
  retailPrice: number | string;
  salePrice?: number | string | null;
  source?: "LOCAL" | "MOVALIA" | "AMAZON" | null;
  brand?: { name: string; slug?: string | null } | null;
  blurDataUrl?: string | null;
};

type Props = {
  product: ProductCardProduct;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ProductCard({ product, priority = false, sizes, className }: Props) {
  const { final, retail, onSale, discountPct } = effectivePrice(
    Number(product.retailPrice),
    product.salePrice != null ? Number(product.salePrice) : null,
  );

  const title = product.shortName || product.name;
  const isAmazon = product.source === "AMAZON";

  return (
    <Link
      href={`/producto/${product.slug}`}
      className={cn(
        "zs-tilt group block overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-zs-blue-glow)]",
        className,
      )}
      aria-label={`${title}${product.colorName ? ` — ${product.colorName}` : ""} · ${formatPriceEUR(final.toNumber())}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-zs-surface">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={`${title}${product.colorName ? ` — color ${product.colorName}` : ""}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
            priority={priority}
            placeholder={product.blurDataUrl ? "blur" : "empty"}
            blurDataURL={product.blurDataUrl ?? undefined}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zs-muted/60">
            <ImageOff className="h-10 w-10" aria-hidden />
            <span className="sr-only">Sin imagen</span>
          </div>
        )}

        {/* Badges */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
          {product.brand?.name ? (
            <Badge variant="secondary" className="bg-white/95 text-zs-blue-900 shadow-sm backdrop-blur">
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
      </div>

      <div className="space-y-1 p-3 sm:p-4">
        <p className="line-clamp-2 text-sm font-semibold text-zs-ink group-hover:text-zs-blue-700">
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
      {/* Tilt 3D sutil — sólo se aplica en pointer fino (desktop), no marea.
          Definido inline para no contaminar globals con un selector demasiado
          específico; sólo este componente lo activa. */}
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .zs-tilt { transform-style: preserve-3d; transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 600ms ease, translate 600ms ease; }
          .zs-tilt:hover { transform: perspective(900px) rotateX(2deg) rotateY(-2deg); }
        }
      `}</style>
    </Link>
  );
}
