"use client";

import Link from "next/link";
import Image from "next/image";

type Brand = { id: string; name: string; slug: string; logoUrl: string | null };

/**
 * BrandsMarquee — carrusel infinito CSS. Pausa en hover.
 * Duplica el listado y usa keyframes para garantizar bucle sin jumps.
 */
export function BrandsMarquee({ brands }: { brands: Brand[] }) {
  if (brands.length === 0) return null;
  const items = [...brands, ...brands];

  return (
    <div
      className="zs-marquee relative overflow-hidden"
      aria-label="Marcas que trabajamos"
    >
      <div className="zs-marquee-track flex w-max gap-10 py-2">
        {items.map((b, i) => (
          <Link
            key={b.id + "-" + i}
            href={`/marca/${b.slug}`}
            className="flex h-20 w-44 shrink-0 items-center justify-center rounded-xl border border-zs-border bg-white px-6 transition hover:border-zs-blue-700 hover:shadow-sm"
            aria-label={b.name}
          >
            {b.logoUrl ? (
              <Image
                src={b.logoUrl}
                alt={b.name}
                width={140}
                height={56}
                className="max-h-12 w-auto object-contain opacity-70 transition group-hover:opacity-100 hover:opacity-100"
              />
            ) : (
              <span className="text-sm font-semibold text-zs-blue-900">{b.name}</span>
            )}
          </Link>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent" />
      <style>{`
        @keyframes zs-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .zs-marquee-track { animation: zs-marquee 32s linear infinite; }
        .zs-marquee:hover .zs-marquee-track { animation-play-state: paused; }
              `}</style>
    </div>
  );
}
