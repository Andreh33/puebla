"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { MagneticButton } from "@/components/public/MagneticButton";

/**
 * GenderHero — hero foto-top compartido por /mujer, /hombre y /ninos.
 *
 * Mismo patrón visual que `HomeHero`:
 *  - Foto fullbleed con `object-cover`.
 *  - Overlay multi-capa (negro + gradiente zs-blue-950 + tinte color) para
 *    legibilidad AA.
 *  - Eyebrow + título display monumental + sub-copy + 2 CTAs.
 *
 * Encajado bajo la pill flotante del Header: el padding-top (`pt-44
 * sm:pt-48 lg:pt-52`) coincide con el del HomeHero. La página invoca este
 * componente DESPUÉS de un `<div className="-mt-[136px] sm:-mt-[148px]" />`
 * que anula el padding del `<main>` del layout público, igual que el home.
 *
 * El componente es 100% presentacional — no consume data del servidor. La
 * página padre puede pasarle un contador opcional (`productCount`) para
 * mostrar "N productos disponibles" bajo los CTAs.
 */

type GenderKey = "mujer" | "hombre" | "ninos" | "nino" | "nina";

type GenderHeroConfig = {
  eyebrow: string;
  headline: string;
  /** Sub-copy bajo el headline. */
  tagline: string;
  /** Imagen landscape fullbleed. */
  photo: string;
  /** Tinte de color por encima del overlay negro — refuerza el branding. */
  tintGradient: string;
  /** Color del shadow-glow del CTA primario. */
  primaryGlow: string;
};

const HERO_CONFIG: Record<GenderKey, GenderHeroConfig> = {
  mujer: {
    eyebrow: "Para ella",
    headline: "Su deporte, sin postureo.",
    tagline:
      "Calzado, mallas técnicas, camisetas y equipación de John Smith, +8000, Joma, Puma y más. Asesoramos la talla en tienda sin compromiso.",
    photo: "/category-photos/mujer-landing.jpg",
    tintGradient:
      "from-zs-red-900/55 via-zs-blue-950/35 to-zs-blue-950/70",
    primaryGlow: "var(--shadow-zs-rojo-glow-lg)",
  },
  hombre: {
    eyebrow: "Para él",
    headline: "Equipación para entrenar, competir y disfrutar.",
    tagline:
      "Running, pádel, montaña, fitness y casual con marcas como John Smith, +8000, Joma, Puma, Babolat, Joluvi, Ditchil y Shayber.",
    photo: "/category-photos/padel.jpg",
    tintGradient:
      "from-zs-blue-950/65 via-zs-blue-900/35 to-zs-blue-950/80",
    primaryGlow: "var(--shadow-zs-blue-glow-lg)",
  },
  ninos: {
    eyebrow: "Para los pequeños",
    headline: "Que crezcan moviéndose.",
    tagline:
      "Calzado, ropa deportiva y outdoor cómodos y resistentes para niños y niñas. Marcas que aguantan el ritmo: John Smith, +8000, Joma y más.",
    photo: "/category-photos/ninos-landing.jpg",
    tintGradient:
      "from-emerald-900/45 via-zs-blue-950/40 to-zs-blue-950/75",
    primaryGlow: "var(--shadow-zs-tennis-glow-lg)",
  },
  // Niño y Niña reutilizan la foto de /ninos (foto kids genérica) con copy y
  // tinte propios por género — Bloque 4. Cuando el cliente entregue fotos
  // específicas de niño/niña, basta cambiar `photo`.
  nino: {
    eyebrow: "Para ellos",
    headline: "Que no paren de jugar.",
    tagline:
      "Calzado y ropa deportiva resistente para niños: deporte, cole y outdoor. John Smith, +8000, Joma y más, con asesoramiento de talla en tienda.",
    photo: "/category-photos/ninos-landing.jpg",
    tintGradient: "from-zs-blue-950/65 via-zs-blue-900/35 to-zs-blue-950/80",
    primaryGlow: "var(--shadow-zs-blue-glow-lg)",
  },
  nina: {
    eyebrow: "Para ellas",
    headline: "Que vivan el deporte a su ritmo.",
    tagline:
      "Calzado y ropa deportiva cómoda para niñas: deporte, cole y outdoor. John Smith, +8000, Joma y más, con asesoramiento de talla en tienda.",
    photo: "/category-photos/nina-landing.jpg",
    tintGradient: "from-zs-red-900/55 via-zs-blue-950/35 to-zs-blue-950/70",
    primaryGlow: "var(--shadow-zs-rojo-glow-lg)",
  },
};

export function GenderHero({
  gender,
  productCount,
}: {
  gender: GenderKey;
  productCount?: number;
}) {
  const cfg = HERO_CONFIG[gender];
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(false);
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // El headline puede tener varias palabras — animamos cada una con stagger,
  // como el HomeHero. Pero más compacto: 1 sola línea visual de masking.
  const words = cfg.headline.split(" ");

  return (
    <section
      aria-label={`Zona Sport — ${gender}`}
      className="relative isolate overflow-hidden bg-zs-blue-950 text-white"
      style={{ minHeight: "min(80vh, 760px)" }}
    >
      {/* Foto landscape fullbleed. */}
      <div className="absolute inset-0 -z-20" aria-hidden>
        <Image
          src={cfg.photo}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Overlay multi-capa para legibilidad AA. */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        {/* 1. Negro sólido para fondo del texto. */}
        <div className="absolute inset-0 bg-black/50" />
        {/* 2. Tinte de color corporativo según género. */}
        <div className={`absolute inset-0 bg-gradient-to-br ${cfg.tintGradient}`} />
        {/* 3. Degradado vertical más oscuro abajo (suaviza la transición a la sección siguiente). */}
        <div className="absolute inset-0 bg-gradient-to-t from-zs-blue-950 via-zs-blue-950/30 to-transparent" />
        {/* 4. Grain sutil. */}
        <div className="absolute inset-0 mix-blend-overlay opacity-[0.07] zs-grain-hero" />
      </div>

      {/* Contenido. El pt-44+ garantiza que el texto quede DEBAJO de la pill
          flotante del header, igual que en el home. */}
      <div className="relative mx-auto flex h-full max-w-[1600px] flex-col px-4 pt-44 pb-16 sm:px-8 sm:pt-48 sm:pb-20 lg:pt-52 lg:pb-24">
        {/* Eyebrow */}
        <p
          className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/75"
          style={{
            opacity: mounted || reduced ? 1 : 0,
            transform:
              mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 8px, 0)",
            transition:
              "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <span className="inline-block h-px w-8 bg-white/40" />
          {cfg.eyebrow}
        </p>

        {/* Headline monumental con stagger por palabra. */}
        <h1
          className="mt-6 max-w-[18ch] font-display font-black leading-[0.92] tracking-[-0.035em] text-white sm:mt-8"
          style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}
        >
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="inline-block overflow-hidden align-bottom"
              style={{ marginRight: "0.22em" }}
            >
              <span
                className="inline-block will-change-transform"
                style={{
                  transitionDelay: reduced ? "0ms" : `${160 + i * 70}ms`,
                  transitionProperty: "transform, opacity",
                  transitionDuration: "900ms",
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  transform:
                    mounted || reduced
                      ? "translate3d(0, 0, 0)"
                      : "translate3d(0, 105%, 0)",
                  opacity: mounted || reduced ? 1 : 0,
                  color:
                    // Última palabra resaltada en rojo zs-red-500 (como el home).
                    i === words.length - 1 ? "var(--color-zs-red-500)" : undefined,
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </h1>

        {/* Sub-copy */}
        <p
          className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-white/85 sm:mt-8 sm:text-lg"
          style={{
            opacity: mounted || reduced ? 1 : 0,
            transform:
              mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
            transition:
              "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 700ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 700ms",
          }}
        >
          {cfg.tagline}
        </p>

        {/* CTAs */}
        <div
          className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10"
          style={{
            opacity: mounted || reduced ? 1 : 0,
            transform:
              mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
            transition:
              "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 880ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 880ms",
          }}
        >
          <MagneticButton strength={12}>
            <Link
              href="#productos"
              data-cursor="Comprar"
              className="group inline-flex h-14 items-center gap-3 rounded-full bg-zs-red-600 pl-7 pr-3 text-sm font-bold uppercase tracking-[0.06em] text-white transition-all hover:bg-zs-red-500"
              style={{ boxShadow: cfg.primaryGlow }}
            >
              Ver selección
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zs-red-600 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </Link>
          </MagneticButton>
          <MagneticButton strength={8}>
            <Link
              href="#categorias"
              data-cursor="Explorar"
              className="inline-flex h-14 items-center gap-2.5 rounded-full border border-white/30 bg-white/[0.06] px-7 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-white/60 hover:bg-white/[0.12]"
            >
              Ver categorías
            </Link>
          </MagneticButton>
        </div>

        {/* Contador opcional. */}
        {productCount !== undefined && productCount > 0 && (
          <p
            className="mt-8 text-[11px] font-medium uppercase tracking-[0.28em] text-white/55"
            style={{
              opacity: mounted || reduced ? 1 : 0,
              transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 1100ms",
            }}
          >
            {productCount} {productCount === 1 ? "producto" : "productos"} disponibles
          </p>
        )}
      </div>

      <style>{`
        .zs-grain-hero {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 200px 200px;
        }
      `}</style>
    </section>
  );
}
