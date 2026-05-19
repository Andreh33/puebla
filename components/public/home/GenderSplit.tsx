"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * GenderSplit — split 50/50 que crece a 60/40 según el hover.
 *
 * Tipografía dramática, imagen bleed, overlay sutil con peso. En móvil dos
 * bloques apilados (sin hover-grow para no romper layout).
 *
 * Las URLs apuntan a /buscar?genero=… ya que el cliente aún no tiene rutas
 * /mujer /hombre dedicadas. El handler de búsqueda existente filtrará el
 * subset correcto sin romper.
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
    word: "Para ella.",
    caption: "Running, fitness, urban — selección 2026",
    href: "/buscar?genero=mujer",
    image: "/sample-products/malla-john-smith-anuket-24i-negro.webp",
    accent: "from-zs-red-600/20 via-transparent",
  },
  {
    label: "Él",
    word: "Para él.",
    caption: "Trail, asfalto, calle — selección 2026",
    href: "/buscar?genero=hombre",
    image: "/sample-products/anorack-treking-8000-dinamic-24i-avellana.webp",
    accent: "from-zs-blue-700/30 via-transparent",
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
                  grow ? "scale-[1.06]" : "scale-100",
                ].join(" ")}
              />
              {/* Velo gradiente */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-tr from-zs-blue-950/85 via-zs-blue-950/40 to-transparent"
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-white/70">
                    03 · {s.label}
                  </p>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] backdrop-blur transition-all duration-500 group-hover:bg-white group-hover:text-zs-blue-950">
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
                    style={{ fontSize: "clamp(3.5rem, 9vw, 9rem)" }}
                  >
                    {s.word}
                  </h3>
                  <p className="mt-6 max-w-md text-base text-white/75">
                    {s.caption}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
