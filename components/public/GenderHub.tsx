import Link from "next/link";
import { Shirt, Footprints, ArrowRight } from "lucide-react";

/**
 * GenderHub — bloque de 2 tarjetas grandes (TEXTIL / CALZADO) para los hubs de
 * género (/hombre, /mujer, /nino, /nina). Cada tarjeta es un <Link> clicable
 * entero que lleva a la ruta anidada `/${seccion}/${familia}` (Bloque 4 paso a).
 *
 * Es un Server Component a propósito: solo renderiza enlaces + decoración; el
 * borde cónico animado es 100% CSS (`.zs-animated-border` en globals.css), así
 * que no necesita estado ni "use client" (cero JS al cliente).
 *
 * Sustituye al antiguo bloque "Por tipo de prenda" (4 cards a slugs sueltos).
 * La integración en GenderLanding es el paso (c) — aquí solo se define.
 */

type Seccion = "hombre" | "mujer" | "nino" | "nina";

// Color de la tarjeta CALZADO: #FACC15 (token --color-zs-yellow-400, = Tailwind
// yellow-400). Elegido en el preview comparativo del paso b. Texto azul oscuro
// para contraste AA sobre el amarillo.
const CALZADO_INNER = "bg-zs-yellow-400 text-zs-blue-950";

const CARDS: Array<{
  familia: "textil" | "calzado";
  title: string;
  subtitle: string;
  Icon: typeof Shirt;
  /** Clases del fondo + color de texto de la tarjeta interior. */
  innerClass: string;
  /** Color del subtítulo. */
  subClass: string;
  /** Color del icono decorativo grande. */
  iconClass: string;
  /** Color de la fila "Ver …". */
  ctaClass: string;
}> = [
  {
    familia: "textil",
    title: "TEXTIL",
    subtitle: "Camisetas, sudaderas, chándales, pantalones y más.",
    Icon: Shirt,
    innerClass: "bg-zs-blue-700 text-white",
    subClass: "text-white/85",
    iconClass: "text-white/10",
    ctaClass: "text-white",
  },
  {
    familia: "calzado",
    title: "CALZADO",
    subtitle: "Zapatillas, botas, chanclas y calzado técnico.",
    Icon: Footprints,
    innerClass: CALZADO_INNER,
    subClass: "text-zs-blue-900/75",
    iconClass: "text-zs-blue-950/10",
    ctaClass: "text-zs-blue-950",
  },
];

export function GenderHub({
  seccion,
  className,
}: {
  seccion: Seccion;
  className?: string;
}) {
  return (
    <ul className={`grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 ${className ?? ""}`}>
      {CARDS.map((card) => {
        const { Icon } = card;
        return (
          <li key={card.familia}>
            <Link
              href={`/${seccion}/${card.familia}`}
              aria-label={`Ver ${card.title.toLowerCase()} de ${seccion}`}
              className="zs-animated-border group block shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`zs-animated-border__inner relative flex aspect-[4/5] flex-col justify-end overflow-hidden p-6 sm:p-8 ${card.innerClass}`}
              >
                {/* Icono decorativo grande, esquina superior derecha */}
                <Icon
                  aria-hidden
                  className={`absolute -right-4 -top-4 h-40 w-40 ${card.iconClass}`}
                  strokeWidth={1.25}
                />
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
      })}
    </ul>
  );
}
