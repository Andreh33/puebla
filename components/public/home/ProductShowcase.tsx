import {
  t as _translateUi,
  translateValue as _translateValue,
  translateTemplate as _translateTemplate,
} from "@/lib/i18n/dictionaries";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import {
  ArrowUpRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Flame,
  Sparkles,
  BadgePercent,
} from "lucide-react";
import { ProductCardLuxe } from "@/components/public/ProductCardLuxe";
import { Reveal } from "@/components/public/Reveal";
import type { PublicProductCardData } from "@/lib/public-queries";

/**
 * ProductShowcase — "Top ventas" con vida comercial.
 *
 * Cambios respecto a versión previa:
 *  - Título: "Lo más comprado esta semana".
 *  - Badges rotando ("MÁS VENDIDO", "NOVEDAD", "OFERTA") encima de cada
 *    ProductCardLuxe en los 4 primeros productos. Pintados como pill flotante
 *    sobre la esquina superior izquierda — no toca al componente Card.
 *  - Ribbon de countdown mock "Oferta acaba en 2d 14h" sobre la cabecera.
 *  - Banner inferior: 3 columnas con iconos de confianza (envío 24h,
 *    devolución, pago seguro).
 */

type Tone = "red" | "tennis" | "blue";

type Badge = {
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: Tone;
};

const BADGES: Badge[] = [
  { label: "Más vendido", Icon: Flame, tone: "red" },
  { label: "Novedad", Icon: Sparkles, tone: "tennis" },
  { label: "Oferta", Icon: BadgePercent, tone: "red" },
];

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "red":
      return "bg-zs-red-600 text-white";
    case "tennis":
      return "bg-zs-tennis-300 text-zs-blue-950";
    case "blue":
      return "bg-white text-zs-blue-950";
  }
}

export function ProductShowcase({ products }: { products: PublicProductCardData[] }) {
  if (products.length === 0) return null;

  return (
    <section className="bg-zs-blue-950 relative py-24 text-white sm:py-32 lg:py-36">
      {/* Acentos sutiles de fondo */}
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="bg-zs-red-600 absolute top-10 -right-20 h-[28rem] w-[28rem] rounded-full blur-[160px]" />
        <div className="bg-zs-blue-700 absolute bottom-0 -left-20 h-[24rem] w-[24rem] rounded-full blur-[140px]" />
      </div>

      <header className="relative mx-auto mb-12 flex max-w-[1600px] flex-col gap-6 px-4 sm:mb-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal variant="fade-up">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] text-white/60 uppercase">
            <span className="inline-block h-px w-8 bg-white/30" />
            {_translateUi("Top ventas")}
          </p>
          <h2
            className="font-display mt-6 leading-[0.92] font-bold tracking-[-0.035em]"
            style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}
          >
            {_translateUi("Lo más comprado")}
            <br />
            <span className="text-white/45">{_translateUi("esta semana.")}</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            {/* Ribbon countdown mock */}
            <span className="border-zs-red-500/40 bg-zs-red-600/15 text-zs-red-300 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold tracking-[0.18em] uppercase">
              <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
              {_translateUi("Oferta acaba en 2d 14h")}
            </span>
            <Link
              href="#catalogo"
              data-cursor="Catálogo"
              className="group inline-flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-white uppercase"
            >
              <span className="zs-underline">{_translateUi("Ver catálogo completo")}</span>
              <span className="group-hover:text-zs-blue-950 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition-all group-hover:bg-white">
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
              </span>
            </Link>
          </div>
        </Reveal>
      </header>

      {/* Grid desktop / scroll snap mobile */}
      <div className="relative">
        <ul className="mx-auto flex max-w-[1600px] snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-4 sm:px-8 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-8 lg:grid-cols-4 lg:gap-6">
          {products.slice(0, 8).map((p, i) => {
            const badge = i < BADGES.length ? BADGES[i] : null;
            const Icon = badge?.Icon;
            return (
              <li
                key={p.id}
                className="relative w-[78vw] shrink-0 snap-start sm:w-[44vw] md:w-auto md:shrink"
              >
                <Reveal variant="fade-up" delay={Math.min(i * 60, 280)}>
                  <div className="relative">
                    {_translateValue(
                      badge && Icon ? (
                        <span
                          className={[
                            "pointer-events-none absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] uppercase shadow-lg",
                            toneClasses(badge.tone),
                          ].join(" ")}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                          {_translateUi(badge.label)}
                        </span>
                      ) : null,
                    )}
                    <ProductCardLuxe priority={i < 2} product={p} />
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Banda de confianza */}
      <div className="relative mx-auto mt-14 max-w-[1600px] px-4 sm:mt-20 sm:px-8">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            {
              Icon: Truck,
              title: "Envío a cinco países",
              caption: "Portugal, Francia, Italia y Alemania: 9,80 €",
            },
            {
              Icon: RotateCcw,
              title: "Cambios en 14 días",
              caption: "Devoluciones según la ley de consumidores",
            },
            {
              Icon: ShieldCheck,
              title: "Pago seguro",
              caption: "Tarjeta, Bizum o a plazos con Klarna",
            },
          ].map(({ Icon, title, caption }) => (
            <li
              key={title}
              className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur"
            >
              <span className="bg-zs-tennis-300 text-zs-blue-950 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div>
                <p className="text-sm font-bold tracking-[0.12em] text-white uppercase">
                  {_translateValue(title)}
                </p>
                <p className="mt-1 text-xs text-white/70">{_translateValue(caption)}</p>
              </div>
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
