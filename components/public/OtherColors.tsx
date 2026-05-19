import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ColorSibling = {
  id: string;
  slug: string;
  colorName: string;
  colorHex?: string | null;
  mainImageUrl?: string | null;
};

type Props = {
  siblings: ColorSibling[];
  currentColor: string;
  productName: string;
};

export function OtherColors({ siblings, currentColor, productName }: Props) {
  if (!siblings || siblings.length === 0) return null;

  return (
    <section aria-labelledby="other-colors-heading" className="space-y-3">
      <h2 id="other-colors-heading" className="text-sm font-semibold text-zs-blue-900">
        Otros colores disponibles
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {siblings.map((s) => (
          <Link
            key={s.id}
            href={`/producto/${s.slug}`}
            aria-label={`${productName} en color ${s.colorName}`}
            className={cn(
              "group relative flex flex-col gap-1 rounded-xl border bg-white p-1.5 transition hover:border-zs-blue-700",
              "border-zs-border",
            )}
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zs-surface">
              {s.mainImageUrl ? (
                <Image
                  src={s.mainImageUrl}
                  alt={`${productName} en color ${s.colorName}`}
                  fill
                  sizes="120px"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zs-muted/60">
                  <ImageOff className="h-6 w-6" aria-hidden />
                </div>
              )}
            </div>
            <p className="line-clamp-1 px-1 text-center text-[11px] font-medium text-zs-ink">
              {s.colorName}
            </p>
          </Link>
        ))}
      </div>
      <p className="text-xs text-zs-muted">
        Cada color de {productName} es una ficha independiente (talla, stock y precio
        propios). Color actual: <strong className="text-zs-ink">{currentColor}</strong>.
      </p>
    </section>
  );
}
