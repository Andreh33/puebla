"use client";

import {
  useTranslations,
  useTranslatedValue,
  useTranslatedTemplate,
} from "@/components/public/LocaleProvider";
import Image from "next/image";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * GenderSplit — split 50/50 que crece a 60/40 según el hover, ahora con
 * fotos reales (Unsplash) + una card pequeña "Para los pequeños" debajo.
 *
 * Tipografía monumental: "PARA ELLA" / "PARA EL" en mayúsculas con tracking
 * apretado.
 *
 * En móvil: dos bloques apilados (sin grow), y la card de niños queda como
 * tercera tarjeta debajo.
 */

type Side = {
  label: string;
  word: string;
  caption: string;
  href: string;
  image: string;
  accent: string;
};

const SIDES: [Side, Side] = [
  {
    label: "Ella",
    word: "PARA ELLA",
    caption: "Running · fitness · urban · selección 2026",
    href: "/mujer",
    image: "/category-photos/mujer-hero.jpg",
    accent: "from-zs-red-600/35 via-transparent",
  },
  {
    label: "Él",
    word: "PARA ÉL",
    caption: "Trail · asfalto · calle · selección 2026",
    href: "/hombre",
    // Misma foto que usa "Textil de hombre" (/hombre/textil) — petición cliente.
    image: "/category-photos/textil-hombre.jpg",
    accent: "from-zs-blue-700/40 via-transparent",
  },
];

export function GenderSplit() {
  const _translateUi = useTranslations();
  const _translateValue = useTranslatedValue();
  const [hovered, setHovered] = useState<0 | 1 | null>(null);

  return (
    <section className="bg-zs-blue-950 relative text-white">
      <div className="grid h-[80svh] min-h-[640px] grid-cols-1 lg:h-[88svh] lg:grid-cols-2">
        {SIDES.map((s, idx) => {
          const i = idx as 0 | 1;
          const grow = hovered === i;
          const shrink = hovered !== null && hovered !== i;
          return (
            <Link
              key={s.label}
              href={s.href}
              data-cursor={s.label}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className={[
                "group relative isolate flex h-full w-full overflow-hidden",
                "transition-[flex,opacity] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
              ].join(" ")}
              style={{
                flex: hovered === null ? "1 1 50%" : grow ? "1 1 60%" : "1 1 40%",
              }}
            >
              <Image
                src={s.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className={[
                  "object-cover object-center transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                  grow ? "scale-[1.08]" : "scale-100",
                ].join(" ")}
              />
              {/* Velo gradiente principal */}
              <div
                aria-hidden
                className="from-zs-blue-950/85 via-zs-blue-950/35 absolute inset-0 bg-gradient-to-tr to-transparent"
              />
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-to-tr ${s.accent} to-transparent`}
              />
              <div
                aria-hidden
                className={[
                  "bg-zs-blue-950/0 pointer-events-none absolute inset-0 transition-opacity duration-700",
                  shrink ? "bg-zs-blue-950/35" : "",
                ].join(" ")}
              />

              <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 sm:p-12 lg:p-16">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold tracking-[0.32em] text-white/75 uppercase">
                    {_translateValue(s.label)}
                  </p>
                  <span className="group-hover:text-zs-blue-950 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.08] backdrop-blur transition-all duration-500 group-hover:bg-white">
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
                  </span>
                </div>

                <div>
                  <h3
                    className={[
                      "font-display leading-[0.86] font-black tracking-[-0.04em]",
                      "transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                      grow ? "lg:translate-x-2" : "",
                    ].join(" ")}
                    style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
                  >
                    {_translateValue(s.word)}
                  </h3>
                  <p className="mt-6 max-w-md text-base text-white/80">
                    {_translateValue(s.caption)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tercera card "Para los pequeños" — mismo peso visual que las dos
          principales: ocupa 64svh con mínimo 540px y tipografía hasta 8rem,
          imagen bleed completa a la derecha y CTA grande tipo botón. */}
      <div className="group bg-zs-tennis-500 text-zs-blue-950 relative isolate flex h-[64svh] min-h-[540px] w-full overflow-hidden lg:h-[70svh]">
        <Image
          src="/category-photos/ninos-hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-90 transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
        {/* Velo gradiente: blanco-tenis a la izquierda, despeja a la derecha
            para dejar respirar la foto. */}
        <div
          aria-hidden
          className="from-zs-tennis-500/95 via-zs-tennis-500/55 absolute inset-0 bg-gradient-to-r to-transparent"
        />
        <div
          aria-hidden
          className="from-zs-blue-950/30 absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent"
        />

        <div className="relative z-10 mx-auto grid h-full w-full max-w-[1600px] grid-cols-1 items-center gap-6 px-6 py-12 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:px-16 lg:py-16">
          <div className="flex flex-col gap-6">
            <p className="bg-zs-blue-950 text-zs-tennis-300 inline-flex items-center gap-3 self-start rounded-full px-4 py-2 text-[11px] font-bold tracking-[0.32em] uppercase">
              <span className="bg-zs-tennis-300 inline-block h-1.5 w-1.5 rounded-full" />
              {_translateUi("Para los pequeños")}
            </p>
            <h3
              className="font-display leading-[0.86] font-black tracking-[-0.04em]"
              style={{ fontSize: "clamp(2.75rem, 8vw, 8rem)" }}
            >
              {_translateUi("Que no paren.")}
            </h3>
            <p className="text-zs-blue-950/80 max-w-lg text-base sm:text-lg">
              {_translateUi(
                "Niño y niña — calzado, ropa, equipación. Tallas que duran lo justo porque crecen rápido. Marcas y precios que tu economía agradece.",
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/nino"
                data-cursor="Niño"
                className="group/cta bg-zs-blue-950 text-zs-tennis-300 hover:bg-zs-red-600 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold tracking-[0.12em] uppercase shadow-lg transition hover:text-white"
              >
                {_translateUi("Entrar a Niño")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:rotate-45" />
              </Link>
              <Link
                href="/nina"
                data-cursor="Niña"
                className="group/cta bg-zs-blue-950 text-zs-tennis-300 hover:bg-zs-red-600 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold tracking-[0.12em] uppercase shadow-lg transition hover:text-white"
              >
                {_translateUi("Entrar a Niña")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:rotate-45" />
              </Link>
              <Link
                href="/bebe"
                data-cursor="Bebé"
                className="group/cta bg-zs-blue-950 text-zs-tennis-300 hover:bg-zs-red-600 inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold tracking-[0.12em] uppercase shadow-lg transition hover:text-white"
              >
                {_translateUi("Entrar a Bebé")}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover/cta:rotate-45" />
              </Link>
            </div>
          </div>

          {/* Espacio derecho — la foto del fondo respira aquí sin texto encima. */}
          <div className="hidden lg:block" aria-hidden />
        </div>

        {/* Sub-tabs decorativos abajo-izquierda en desktop, anuncian los 2 sub-géneros */}
        <ul
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-6 z-10 hidden gap-2 sm:flex lg:left-16"
        >
          {["Niño", "Niña", "Bebé"].map((label) => (
            <li
              key={label}
              className="border-zs-blue-950/25 text-zs-blue-950 rounded-full border bg-white/45 px-3 py-1 text-[10px] font-bold tracking-[0.22em] uppercase backdrop-blur"
            >
              {_translateValue(label)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
