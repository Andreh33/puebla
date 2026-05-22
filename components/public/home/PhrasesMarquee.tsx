/**
 * PhrasesMarquee — marquesina infinita horizontal con frases alternadas con
 * bullets en lugar de logos. Reemplaza la antigua tira de logos del home.
 *
 * - CSS pure animation (keyframes translate-x linear infinite).
 * - Contenido duplicado para que el loop sea aparente y sin saltos.
 * - Pausa en hover para que el usuario pueda leer.
 * - Respeta `prefers-reduced-motion`.
 *
 * Server component, sin estado.
 */

type Props = {
  /** Frases a mostrar. Si no se pasan, usa las defaults del cliente. */
  phrases?: string[];
  /** Velocidad del scroll: cuanto MAYOR, más lento. */
  durationSeconds?: number;
};

const DEFAULT_PHRASES = [
  "Desde Puebla de la Calzada hasta cualquier parte del mundo",
  "Años de calidad y trato cercano",
  "John Smith · +8000 · Joma · Bullpadel · Nox · Salomon · Head · Wilson",
  "Atendemos por WhatsApp · Recogida en tienda",
  "Pádel, running, montaña, fitness — todo en una sola tienda",
  "Asesoramiento real, no postureo",
];

export function PhrasesMarquee({
  phrases = DEFAULT_PHRASES,
  durationSeconds = 60,
}: Props) {
  // Duplicamos el contenido dos veces para que el bucle al -50% sea continuo.
  const loop = [...phrases, ...phrases];

  return (
    <section
      aria-label="Eslóganes de Zona Sport"
      className="relative overflow-hidden border-y border-zs-blue-950/10 bg-zs-blue-950 py-6 text-white sm:py-7"
    >
      {/* Halo de color en los bordes para sensación premium */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-zs-blue-950 to-transparent z-10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-zs-blue-950 to-transparent z-10"
      />

      <div className="zs-phrases-track flex w-max items-center gap-10 whitespace-nowrap">
        {loop.map((phrase, i) => (
          <span
            key={`${i}-${phrase}`}
            className="inline-flex items-center gap-10 font-display text-2xl font-semibold tracking-[-0.015em] sm:text-[1.85rem]"
          >
            <span>{phrase}</span>
            <span
              aria-hidden
              className="inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-zs-red-500"
            />
          </span>
        ))}
      </div>

      <style>{`
        @keyframes zs-phrases-scroll {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .zs-phrases-track {
          animation: zs-phrases-scroll ${durationSeconds}s linear infinite;
          will-change: transform;
        }
        section:hover .zs-phrases-track {
          animation-play-state: paused;
        }
              `}</style>
    </section>
  );
}
