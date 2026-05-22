import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceEUR } from "@/lib/utils";
import { effectivePrice } from "@/lib/price";
import { cn } from "@/lib/utils";
import { stripHtml, decodeEntities } from "@/lib/utils/html";

export type ProductCardProduct = {
  id: string;
  slug: string;
  name: string;
  shortName?: string | null;
  colorName?: string | null;
  mainImageUrl?: string | null;
  retailPrice: number | string;
  salePrice?: number | string | null;
  source?: "LOCAL" | "MIRAVIA" | "AMAZON" | null;
  brand?: { name: string; slug?: string | null } | null;
  blurDataUrl?: string | null;
  /**
   * Suma de stock de todas las tallas (Bloque 1). Si es `undefined`/`null` no
   * conocemos el stock y no pintamos badge; `0` → "Agotado"; `1..3` → "Pocas
   * unidades". El stock es el real exportado del WP antiguo.
   */
  totalStock?: number | null;
  /**
   * Tallas con stock > 0 (Bloque 8.3). Si está presente, las cards luxe las
   * muestran bajo el precio (primeras 4 + "+N"). Orden = el de la BD.
   */
  availableSizes?: string[] | null;
};

/**
 * Badge de stock para los listados (Bloque 1). `undefined`/`null` = stock
 * desconocido → no se pinta nada. `0` → "Agotado". `1..3` → "Pocas unidades".
 */
export function stockBadge(
  totalStock: number | null | undefined,
): { label: string; cls: string } | null {
  if (typeof totalStock !== "number") return null;
  if (totalStock <= 0) return { label: "Agotado", cls: "border-transparent bg-zs-ink/80 text-white" };
  if (totalStock <= 3) return { label: "Pocas unidades", cls: "border-transparent bg-amber-500 text-white" };
  return null;
}

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

  // Usamos `name` (nombre real: "CHÁNDAL JOMA BEBÉ NARANJA GRIS") y NO
  // `shortName`: en el feed WooCommerce el shortName es la primera frase
  // de la descripción ("El chándal Joma... está fabricado en..."), no un
  // título. La ficha del producto sí muestra el name correcto; aquí lo
  // igualamos para que la card "por fuera" coincida con la ficha.
  const title = stripHtml(product.name || product.shortName);
  const isAmazon = product.source === "AMAZON";

  return (
    <Link
      href={`/producto/${product.slug}`}
      className={cn(
        "zs-tilt group block overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-zs-blue-glow)]",
        className,
      )}
      aria-label={`${title}${product.colorName ? ` â€” ${product.colorName}` : ""} · ${formatPriceEUR(final.toNumber())}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-zs-surface">
        {product.mainImageUrl ? (
          <Image
            src={product.mainImageUrl}
            alt={`${title}${product.colorName ? ` â€” color ${product.colorName}` : ""}`}
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
      </div>

      <div className="space-y-1 p-3 sm:p-4">
        <p className="line-clamp-2 text-sm font-semibold text-zs-ink group-hover:text-zs-blue-700">
          {title}
        </p>
        {product.colorName && product.colorName !== "Ãšnico" && (
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
      {/* Tilt 3D sutil â€” sólo se aplica en pointer fino (desktop), no marea.
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
