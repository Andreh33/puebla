import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  STORE_NAP,
  breadcrumbSchema,
  jsonLd,
  localBusinessSchema,
} from "@/lib/seo/schema-org";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { ContactForm } from "@/components/public/ContactForm";
import { whatsappUrl, WhatsAppMessages, telHref } from "@/lib/whatsapp";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = buildMetadata({
  title: "Contacto",
  description:
    "Contacta con Zona Sport, tu tienda de deportes en Puebla de la Calzada (Badajoz). Teléfono, WhatsApp, email, dirección y horarios. Te respondemos rápido.",
  path: "/contacto",
});

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": `${SITE_URL}/contacto#contactpage`,
  url: `${SITE_URL}/contacto`,
  name: "Contacto — Zona Sport",
  inLanguage: "es-ES",
  about: { "@id": `${SITE_URL}/#store` },
  mainEntity: { "@id": `${SITE_URL}/#store` },
};

export default function ContactoPage() {
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(
    "C. Silos 3, 06490 Puebla de la Calzada, Badajoz",
  )}&output=embed`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(contactPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: "Inicio", path: "/" },
              { name: "Contacto", path: "/contacto" },
            ]),
          ),
        }}
      />

      {/* Hero */}
      <section className="bg-zs-gradient py-14 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-tennis-300">
            Estamos para lo que necesites
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl md:text-5xl">Contacto</h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            La forma más rápida de hablar con nosotros es WhatsApp. También puedes llamarnos,
            escribirnos un email o usar el formulario. Te respondemos en horario comercial,
            normalmente en menos de una hora.
          </p>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="text-2xl font-bold text-zs-blue-900">Escríbenos un mensaje</h2>
            <p className="mt-2 text-sm text-zs-muted">
              Rellena el formulario y te contestamos por email. Los datos solo se usan para
              gestionar tu consulta.
            </p>
            <div className="mt-6">
              <ContactForm sourcePage="/contacto" />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-zs-border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zs-blue-900">Datos de contacto</h2>
              <ul className="mt-4 space-y-4 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-zs-blue-700" />
                  <div>
                    <p className="font-medium text-zs-ink">Dirección</p>
                    <p className="text-zs-muted">
                      {STORE_NAP.streetAddress}
                      <br />
                      {STORE_NAP.postalCode} {STORE_NAP.addressLocality}, {STORE_NAP.addressRegion}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-zs-blue-700" />
                  <div>
                    <p className="font-medium text-zs-ink">Teléfono / WhatsApp</p>
                    <a
                      href={telHref()}
                      className="text-zs-blue-700 underline-offset-2 hover:underline"
                    >
                      +34 689 11 06 91
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-zs-blue-700" />
                  <div>
                    <p className="font-medium text-zs-ink">Email</p>
                    <a
                      href={`mailto:${STORE_NAP.email}`}
                      className="text-zs-blue-700 underline-offset-2 hover:underline"
                    >
                      {STORE_NAP.email}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-zs-blue-700" />
                  <div>
                    <p className="font-medium text-zs-ink">Horario</p>
                    <p className="text-zs-muted">
                      Lunes a viernes: 10:00–14:00 · 17:30–20:30
                      <br />
                      Sábado: 10:00–14:00
                      <br />
                      Domingo: cerrado
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-2">
                <a
                  href={whatsappUrl(WhatsAppMessages.contactFromPage("Contacto"))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp directo
                </a>
                <WhatsAppButton variant="inline" message={WhatsAppMessages.generic()} label="Consulta rápida" className="hidden" />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm">
              <iframe
                src={mapEmbed}
                width="100%"
                height="280"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mapa de ubicación de Zona Sport en Puebla de la Calzada"
                allowFullScreen
              />
              <div className="p-4 text-xs text-zs-muted">
                <Link href="https://www.google.com/maps/dir/?api=1&destination=C.+Silos+3,+Puebla+de+la+Calzada"
                  target="_blank" rel="noopener noreferrer"
                  className="font-semibold text-zs-blue-700 hover:underline"
                >
                  Cómo llegar en Google Maps →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
