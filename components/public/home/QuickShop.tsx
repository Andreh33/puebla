"use client";

import {
  useTranslations,
  useTranslatedValue,
  useTranslatedTemplate,
} from "@/components/public/LocaleProvider";
import Image from "next/image";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";

/**
 * QuickShop — atajos comerciales a las 4 categorías estrella.
 *
 * Reemplaza al BentoLookbook (bento con productos demo) por 4 tarjetas
 * grandes con fotos Unsplash bleed-to-edge:
 *
 *   [Running] [Padel] [Montaña] [Calzado]
 *
 * Cada card:
 *   - Foto `/category-photos/<slug>.jpg` con object-cover.
 *   - Gradient bottom oscuro para asegurar contraste del texto.
 *   - Título grande, eyebrow numerada, CTA "Ver categoría →".
 *   - Hover: zoom suave 1.04, overlay rojo zs-red 10%, flecha desliza a la derecha.
 *
 * En móvil colapsa a una columna manteniendo el orden.
 */

type Card = {
  slug: string;
  title: string;
  eyebrow: string;
  caption: string;
  href: string;
  image: string;
};

const CARDS: Card[] = [
  {
    slug: "running",
    title: "Running",
    eyebrow: "01",
    caption: "Asfalto · trail · cinta",
    href: "/hombre/calzado?tipo=running",
    image: "/category-photos/running.jpg",
  },
  {
    slug: "padel",
    title: "Pádel",
    eyebrow: "02",
    caption: "Palas · ropa · pelotas",
    href: "/padel",
    image: "/category-photos/padel.jpg",
  },
  {
    slug: "montana",
    title: "Montaña",
    eyebrow: "03",
    caption: "Trekking · escalada · ferrata",
    href: "/montana",
    image: "/category-photos/montana.jpg",
  },
  {
    slug: "calzado",
    title: "Calzado",
    eyebrow: "04",
    caption: "Sneakers · botas · técnico",
    href: "/calzado",
    image: "/category-photos/calzado.jpg",
  },
];

export function QuickShop() {
  const _translateUi = useTranslations();
  const _translateValue = useTranslatedValue();
  return (
    <section className="relative bg-white py-20 sm:py-28 lg:py-32">
      <header className="mx-auto mb-10 flex max-w-[1600px] flex-col gap-4 px-4 sm:mb-14 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal variant="fade-up" className="max-w-2xl">
          <p className="text-zs-muted inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] uppercase">
            <span className="bg-zs-blue-900/30 inline-block h-px w-8" />
            {_translateUi("Atajos para comprar")}
          </p>
          <h2
            className="font-display text-zs-blue-950 mt-4 leading-[0.95] font-bold tracking-[-0.035em]"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            {_translateUi("Empieza por")}{" "}
            <span className="text-zs-red-600">{_translateUi("aquí")}</span>
            {_translateUi(".")}
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <p className="text-zs-muted max-w-md text-sm leading-relaxed lg:text-right">
            {_translateUi(
              "Cuatro mundos. Mismo trato cercano. Elige el tuyo y ponte cómodo: nuestra selección está ya curada por talla, marca y presupuesto.",
            )}
          </p>
        </Reveal>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {CARDS.map((c, i) => (
            <Reveal key={c.slug} variant="fade-up" delay={Math.min(i * 90, 320)}>
              <Link
                href={c.href}
                data-cursor={c.title}
                className="group bg-zs-blue-950 relative flex aspect-[3/4] w-full overflow-hidden rounded-3xl text-white shadow-[var(--shadow-zs-blue-glow)] transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-[var(--shadow-zs-rojo-glow-lg)]"
              >
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                />
                {/* Gradiente bottom oscuro permanente */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
                />
                {/* Overlay rojo en hover */}
                <div
                  aria-hidden
                  className="bg-zs-red-600/0 group-hover:bg-zs-red-600/12 pointer-events-none absolute inset-0 transition-colors duration-500"
                />

                <div className="relative z-10 flex h-full w-full flex-col justify-between p-6 sm:p-7">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.28em] text-white/85 uppercase">
                      {_translateValue(c.eyebrow)} {_translateUi("·")}{" "}
                      {_translateValue(c.caption.split(" · ")[0])}
                    </span>
                  </div>

                  <div>
                    <h3
                      className="font-display leading-[0.95] font-black tracking-[-0.03em]"
                      style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)" }}
                    >
                      {_translateValue(c.title)}
                    </h3>
                    <p className="mt-2 text-xs font-medium tracking-[0.18em] text-white/70 uppercase">
                      {_translateValue(c.caption)}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold tracking-[0.18em] text-white uppercase">
                      {_translateUi("Ver categoría")}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1.5"
                        strokeWidth={2.5}
                      />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
