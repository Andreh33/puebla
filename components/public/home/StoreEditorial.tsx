import {
  t as _translateUi,
  translateValue as _translateValue,
  translateTemplate as _translateTemplate,
} from "@/lib/i18n/dictionaries";
import Image from "next/image";
import { Activity, ArrowUpRight, MapPin, MessageCircle, Star } from "lucide-react";
import { Reveal } from "@/components/public/Reveal";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import { GOOGLE_REVIEW_AUTHORS, REVIEW_COPY, type ReviewLocale } from "@/data/google-reviews";

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
export function StoreEditorial({ locale = "es" }: { locale?: ReviewLocale }) {
  return (
    <section className="bg-zs-surface relative py-24 sm:py-32 lg:py-40">
      <header className="mx-auto mb-14 max-w-[1600px] px-4 sm:mb-20 sm:px-8">
        <Reveal variant="fade-up">
          <p className="text-zs-muted inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] uppercase">
            <span className="bg-zs-blue-900/30 inline-block h-px w-8" />
            {_translateUi("La tienda")}
          </p>
        </Reveal>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-12 px-4 sm:px-8 lg:grid-cols-12 lg:gap-16">
        {/* Foto real de la fachada de Zona Sport */}
        <Reveal className="lg:col-span-7" variant="fade-up">
          <div className="from-zs-blue-950 via-zs-blue-900 relative aspect-[4/5] w-full overflow-hidden rounded-3xl bg-gradient-to-br to-[#08102d]">
            <Image
              src="/category-photos/tienda-real.jpg"
              alt={_translateUi(
                "Fachada de la tienda Zona Sport en Puebla de la Calzada — rótulo y escaparates",
              )}
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
            <div className="bg-zs-blue-950/85 absolute top-6 left-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-semibold tracking-[0.28em] text-white uppercase backdrop-blur">
              <MapPin className="h-3 w-3" />
              {_translateUi("C. Silos, 3 · 06490")}
            </div>
            {/* Coordenadas */}
            <div className="absolute right-6 bottom-6 text-right font-mono text-[10px] tracking-[0.18em] text-white/85 uppercase">
              {_translateUi("38.8939° N")}
              <br />
              {_translateUi("6.6259° W")}
            </div>

            {/* Testimonial flotante */}
            <div className="absolute inset-x-6 bottom-6 max-w-md rounded-2xl border border-white/15 bg-white/95 p-5 shadow-xl backdrop-blur sm:right-auto sm:left-6">
              <div className="text-zs-tennis-400 flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="text-zs-tennis-400 h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="text-zs-blue-950 mt-2 text-sm leading-relaxed">
                <span className="font-semibold">
                  {"“"}
                  {_translateValue(REVIEW_COPY[locale].quotes[0])}
                  {"”"}
                </span>
              </p>
              <p className="text-zs-muted mt-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                {_translateUi("—")} {_translateValue(GOOGLE_REVIEW_AUTHORS[0].name)}{" "}
                {_translateUi("· Google")}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Copy + stats + CTAs */}
        <div className="space-y-10 lg:col-span-5 lg:pt-6">
          <Reveal variant="fade-up" delay={100}>
            <h2
              className="font-display text-zs-blue-950 leading-[0.92] font-bold tracking-[-0.035em]"
              style={{ fontSize: "clamp(2.25rem, 5.5vw, 4.5rem)" }}
            >
              {_translateUi("Puebla de la Calzada.")}
              <br />
              <span className="text-zs-muted/70">{_translateUi("A diez minutos de ti.")}</span>
            </h2>
          </Reveal>
          <Reveal variant="fade-up" delay={180}>
            <p className="text-zs-muted max-w-md text-base leading-relaxed">
              {_translateUi(
                "Estamos en pleno centro, frente al ayuntamiento. Ven a probarte la zapatilla, a pesar la mochila, a ver el color real bajo luz de verdad. Sin prisa y sin presión.",
              )}
            </p>
          </Reveal>

          <Reveal variant="fade-up" delay={240}>
            <dl className="border-zs-blue-900/10 grid grid-cols-3 gap-6 border-y py-8">
              {[
                { k: "5 min", v: "Montijo" },
                { k: "15 min", v: "Mérida" },
                { k: "30 min", v: "Badajoz" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-zs-blue-950 text-3xl leading-none font-bold tracking-tight sm:text-4xl">
                    {_translateValue(s.k)}
                  </dt>
                  <dd className="text-zs-muted mt-2 text-[11px] font-semibold tracking-[0.22em] uppercase">
                    {_translateValue(s.v)}
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
                className="group bg-zs-blue-950 hover:bg-zs-blue-900 inline-flex h-14 items-center gap-2.5 rounded-full px-7 text-sm font-semibold text-white transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {_translateUi("Reservar por WhatsApp")}
              </a>
              <a
                href="https://maps.google.com/?q=C.+Silos,+3,+06490+Puebla+de+la+Calzada,+Badajoz"
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Maps"
                className="group border-zs-blue-950/15 text-zs-blue-950 hover:bg-zs-blue-950 inline-flex h-14 items-center gap-3 rounded-full border pr-3 pl-7 text-sm font-semibold transition-colors hover:text-white"
              >
                {_translateUi("Abrir en Maps")}
                <span className="bg-zs-blue-950 group-hover:text-zs-blue-950 flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform group-hover:rotate-45 group-hover:bg-white">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </Reveal>

          <Reveal variant="fade-up" delay={360}>
            <p className="text-zs-muted/80 text-xs tracking-[0.22em] uppercase">
              {_translateUi("L–V 10:00 – 14:00 · 17:30 – 20:30 — S 10:00 – 14:00")}
            </p>
          </Reveal>

          {/* Servicio en tienda: encordado de raquetas. Bloque integrado en
              "La tienda" con su propio CTA de WhatsApp. */}
          <Reveal variant="fade-up" delay={420}>
            <div className="border-zs-blue-900/10 flex items-start gap-4 rounded-2xl border bg-white p-5 shadow-sm">
              <span className="bg-zs-tennis-300/40 text-zs-blue-950 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <Activity className="h-6 w-6" strokeWidth={2} />
              </span>
              <div className="space-y-2">
                <p className="font-display text-zs-blue-950 text-lg leading-tight font-bold">
                  {_translateUi("Encordado de raquetas en tienda")}
                </p>
                <p className="text-zs-muted text-sm leading-relaxed">
                  {_translateUi(
                    "Encordamos tu raqueta de tenis aquí mismo, en Puebla de la Calzada (Badajoz). Pásate o escríbenos por WhatsApp y te decimos plazo y precio.",
                  )}
                </p>
                <a
                  href={whatsappUrl(WhatsAppMessages.generic())}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="WhatsApp"
                  className="text-zs-blue-900 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  {_translateUi("Consultar encordado")}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
