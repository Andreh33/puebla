import Link from "next/link";
import { MapPin, Phone, Mail, Clock, MessageCircle, ArrowUpRight } from "lucide-react";
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
      aria-label="Cómo encontrarnos"
      className="relative bg-white py-20 sm:py-28"
    >
      <header className="mx-auto mb-12 flex max-w-[1600px] flex-col gap-4 px-4 sm:mb-16 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal variant="fade-up" className="max-w-2xl">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-zs-muted">
            <span className="inline-block h-px w-8 bg-zs-blue-900/30" />
            Cómo encontrarnos
          </p>
          <h2
            className="mt-4 font-display font-bold leading-[0.95] tracking-[-0.035em] text-zs-blue-950"
            style={{ fontSize: "clamp(1.85rem, 4.5vw, 3.5rem)" }}
          >
            Ven a la tienda.
            <br />
            <span className="text-zs-muted/70">Te esperamos sin prisa.</span>
          </h2>
        </Reveal>
        <Reveal variant="fade-up" delay={120}>
          <OpenNowBadge tone="light" />
        </Reveal>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-8">
        <div className="grid grid-cols-1 gap-6 overflow-hidden rounded-3xl border border-zs-blue-950/10 bg-zs-surface lg:grid-cols-5">
          {/* Mapa — 60% desktop */}
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-zs-blue-950 lg:col-span-3 lg:aspect-auto lg:min-h-[480px]">
            <iframe
              title="Mapa de Zona Sport en Puebla de la Calzada"
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
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zs-red-600">
                Zona Sport
              </p>
              <p className="mt-2 font-display text-2xl font-bold leading-tight text-zs-blue-950 sm:text-3xl">
                {STORE_NAP.streetAddress}
                <br />
                {STORE_NAP.postalCode} {STORE_NAP.addressLocality}
                <br />
                <span className="text-zs-muted">Badajoz · {STORE_NAP.addressCountry}</span>
              </p>
            </div>

            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-zs-blue-950">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zs-red-600" />
                <div>
                  <p className="font-semibold">Horario</p>
                  <p className="text-zs-muted">Lunes a viernes: 10:00 – 14:00 y 17:00 – 20:00</p>
                  <p className="text-zs-muted">Sábado: 10:00 – 14:00</p>
                  <p className="text-zs-muted">Domingo: cerrado</p>
                </div>
              </li>
              <li className="flex items-center gap-3 text-zs-blue-950">
                <Phone className="h-4 w-4 shrink-0 text-zs-red-600" />
                <a
                  href={`tel:${STORE_NAP.telephone}`}
                  className="font-semibold hover:text-zs-red-600"
                >
                  +34 689 11 06 91
                </a>
              </li>
              <li className="flex items-center gap-3 text-zs-blue-950">
                <Mail className="h-4 w-4 shrink-0 text-zs-red-600" />
                <a
                  href={`mailto:${STORE_NAP.email}`}
                  className="font-semibold hover:text-zs-red-600"
                >
                  {STORE_NAP.email}
                </a>
              </li>
              <li className="flex items-start gap-3 text-zs-blue-950">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zs-red-600" />
                <span className="text-zs-muted">
                  A 5 min de Montijo, 15 min de Mérida, 30 min de Badajoz.
                </span>
              </li>
            </ul>

            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="Cómo llegar"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-zs-blue-950 px-6 text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-zs-blue-900"
                style={{ boxShadow: "var(--shadow-zs-blue-glow)" }}
              >
                Cómo llegar
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
                className="inline-flex h-12 items-center gap-2 rounded-full border border-zs-blue-950/15 bg-white px-6 text-sm font-semibold text-zs-blue-950 transition-colors hover:border-zs-blue-950 hover:text-zs-blue-950"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                WhatsApp
              </a>
            </div>

            <p className="text-[10px] uppercase tracking-[0.22em] text-zs-muted/80">
              También puedes <Link href="/contacto" className="underline-offset-4 hover:underline">escribirnos</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
