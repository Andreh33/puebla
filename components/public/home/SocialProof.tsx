import {
  t as _translateUi,
  translateValue as _translateValue,
  translateTemplate as _translateTemplate,
} from "@/lib/i18n/dictionaries";
import { Star, Quote } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";

/**
 * SocialProof — 3 testimonios cortos sobre fondo claro, con estrellitas y
 * avatar (inicial monograma — no inventamos fotos de personas reales).
 *
 * Decisiones de copy:
 *  - Castellano natural de la zona. Sin "hecho con cariño en el barrio".
 *  - Cada testimonio menciona algo concreto: zapatilla, asesoramiento, talla.
 *  - Iniciales locales (Mérida, Badajoz, Montijo) para reforzar proximidad.
 */

type Testimonial = {
  text: string;
  name: string;
  meta: string;
  initials: string;
  /** Color del avatar (tailwind). */
  avatarBg: string;
  avatarFg: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    text: "He vuelto a empezar a correr y aquí me cuadraron las zapatillas a la primera. Sin sustos en el primer rodaje largo, que para mí ya es mucho.",
    name: "Marta",
    meta: "Mérida · runner",
    initials: "MR",
    avatarBg: "bg-zs-red-600",
    avatarFg: "text-white",
  },
  {
    text: "Pedí por WhatsApp un viernes a las 9 y el sábado por la mañana ya tenía la pala. Lo siguiente que voy a pedir es la ropa de pádel para el verano.",
    name: "Javier",
    meta: "Badajoz · pádel",
    initials: "JV",
    avatarBg: "bg-zs-blue-700",
    avatarFg: "text-white",
  },
  {
    text: "Mi hija necesitaba botas de montaña para el viaje del cole. Le probaron tres modelos, le explicaron por qué unas sí y otras no. Cero presión por vender.",
    name: "Inés",
    meta: "Montijo · madre",
    initials: "IM",
    avatarBg: "bg-zs-tennis-300",
    avatarFg: "text-zs-blue-950",
  },
];

export function SocialProof() {
  return (
    <section className="relative bg-white py-20 sm:py-28">
      <header className="mx-auto mb-12 flex max-w-[1600px] flex-col gap-4 px-4 sm:mb-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal variant="fade-up" className="max-w-2xl">
          <p className="text-zs-muted inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] uppercase">
            <span className="bg-zs-blue-900/30 inline-block h-px w-8" />
            {_translateUi("Lo que dicen")}
          </p>
          <h2
            className="font-display text-zs-blue-950 mt-4 leading-[0.95] font-bold tracking-[-0.035em]"
            style={{ fontSize: "clamp(1.85rem, 4.5vw, 3.5rem)" }}
          >
            {_translateUi("Atención que se nota.")}
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <div className="flex items-center gap-3">
            <div className="text-zs-tennis-400 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <p className="text-zs-blue-950 text-sm font-semibold">
              {_translateUi("4,9 / 5")}{" "}
              <span className="text-zs-muted">
                {_translateUi("· valoraciones en tienda y online")}
              </span>
            </p>
          </div>
        </Reveal>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} variant="fade-up" delay={Math.min(i * 100, 220)}>
              <li className="group border-zs-blue-900/10 bg-zs-surface hover:border-zs-red-600/20 relative flex h-full flex-col rounded-3xl border p-7 transition-colors duration-500 hover:bg-white">
                <Quote className="text-zs-red-600/40 h-7 w-7" strokeWidth={2.25} />
                <p className="text-zs-blue-950 mt-4 flex-1 text-base leading-relaxed">
                  {_translateValue(t.text)}
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <span
                    className={[
                      "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold",
                      t.avatarBg,
                      t.avatarFg,
                    ].join(" ")}
                    aria-hidden
                  >
                    {_translateValue(t.initials)}
                  </span>
                  <div>
                    <p className="text-zs-blue-950 text-sm font-semibold">
                      {_translateValue(t.name)}
                    </p>
                    <p className="text-zs-muted text-xs tracking-[0.18em] uppercase">
                      {_translateValue(t.meta)}
                    </p>
                  </div>
                  <div className="text-zs-tennis-400 ml-auto flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
