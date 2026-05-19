import { cn } from "@/lib/utils";

type Props = {
  count?: number;
  className?: string;
};

/**
 * ProductCardSkeleton — silueta SHAPED de tarjeta de producto.
 *
 * Mimetiza el layout real de `ProductCard`/`ProductCardLuxe`:
 *  - Bloque cuadrado de imagen.
 *  - Badge de marca top-left.
 *  - Líneas de título (2).
 *  - Precio bottom-left.
 */
export function ProductCardSkeleton({ count = 1, className }: Props) {
  if (count === 1) return <SingleSkeleton className={className} />;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} className={className} />
      ))}
    </>
  );
}

function SingleSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      <div className="relative aspect-square w-full overflow-hidden bg-zs-surface">
        <div className="skeleton-shimmer absolute inset-0" />
        {/* Badge marca */}
        <div className="absolute left-3 top-3 h-6 w-16 rounded-md bg-white/70 backdrop-blur" />
        {/* Badge sale */}
        <div className="absolute right-3 top-3 h-5 w-10 rounded-md bg-white/70 backdrop-blur" />
      </div>
      <div className="space-y-2 p-3 sm:p-4">
        <div className="skeleton-shimmer h-3.5 w-11/12 rounded-md" />
        <div className="skeleton-shimmer h-3.5 w-2/3 rounded-md" />
        <div className="pt-1">
          <div className="skeleton-shimmer h-4 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
