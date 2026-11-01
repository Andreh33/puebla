import {
  t as _translateUi,
  translateValue as _translateValue,
  translateTemplate as _translateTemplate,
} from "@/lib/i18n/dictionaries";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { MapPin, Phone, Mail, Clock, MessageCircle, ArrowUpRight, Star } from "lucide-react";
import { OpenNowBadge } from "@/components/public/OpenNowBadge";
import { STORE_NAP } from "@/lib/seo/schema-org";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import { Reveal } from "@/components/public/Reveal";

/**
 * StoreMap — bloque que reemplaza el SocialProof previo. Combina un embed
 * de Google Maps (sin API key, vía iframe `q=` con la dirección textual) con
 * el NAP completo, horarios, WhatsApp y CTA "Cómo llegar".
 *
 * Layout responsive: desktop mapa 60% / info 40%; móvil apilados.
 *
 * Server component — el `OpenNowBadge` interno es client.
 *
 * Decisión técnica: usamos `https://www.google.com/maps?q=<query>&output=embed`
 * que no requiere clave de API ni billing. La precisión es alta porque la
 * dirección es única en Puebla de la Calzada. Las coords (38.881, -6.622)
 * vienen de `STORE_NAP` por si en algún momento queremos un mapa estático.
 */
export function StoreMap() {
  const mapsQuery = encodeURIComponent(
    `${STORE_NAP.streetAddress}, ${STORE_NAP.postalCode} ${STORE_NAP.addressLocality}, ${STORE_NAP.addressRegion}, ${STORE_NAP.addressCountry}`,
  );
  const embedSrc = `https://www.google.com/maps?q=${mapsQuery}&hl=es&output=embed&z=16`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  return (
    <section
      aria-label={_translateUi("Cómo encontrarnos")}
      className="relative bg-white py-20 sm:py-28"
    >
      <header className="mx-auto mb-12 flex max-w-[1600px] flex-col gap-4 px-4 sm:mb-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal variant="fade-up" className="max-w-2xl">
          <p className="text-zs-muted inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] uppercase">
            <span className="bg-zs-blue-900/30 inline-block h-px w-8" />
            {_translateUi("Cómo encontrarnos")}
          </p>
          <h2
            className="font-display text-zs-blue-950 mt-4 leading-[0.95] font-bold tracking-[-0.035em]"
            style={{ fontSize: "clamp(1.85rem, 4.5vw, 3.5rem)" }}
          >
            {_translateUi("Ven a la tienda.")}
            <br />
            <span className="text-zs-muted/70">{_translateUi("Te esperamos sin prisa.")}</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <OpenNowBadge tone="light" />
        </Reveal>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="border-zs-blue-950/10 bg-zs-surface grid grid-cols-1 gap-6 overflow-hidden rounded-3xl border lg:grid-cols-5">
          {/* Mapa — 60% desktop */}
          <div className="bg-zs-blue-950 relative aspect-[4/3] w-full overflow-hidden lg:col-span-3 lg:aspect-auto lg:min-h-[480px]">
            <iframe
              title={_translateUi("Mapa de Zona Sport en Puebla de la Calzada")}
              src={embedSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>

          {/* Info — 40% desktop */}
          <div className="flex flex-col gap-7 p-6 sm:p-10 lg:col-span-2 lg:p-12">
            <div>
              <p className="text-zs-red-600 text-[11px] font-semibold tracking-[0.28em] uppercase">
                {_translateUi("Zona Sport")}
              </p>
              <p className="font-display text-zs-blue-950 mt-2 text-2xl leading-tight font-bold sm:text-3xl">
                {_translateValue(STORE_NAP.streetAddress)}
                <br />
                {_translateValue(STORE_NAP.postalCode)} {_translateValue(STORE_NAP.addressLocality)}
                <br />
                <span className="text-zs-muted">
                  {_translateUi("Badajoz ·")} {_translateValue(STORE_NAP.addressCountry)}
                </span>
              </p>
            </div>

            <ul className="space-y-3 text-sm">
              <li className="text-zs-blue-950 flex items-start gap-3">
                <Clock className="text-zs-red-600 mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">{_translateUi("Horario")}</p>
                  <p className="text-zs-muted">
                    {_translateUi("Lunes a viernes: 10:00 – 14:00 y 17:30 – 20:30")}
                  </p>
                  <p className="text-zs-muted">{_translateUi("Sábado: 10:00 – 14:00")}</p>
                  <p className="text-zs-muted">{_translateUi("Domingo: cerrado")}</p>
                </div>
              </li>
              <li className="text-zs-blue-950 flex items-center gap-3">
                <Phone className="text-zs-red-600 h-4 w-4 shrink-0" />
                <a
                  href={`tel:${STORE_NAP.telephone}`}
                  className="hover:text-zs-red-600 font-semibold"
                >
                  {_translateUi("+34 689 11 06 91")}
                </a>
              </li>
              <li className="text-zs-blue-950 flex items-center gap-3">
                <Mail className="text-zs-red-600 h-4 w-4 shrink-0" />
                <a
                  href={`mailto:${STORE_NAP.email}`}
                  className="hover:text-zs-red-600 font-semibold"
                >
                  {_translateValue(STORE_NAP.email)}
                </a>
              </li>
              <li className="text-zs-blue-950 flex items-start gap-3">
                <MapPin className="text-zs-red-600 mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-zs-muted">
                  {_translateUi("A 5 min de Montijo, 15 min de Mérida, 30 min de Badajoz.")}
                </span>
              </li>
            </ul>

            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Cómo llegar"
                className="group bg-zs-blue-950 hover:bg-zs-blue-900 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-bold tracking-[0.12em] text-white uppercase transition-all"
                style={{ boxShadow: "var(--shadow-zs-blue-glow)" }}
              >
                {_translateUi("Cómo llegar")}
                <ArrowUpRight
                  className="h-4 w-4 transition-transform group-hover:rotate-45"
                  strokeWidth={2.5}
                />
              </a>
              <a
                href={whatsappUrl(WhatsAppMessages.generic())}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="WhatsApp"
                className="border-zs-blue-950/15 text-zs-blue-950 hover:border-zs-blue-950 hover:text-zs-blue-950 inline-flex h-12 items-center gap-2 rounded-full border bg-white px-6 text-sm font-semibold transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                {_translateUi("WhatsApp")}
              </a>
              <a
                href="https://maps.app.goo.gl/ZNHviai5Zxd3rmJB8"
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Reseñas"
                className="border-zs-blue-950/15 text-zs-blue-950 hover:border-zs-blue-950 inline-flex h-12 items-center gap-2 rounded-full border bg-white px-6 text-sm font-semibold transition-colors"
              >
                <Star className="fill-zs-yellow-400 text-zs-yellow-400 h-4 w-4" />
                {_translateUi("Reseñas en Google")}
              </a>
            </div>

            <p className="text-zs-muted/80 text-[10px] tracking-[0.22em] uppercase">
              {_translateUi("También puedes")}{" "}
              <Link href="/contacto" className="underline-offset-4 hover:underline">
                {_translateUi("escribirnos")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
