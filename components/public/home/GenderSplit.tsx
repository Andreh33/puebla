"use client";

import Image from "next/image";
import Link from "next/link";
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
    image: "/category-photos/hombre-hero.jpg",
    accent: "from-zs-blue-700/40 via-transparent",
  },
];

export function GenderSplit() {
  const [hovered, setHovered] = useState<0 | 1 | null>(null);

  return (
    <section className="relative bg-zs-blue-950 text-white">
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
                flex:
                  hovered === null
                    ? "1 1 50%"
                    : grow
                      ? "1 1 60%"
                      : "1 1 40%",
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
                className="absolute inset-0 bg-gradient-to-tr from-zs-blue-950/85 via-zs-blue-950/35 to-transparent"
              />
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-to-tr ${s.accent} to-transparent`}
              />
              <div
                aria-hidden
                className={[
                  "pointer-events-none absolute inset-0 bg-zs-blue-950/0 transition-opacity duration-700",
                  shrink ? "bg-zs-blue-950/35" : "",
                ].join(" ")}
              />

              <div className="relative z-10 flex h-full w-full flex-col justify-between p-8 sm:p-12 lg:p-16">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/75">
                    {s.label}
                  </p>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/[0.08] backdrop-blur transition-all duration-500 group-hover:bg-white group-hover:text-zs-blue-950">
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
                  </span>
                </div>

                <div>
                  <h3
                    className={[
                      "font-display font-black leading-[0.86] tracking-[-0.04em]",
                      "transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
                      grow ? "lg:translate-x-2" : "",
                    ].join(" ")}
                    style={{ fontSize: "clamp(3rem, 9vw, 9rem)" }}
                  >
                    {s.word}
                  </h3>
                  <p className="mt-6 max-w-md text-base text-white/80">
                    {s.caption}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tercera card "Para los pequeños" */}
      <Link
        href="/ninos"
        data-cursor="Niños"
        className="group relative isolate flex h-[34svh] min-h-[280px] w-full overflow-hidden bg-zs-tennis-300 text-zs-blue-950"
      >
        <Image
          src="/category-photos/ninos-hero.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-90 transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-zs-tennis-300/85 via-zs-tennis-300/40 to-transparent"
        />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] items-center justify-between gap-6 px-6 sm:px-12 lg:px-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-zs-blue-950/75">
              Para los pequeños
            </p>
            <h3
              className="mt-3 font-display font-black leading-[0.9] tracking-[-0.035em]"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            >
              Que no paren.
            </h3>
            <p className="mt-3 max-w-md text-sm text-zs-blue-950/75 sm:text-base">
              Calzado, ropa y equipación para niños y niñas. Tallas, marcas y
              precios que tu economía agradece.
            </p>
          </div>
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-zs-blue-950/25 bg-white/40 backdrop-blur transition-all duration-500 group-hover:bg-zs-blue-950 group-hover:text-white sm:flex">
            <ArrowUpRight className="h-5 w-5 transition-transform duration-500 group-hover:rotate-45" />
          </span>
        </div>
      </Link>
    </section>
  );
}
