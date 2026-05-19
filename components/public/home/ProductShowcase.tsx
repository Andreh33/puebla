import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ProductCardLuxe } from "@/components/public/ProductCardLuxe";
import { Reveal } from "@/components/public/Reveal";
import type { PublicProductCardData } from "@/lib/public-queries";

/**
 * ProductShowcase — sección "Lo más buscado" reemplaza "Lo que más sale por la
 * puerta". Server component que recibe productos ya consultados.
 *
 *  - Desktop: grid 4 columnas.
 *  - Mobile: scroll-snap horizontal con flex y peek de la siguiente card.
 *  - Eyebrow editorial con numeración 02.
 *  - CTA destacado al final que enlaza al catálogo.
 */
export function ProductShowcase({
  products,
}: {
  products: PublicProductCardData[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="relative bg-zs-blue-950 py-24 text-white sm:py-32 lg:py-40">
      {/* Acentos sutiles de fondo */}
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute -right-20 top-10 h-[28rem] w-[28rem] rounded-full bg-zs-red-600 blur-[160px]" />
        <div className="absolute -left-20 bottom-0 h-[24rem] w-[24rem] rounded-full bg-zs-blue-700 blur-[140px]" />
      </div>

      <header className="relative mx-auto mb-14 flex max-w-[1600px] flex-col gap-6 px-4 sm:mb-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal variant="fade-up">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60">
            <span className="inline-block h-px w-8 bg-white/30" />
            02 — Selección
          </p>
          <h2
            className="mt-6 font-display font-bold leading-[0.92] tracking-[-0.035em]"
            style={{ fontSize: "clamp(2.5rem, 6.5vw, 5.5rem)" }}
          >
            Lo más buscado<br />
            <span className="text-white/45">esta semana.</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={150}>
          <Link
            href="#catalogo"
            data-cursor="Catálogo"
            className="group inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-white"
          >
            <span className="zs-underline">Catálogo completo</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition-all group-hover:bg-white group-hover:text-zs-blue-950">
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
            </span>
          </Link>
        </Reveal>
      </header>

      {/* Grid desktop / scroll snap mobile */}
      <div className="relative">
        <ul
          className="
            mx-auto flex max-w-[1600px] snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4
            [scrollbar-width:none] sm:px-8
            md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-8
            lg:grid-cols-4 lg:gap-6
          "
        >
          {products.slice(0, 8).map((p, i) => (
            <li
              key={p.id}
              className="w-[78vw] shrink-0 snap-start sm:w-[44vw] md:w-auto md:shrink"
            >
              <Reveal variant="fade-up" delay={Math.min(i * 60, 280)}>
                <ProductCardLuxe priority={i < 2} product={p} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .zs-underline {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 100% 1px;
          background-position: 0 100%;
          background-repeat: no-repeat;
          padding-bottom: 4px;
        }
        ul[class*="overflow-x-auto"]::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
