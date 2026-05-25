"use client";

import Link from "next/link";
import { ArrowRight, Flame, Package, Sparkle } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";

/**
 * PromoStrip — franja de 3 tiles promocionales dramáticos.
 *
 *   [🔥 OFERTAS]    [✨ RECIÉN LLEGADO]    [📦 RECOGE EN TIENDA]
 *
 * Cada tile:
 *   - Gradiente fuerte (rojo / azul corporativo / verde tenis).
 *   - Icono lucide grande.
 *   - Titular monumental + sub-caption.
 *   - CTA "Ver →" inline al final.
 *   - Hover: el icono escala y rota sutil, la flecha desliza.
 *
 * Tipografía MUY grande, mucho contraste — estilo banner promocional moderno
 * sin caer en la estética de mercadillo.
 */

type Tile = {
  href: string;
  eyebrow: string;
  title: string;
  caption: string;
  cta: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Clases de Tailwind para el gradiente del fondo. */
  gradient: string;
  /** Color del eyebrow + texto secundario. */
  accent: string;
};

const TILES: Tile[] = [
  {
    href: "/hombre/calzado?tipo=running&oferta=1",
    eyebrow: "Solo esta semana",
    title: "Ofertas de la semana",
    caption: "Asfalto, trail y zapatilla diaria. Termina el domingo.",
    cta: "Ver ofertas",
    Icon: Flame,
    gradient: "from-zs-red-600 via-zs-red-600 to-[#7a1e1e]",
    accent: "text-white/80",
  },
  {
    href: "/hombre/calzado?tipo=running&nuevo=1",
    eyebrow: "Temporada FW25",
    title: "Recién llegado",
    caption: "Las novedades de John Smith, +8000 y técnico que aún huele a fábrica.",
    cta: "Ver lo nuevo",
    Icon: Sparkle,
    gradient: "from-zs-blue-700 via-zs-blue-950 to-[#08102d]",
    accent: "text-white/75",
  },
  {
    href: "/contacto",
    eyebrow: "Sin esperas",
    title: "Recoge en tienda",
    caption: "Reserva por WhatsApp y pruébatelo aquí mismo. 0 € de envío en Extremadura.",
    cta: "Cómo reservar",
    Icon: Package,
    gradient: "from-zs-tennis-400 via-zs-tennis-300 to-[#7c8d22]",
    accent: "text-zs-blue-950/75",
  },
];

export function PromoStrip() {
  return (
    <section className="relative bg-white pb-20 pt-4 sm:pb-28">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {TILES.map((t, i) => {
            const Icon = t.Icon;
            const dark = i !== 2;
            return (
              <Reveal key={t.title} variant="fade-up" delay={Math.min(i * 100, 220)}>
                <Link
                  href={t.href}
                  data-cursor={t.cta}
                  className={[
                    "group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br",
                    t.gradient,
                    "p-6 transition-transform duration-500 hover:-translate-y-1 sm:p-8 lg:p-10",
                    dark ? "text-white" : "text-zs-blue-950",
                  ].join(" ")}
                >
                  {/* Patrón ambiente sutil */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-12 -top-12 h-72 w-72 rounded-full bg-white/15 blur-3xl"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-black/15 blur-3xl"
                  />

                  <div className="relative flex items-start justify-between">
                    <span
                      className={[
                        "inline-flex h-14 w-14 items-center justify-center rounded-2xl backdrop-blur transition-transform duration-500 group-hover:scale-110 sm:h-16 sm:w-16",
                        dark ? "bg-white/15" : "bg-zs-blue-950/10",
                      ].join(" ")}
                    >
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.25} />
                    </span>
                    <p
                      className={[
                        "text-[10px] font-bold uppercase tracking-[0.32em]",
                        t.accent,
                      ].join(" ")}
                    >
                      {t.eyebrow}
                    </p>
                  </div>

                  <div className="relative">
                    <h3
                      className="max-w-[14ch] font-display font-black leading-[0.92] tracking-[-0.035em]"
                      style={{ fontSize: "clamp(1.65rem, 3vw, 2.6rem)" }}
                    >
                      {t.title}
                    </h3>
                    <p
                      className={[
                        "mt-3 max-w-[28ch] text-sm leading-relaxed",
                        t.accent,
                      ].join(" ")}
                    >
                      {t.caption}
                    </p>
                    <span
                      className={[
                        "mt-5 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em]",
                        dark ? "text-white" : "text-zs-blue-950",
                      ].join(" ")}
                    >
                      {t.cta}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1.5"
                        strokeWidth={2.5}
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
