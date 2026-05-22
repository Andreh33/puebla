"use client";

import Link from "next/link";
import { Shirt, Footprints, ArrowRight } from "lucide-react";
import { useRef, type CSSProperties, type MouseEvent } from "react";

/**
 * GenderHub — 2 tarjetas grandes (TEXTIL / CALZADO) de los hubs de género
 * (/hombre, /mujer, /nino, /nina). Cada tarjeta es un <Link> entero que lleva a
 * `/${seccion}/${familia}`.
 *
 * Bloque 7.6 (feedback "muy cutres"): tilt 3D que sigue al cursor (perspective
 * + rotateX/Y vía variables CSS que fija onMouseMove), brillo especular que
 * sigue al ratón, glow de color en hover, sheen diagonal fijo y flotación
 * idle. Mantiene el borde cónico animado (`.zs-animated-border`). Es client
 * por la interacción del ratón (los hubs son 4 páginas, coste de JS mínimo).
 */

type Seccion = "hombre" | "mujer" | "nino" | "nina";

const CARDS: Array<{
  familia: "textil" | "calzado";
  title: string;
  subtitle: string;
  Icon: typeof Shirt;
  innerClass: string;
  subClass: string;
  iconClass: string;
  ctaClass: string;
  /** Color del glow (box-shadow) en hover. */
  glow: string;
}> = [
  {
    familia: "textil",
    title: "TEXTIL",
    subtitle: "Camisetas, sudaderas, chándales, pantalones y más.",
    Icon: Shirt,
    innerClass: "bg-zs-blue-700 text-white",
    subClass: "text-white/85",
    iconClass: "text-white/25",
    ctaClass: "text-white",
    glow: "rgba(37, 99, 235, 0.5)",
  },
  {
    familia: "calzado",
    title: "CALZADO",
    subtitle: "Zapatillas, botas, chanclas y calzado técnico.",
    Icon: Footprints,
    innerClass: "bg-zs-yellow-400 text-zs-blue-950",
    subClass: "text-zs-blue-900/75",
    iconClass: "text-zs-blue-950/25",
    ctaClass: "text-zs-blue-950",
    glow: "rgba(250, 204, 21, 0.6)",
  },
];

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
        <div
          className={`zs-animated-border__inner zs-hub-card__inner relative flex aspect-[4/5] flex-col justify-end overflow-hidden p-6 sm:p-8 ${card.innerClass}`}
        >
          {/* Icono decorativo grande, esquina superior derecha */}
          <Icon
            aria-hidden
            className={`absolute -right-4 -top-4 h-40 w-40 transition-transform duration-700 ease-out group-hover:-rotate-6 group-hover:scale-110 ${card.iconClass}`}
            strokeWidth={1.25}
          />
          {/* Sheen diagonal fijo (gloss premium) */}
          <span aria-hidden className="zs-hub-card__sheen" />
          {/* Brillo especular que sigue al cursor */}
          <span aria-hidden className="zs-hub-card__glare" />

          <div className="relative">
            <h3 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
              {card.title}
            </h3>
            <p className={`mt-2 max-w-[22ch] text-sm sm:text-base ${card.subClass}`}>
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
