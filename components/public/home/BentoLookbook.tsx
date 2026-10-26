"use client";

import {
  useTranslations,
  useTranslatedValue,
  useTranslatedTemplate,
} from "@/components/public/LocaleProvider";
import Image from "next/image";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";

/**
 * BentoLookbook — sustituye las 4 cards de "Descubre por deporte" en colores
 * planos por una rejilla asimétrica editorial tipo bento.
 *
 * Composición (desktop, 12 cols × 6 rows):
 *   ┌──────────────────────┬───────────────┐
 *   │ A  feature 7x4       │ B  3x2        │
 *   │                      ├───────────────┤
 *   │                      │ C  3x2        │
 *   ├──────────┬───────────┴───────────────┤
 *   │ D  4x2   │ E  4x2     │ F  4x2       │
 *   └──────────┴────────────┴──────────────┘
 *
 * En móvil colapsa a una columna manteniendo el orden semántico.
 *
 * Cada celda muestra una imagen real bleed-to-edge (productos del demo),
 * etiqueta con número de sección, deport asociado, y un underline que recorre
 * el texto en hover. Click → categoría correspondiente.
 */

type Cell = {
  title: string;
  eyebrow: string;
  caption: string;
  href: string;
  image: string;
  /** Tailwind grid placement clases (desktop). */
  span: string;
  ratio: string;
  tone?: "light" | "dark";
};

const CELLS: Cell[] = [
  {
    eyebrow: "01 · Montaña",
    title: "Cuando la sierra empieza, las costuras tienen que aguantar.",
    caption: "+8000 · trekking, escalada, ferrata",
    href: "/montana",
    image: "/sample-products/bota-alta-8000-takon-24i-negro.webp",
    span: "lg:col-span-7 lg:row-span-4",
    ratio: "aspect-[5/6] lg:aspect-auto",
    tone: "dark",
  },
  {
    eyebrow: "02 · Running",
    title: "Asfalto. Tartán. La N-V al amanecer.",
    caption: "Selección running urbano",
    href: "/hombre/calzado?tipo=running",
    image: "/sample-products/zapatilla-john-smith-rewik-azul-marino.webp",
    span: "lg:col-span-5 lg:row-span-2",
    ratio: "aspect-[4/3]",
  },
  {
    eyebrow: "03 · Estilo",
    title: "Streetwear que se entiende fuera del centro comercial.",
    caption: "John Smith · diario",
    href: "/calzado",
    image: "/sample-products/zapatilla-john-smith-ruder-negroblanco.webp",
    span: "lg:col-span-5 lg:row-span-2",
    ratio: "aspect-[4/3]",
  },
  {
    eyebrow: "04 · Outdoor",
    title: "Capas para una primavera con viento.",
    caption: "Chubasqueros · cortavientos · forros",
    href: "/montana",
    image: "/sample-products/anorack-cazadora-8000-colese-24i-avellana.webp",
    span: "lg:col-span-4 lg:row-span-2",
    ratio: "aspect-[3/4]",
  },
  {
    eyebrow: "05 · Pádel",
    title: "El pádel también se viste.",
    caption: "Equipación · ropa técnica",
    href: "/padel",
    image: "/sample-products/short-poliester-john-smith-hocen-24i-negro.webp",
    span: "lg:col-span-4 lg:row-span-2",
    ratio: "aspect-[3/4]",
  },
  {
    eyebrow: "06 · Sudaderas",
    title: "Lo que te pones cuando bajas a por el pan.",
    caption: "Forros · sudaderas · midlayer",
    href: "/calzado",
    image: "/sample-products/sudadera-8000-arange-jungla.webp",
    span: "lg:col-span-4 lg:row-span-2",
    ratio: "aspect-[3/4]",
  },
];

export function BentoLookbook() {
  const _translateUi = useTranslations();
  const _translateValue = useTranslatedValue();
  return (
    <section className="relative bg-white py-24 sm:py-32 lg:py-40">
      <header className="mx-auto mb-14 flex max-w-[1600px] flex-col gap-6 px-4 sm:mb-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal className="max-w-2xl" variant="fade-up">
          <p className="text-zs-muted inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] uppercase">
            <span className="bg-zs-blue-900/30 inline-block h-px w-8" />
            {_translateUi("01 — Lookbook")}
          </p>
          <h2
            className="font-display text-zs-blue-950 mt-6 leading-[0.92] font-bold tracking-[-0.035em]"
            style={{ fontSize: "clamp(2.5rem, 6.5vw, 5.5rem)" }}
          >
            {_translateUi("Una temporada")}
            <br />
            <span className="text-zs-muted/70">{_translateUi("elegida a mano.")}</span>
          </h2>
        </Reveal>
        <Reveal
          className="text-zs-muted max-w-md text-base leading-relaxed lg:text-right"
          variant="fade-up"
          delay={150}
        >
          <p>
            {_translateUi(
              "No traemos todo. Solo lo que probaríamos nosotros. Cada referencia del muro ha pasado por la tienda antes de pasar por la web.",
            )}
          </p>
        </Reveal>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12 lg:grid-rows-6 lg:gap-5">
          {CELLS.map((cell, i) => (
            <Reveal
              key={cell.href + i}
              className={cell.span}
              variant="fade-up"
              delay={Math.min(i * 80, 320)}
            >
              <Link
                href={cell.href}
                data-cursor="Ver"
                className={[
                  "group bg-zs-surface relative block h-full w-full overflow-hidden rounded-3xl",
                  cell.ratio,
                  "transition-[transform,box-shadow] duration-500 hover:shadow-[0_40px_80px_-30px_rgba(11,22,64,0.45)]",
                ].join(" ")}
              >
                <Image
                  src={cell.image}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                />
                {/* Velo y degradado para contraste */}
                <div
                  aria-hidden
                  className={[
                    "pointer-events-none absolute inset-0 transition-opacity duration-500",
                    cell.tone === "dark"
                      ? "bg-gradient-to-t from-black/75 via-black/25 to-black/10"
                      : "bg-gradient-to-t from-black/55 via-black/15 to-transparent",
                  ].join(" ")}
                />
                <div
                  aria-hidden
                  className="bg-zs-blue-950/0 group-hover:bg-zs-blue-950/15 pointer-events-none absolute inset-0 transition-colors duration-500"
                />

                <div className="absolute inset-0 flex flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-semibold tracking-[0.28em] text-white/80 uppercase">
                      {_translateValue(cell.eyebrow)}
                    </span>
                    <span className="group-hover:text-zs-blue-950 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] backdrop-blur transition-all duration-500 group-hover:bg-white">
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:rotate-45" />
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h3
                      className="font-display max-w-[18ch] leading-[1.02] font-bold tracking-[-0.025em]"
                      style={{
                        fontSize: cell.span.includes("col-span-7")
                          ? "clamp(1.75rem, 3.5vw, 3.4rem)"
                          : "clamp(1.25rem, 2vw, 1.85rem)",
                      }}
                    >
                      <span className="zs-lookbook-line">{_translateValue(cell.title)}</span>
                    </h3>
                    <p className="text-xs font-medium tracking-[0.22em] text-white/65 uppercase">
                      {_translateValue(cell.caption)}
                    </p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>

      <style>{`
        .zs-lookbook-line {
          background-image: linear-gradient(currentColor, currentColor);
          background-size: 0% 1px;
          background-position: 0 100%;
          background-repeat: no-repeat;
          transition: background-size 700ms cubic-bezier(0.16, 1, 0.3, 1);
          padding-bottom: 2px;
        }
        .group:hover .zs-lookbook-line { background-size: 100% 1px; }
      `}</style>
    </section>
  );
}
