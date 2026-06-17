import Image from "next/image";
import { Activity, ArrowUpRight, MapPin, MessageCircle, Star } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";

/**
 * StoreEditorial — bloque "La tienda".
 *
 * Cambios respecto a versión previa:
 *  - Usa la foto REAL de la fachada de la tienda `/category-photos/tienda-real.jpg`
 *    (rótulo "ZONA SPORT", escaparates) en lugar del genérico de Unsplash.
 *  - Si la imagen no carga, el fondo gradient debajo sigue funcionando como
 *    fallback visual.
 *  - Añade un testimonial visual con estrellas y texto natural.
 *
 * Mantiene los 3 stats de proximidad y los CTAs (WhatsApp + Maps).
 */
export function StoreEditorial() {
  return (
    <section className="relative bg-zs-surface py-24 sm:py-32 lg:py-40">
      <header className="mx-auto mb-14 max-w-[1600px] px-4 sm:mb-20 sm:px-8">
        <Reveal variant="fade-up">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-zs-muted">
            <span className="inline-block h-px w-8 bg-zs-blue-900/30" />
            La tienda
          </p>
        </Reveal>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 sm:px-8 lg:grid-cols-12 lg:gap-16">
        {/* Foto fachada — Unsplash, sin marcas */}
        <Reveal className="lg:col-span-7" variant="fade-up">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-zs-blue-950 via-zs-blue-900 to-[#08102d]">
            <Image
              src="/category-photos/tienda-real.jpg"
              alt="Fachada de la tienda Zona Sport en Puebla de la Calzada — rótulo y escaparates"
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover object-center"
            />
            {/* Velo inferior degradado para legibilidad de la etiqueta */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-transparent"
            />
            {/* Etiqueta dirección */}
            <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-zs-blue-950/85 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur">
              <MapPin className="h-3 w-3" />
              C. Silos, 3 · 06490
            </div>
            {/* Coordenadas */}
            <div className="absolute bottom-6 right-6 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-white/85">
              38.8821° N<br />
              6.6164° W
            </div>

            {/* Testimonial flotante */}
            <div className="absolute inset-x-6 bottom-6 max-w-md rounded-2xl border border-white/15 bg-white/95 p-5 shadow-xl backdrop-blur sm:left-6 sm:right-auto">
              <div className="flex items-center gap-1.5 text-zs-tennis-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current text-zs-tennis-400" />
                ))}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zs-blue-950">
                <span className="font-semibold">
                  &ldquo;Llevo años comprando aquí.
                </span>{" "}
                Te asesoran de verdad, no te venden la moto. Salí con la
                zapatilla que necesitaba y sin pagar de más.&rdquo;
              </p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zs-muted">
                — Cliente del barrio
              </p>
            </div>
          </div>
        </Reveal>

        {/* Copy + stats + CTAs */}
        <div className="space-y-10 lg:col-span-5 lg:pt-6">
          <Reveal variant="fade-up" delay={100}>
            <h2
              className="font-display font-bold leading-[0.92] tracking-[-0.035em] text-zs-blue-950"
              style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.5rem)" }}
            >
              Puebla de la Calzada.<br />
              <span className="text-zs-muted/70">A diez minutos de ti.</span>
            </h2>
          </Reveal>
          <Reveal variant="fade-up" delay={180}>
            <p className="max-w-md text-base leading-relaxed text-zs-muted">
              Estamos en pleno centro, frente al ayuntamiento. Ven a probarte
              la zapatilla, a pesar la mochila, a ver el color real bajo luz
              de verdad. Sin prisa y sin presión.
            </p>
          </Reveal>

          <Reveal variant="fade-up" delay={240}>
            <dl className="grid grid-cols-3 gap-6 border-y border-zs-blue-900/10 py-8">
              {[
                { k: "5 min", v: "Montijo" },
                { k: "15 min", v: "Mérida" },
                { k: "30 min", v: "Badajoz" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-3xl font-bold leading-none tracking-tight text-zs-blue-950 sm:text-4xl">
                    {s.k}
                  </dt>
                  <dd className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-zs-muted">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal variant="fade-up" delay={300}>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={whatsappUrl(WhatsAppMessages.generic())}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="WhatsApp"
                className="group inline-flex h-14 items-center gap-2.5 rounded-full bg-zs-blue-950 px-7 text-sm font-semibold text-white transition-colors hover:bg-zs-blue-900"
              >
                <MessageCircle className="h-4 w-4" />
                Reservar por WhatsApp
              </a>
              <a
                href="https://maps.google.com/?q=C.+Silos,+3,+06490+Puebla+de+la+Calzada,+Badajoz"
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Maps"
                className="group inline-flex h-14 items-center gap-3 rounded-full border border-zs-blue-950/15 pl-7 pr-3 text-sm font-semibold text-zs-blue-950 transition-colors hover:bg-zs-blue-950 hover:text-white"
              >
                Abrir en Maps
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zs-blue-950 text-white transition-transform group-hover:rotate-45 group-hover:bg-white group-hover:text-zs-blue-950">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={360}>
            <p className="text-xs uppercase tracking-[0.22em] text-zs-muted/80">
              L–V 10:00 – 14:00 · 17:30 – 20:30 — S 10:00 – 14:00
            </p>
          </Reveal>

          {/* Servicio en tienda: encordado de raquetas. Bloque integrado en
              "La tienda" con su propio CTA de WhatsApp. */}
          <Reveal variant="fade-up" delay={420}>
            <div className="flex items-start gap-4 rounded-2xl border border-zs-blue-900/10 bg-white p-5 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zs-tennis-300/40 text-zs-blue-950">
                <Activity className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="space-y-2">
                <p className="font-display text-lg font-bold leading-tight text-zs-blue-950">
                  Encordado de raquetas en tienda
                </p>
                <p className="text-sm leading-relaxed text-zs-muted">
                  Encordamos tu raqueta de pádel o tenis aquí mismo, en Puebla de
                  la Calzada (Badajoz). Pásate o escríbenos por WhatsApp y te
                  decimos plazo y precio.
                </p>
                <a
                  href={whatsappUrl(WhatsAppMessages.generic())}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="WhatsApp"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-zs-blue-900 underline-offset-4 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar encordado
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
