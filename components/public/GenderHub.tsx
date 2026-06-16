"use client";

import Link from "next/link";
import Image from "next/image";
import { Shirt, Footprints, ArrowRight } from "lucide-react";
import { useRef, type CSSProperties, type MouseEvent } from "react";

/**
 * GenderHub — 2 tarjetas grandes (TEXTIL / CALZADO) de los hubs de género
 * (/hombre, /mujer, /nino, /nina). Cada tarjeta es un <Link> entero a
 * `/${seccion}/${familia}`.
 *
 * Bloque 7.6: tilt 3D que sigue al cursor + brillo especular + glow de color +
 * sheen + flotación idle + borde cónico animado.
 * Bloque 7.7 (feedback): foto de fondo — TEXTIL usa la foto del género
 * (`{seccion}-landing.jpg`, ropa deportiva en acción), CALZADO usa
 * `calzado.jpg`. Se mantienen los iconos (camiseta / zapatos) en blanco encima,
 * con velo azul para legibilidad del texto.
 */

type Seccion = "hombre" | "mujer" | "nino" | "nina" | "bebe";

/** Foto de ropa por género (no hay una genérica; el componente es compartido). */
const LANDING_BY_SECCION: Record<Seccion, string> = {
  hombre: "textil-hombre", // Foto textil propia (cliente, carpetaimagenes)
  mujer: "mujer-landing",
  nino: "ninos-landing",
  nina: "textil-nina", // Foto textil propia de niña (cliente, carpetaimagenes)
  bebe: "ninos-landing", // Reutiliza foto kids hasta que haya foto específica de bebé
};

// Foto de calzado propia por género (cliente, carpetaimagenes). Sustituye a las
// zapatillas sueltas del catálogo por fotos editoriales de calzado.
const CALZADO_BY_SECCION: Record<Seccion, string> = {
  mujer: "/category-photos/calzado-mujer.jpg",
  hombre: "/category-photos/calzado-hombre.jpg",
  nino: "/category-photos/calzado-nino.jpg",
  nina: "/category-photos/calzado-nina.jpg",
  bebe: "/category-photos/calzado-nino.jpg", // Reutiliza foto calzado niño hasta que haya una de bebé
};

const CARDS: Array<{
  familia: "textil" | "calzado";
  title: string;
  subtitle: string;
  Icon: typeof Shirt;
  /** Color de la fila "Ver …" (acento de marca). */
  ctaClass: string;
  /** Color del glow (box-shadow) en hover. */
  glow: string;
}> = [
  {
    familia: "textil",
    title: "TEXTIL",
    subtitle: "Camisetas, sudaderas, chándales, pantalones y más.",
    Icon: Shirt,
    ctaClass: "text-white",
    glow: "rgba(37, 99, 235, 0.5)",
  },
  {
    familia: "calzado",
    title: "CALZADO",
    subtitle: "Zapatillas, botas, chanclas y calzado técnico.",
    Icon: Footprints,
    ctaClass: "text-zs-yellow-400",
    glow: "rgba(250, 204, 21, 0.6)",
  },
];

function photoFor(familia: "textil" | "calzado", seccion: Seccion): string {
  return familia === "calzado"
    ? CALZADO_BY_SECCION[seccion]
    : `/category-photos/${LANDING_BY_SECCION[seccion]}.jpg`;
}

function HubCard({
  card,
  seccion,
  delayMs,
}: {
  card: (typeof CARDS)[number];
  seccion: Seccion;
  delayMs: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { Icon } = card;

  function handleMove(e: MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1
    el.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 12}deg`);
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <li className="zs-hub-float" style={{ animationDelay: `${delayMs}ms` }}>
      <Link
        ref={ref}
        href={`/${seccion}/${card.familia}`}
        aria-label={`Ver ${card.title.toLowerCase()} de ${seccion}`}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{ "--glow": card.glow } as CSSProperties}
        className="zs-animated-border zs-hub-card group block shadow-sm"
      >
        <div className="zs-animated-border__inner zs-hub-card__inner relative flex aspect-[4/5] flex-col justify-end overflow-hidden bg-zs-blue-900 p-6 sm:p-8">
          {/* Foto de fondo (ropa del género / calzado) */}
          <Image
            src={photoFor(card.familia, seccion)}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {/* Velo azul para legibilidad del texto e identidad de marca */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-zs-blue-950/92 via-zs-blue-950/45 to-zs-blue-950/10"
          />
          {/* Icono decorativo grande (se mantiene), ahora en blanco sobre la foto */}
          <Icon
            aria-hidden
            className="absolute -right-4 -top-4 h-40 w-40 text-white/30 drop-shadow-lg transition-transform duration-700 ease-out group-hover:-rotate-6 group-hover:scale-110"
            strokeWidth={1.25}
          />
          {/* Sheen diagonal fijo */}
          <span aria-hidden className="zs-hub-card__sheen" />
          {/* Brillo especular que sigue al cursor */}
          <span aria-hidden className="zs-hub-card__glare" />

          <div className="relative">
            <h3 className="font-display text-4xl font-black tracking-tight text-white drop-shadow sm:text-5xl">
              {card.title}
            </h3>
            <p className="mt-2 max-w-[22ch] text-sm text-white/85 sm:text-base">
              {card.subtitle}
            </p>
            <span
              className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${card.ctaClass}`}
            >
              Ver {card.title.toLowerCase()}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function GenderHub({
  seccion,
  className,
}: {
  seccion: Seccion;
  className?: string;
}) {
  return (
    <ul className={`grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 ${className ?? ""}`}>
      {CARDS.map((card, i) => (
        <HubCard key={card.familia} card={card} seccion={seccion} delayMs={i * 1300} />
      ))}
    </ul>
  );
}
