import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  Navigation,
  Star,
  ChevronRight,
} from "lucide-react";
import { buildMetadata } from "@/lib/seo/metadata";
import { cleanProductName } from "@/lib/utils/html";
import {
  STORE_NAP,
  breadcrumbSchema,
  faqPageSchema,
  jsonLd,
  localLandingSchema,
  localBusinessSchema,
} from "@/lib/seo/schema-org";
import {
  LANDINGS,
  LANDING_SLUGS,
  type LandingSlug,
} from "@/lib/landings/contents";
import { whatsappUrl, WhatsAppMessages, telHref } from "@/lib/whatsapp";
import { db } from "@/lib/db";
import { IN_STOCK_WHERE } from "@/lib/products/in-stock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const eurFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

function formatPrice(value: number): string {
  return eurFormatter.format(value);
}

export const revalidate = 86400; // 24 horas

type PageProps = {
  params: Promise<{ municipio: string }>;
};

export function generateStaticParams() {
  return LANDING_SLUGS.map((municipio) => ({ municipio }));
}

function getLanding(slug: string) {
  if (!(LANDING_SLUGS as readonly string[]).includes(slug)) return null;
  return LANDINGS[slug as LandingSlug];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { municipio } = await params;
  const landing = getLanding(municipio);
  if (!landing) return buildMetadata({ title: "Tienda no encontrada", noIndex: true });

  return buildMetadata({
    title: `Tienda de deportes en ${landing.name}`,
    description: `Zona Sport, tu tienda de deportes cerca de ${landing.name}. ${landing.distance}. Running, pádel, montaña, fitness y calzado. Visítanos en Puebla de la Calzada o reserva por WhatsApp.`,
    path: `/tienda-en/${landing.slug}`,
  });
}

async function getHighlightProducts(categorySlug: string) {
  try {
    const items = await db.product.findMany({
      where: {
        status: "ACTIVE",
        ...IN_STOCK_WHERE,
        category: { slug: categorySlug },
      },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        retailPrice: true,
        salePrice: true,
        mainImageUrl: true,
        brand: { select: { name: true } },
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { url: true, urlThumb: true, alt: true },
        },
      },
    });
    return items;
  } catch {
    return [];
  }
}

export default async function LandingPage({ params }: PageProps) {
  const { municipio } = await params;
  const landing = getLanding(municipio);
  if (!landing) notFound();

  const products = await getHighlightProducts(landing.highlightCategorySlug);

  const waMessage = WhatsAppMessages.local(landing.name);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(localLandingSchema(landing.name)) }}
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
              { name: `Tienda en ${landing.name}`, path: `/tienda-en/${landing.slug}` },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            faqPageSchema(landing.faqs.map((f) => ({ q: f.q, a: f.a }))),
          ),
        }}
      />

      {/* Hero */}
      <section className="bg-zs-gradient py-14 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-white/70">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:text-white">
                  Inicio
                </Link>
              </li>
              <li aria-hidden>
                <ChevronRight className="h-3 w-3" />
              </li>
              <li className="text-white">Tienda en {landing.name}</li>
            </ol>
          </nav>

          <p className="text-xs font-semibold uppercase tracking-wide text-zs-tennis-300">
            {landing.region}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Tienda de deportes {landing.distanceKm === 0 ? "en" : "cerca de"}{" "}
            <span className="text-zs-tennis-300">{landing.name}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            {landing.distance}. Multimarca, atención cercana y reserva por WhatsApp. Te
            apartamos lo que necesites para que pases a probártelo con calma.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" /> Reservar por WhatsApp
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                landing.name + ", Badajoz",
              )}&destination=${encodeURIComponent("C. Silos 3, 06490 Puebla de la Calzada")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              <Navigation className="h-4 w-4" /> Cómo llegar
            </a>
          </div>
        </div>
      </section>

      {/* Descripción */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">
          Tu tienda de deportes de referencia {landing.distanceKm === 0 ? "en" : "para"}{" "}
          {landing.name}
        </h2>
        <div className="prose prose-zs mt-5 max-w-none text-zs-ink/90">
          <p>{landing.description}</p>
          <p>{landing.areaContext}</p>
        </div>
      </section>

      {/* Mapa con ruta */}
      <section className="border-y border-zs-border bg-zs-surface/60 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
                Cómo llegar
              </p>
              <h2 className="mt-2 text-2xl font-bold text-zs-blue-900 sm:text-3xl">
                {landing.distance}
              </h2>
              <p className="mt-3 text-sm text-zs-ink/85">
                Estamos en {STORE_NAP.streetAddress}, {STORE_NAP.postalCode}{" "}
                {STORE_NAP.addressLocality}. Aparcamiento gratis en la zona y entrada accesible
                a pie de calle.
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                  {STORE_NAP.streetAddress}, {STORE_NAP.postalCode}{" "}
                  {STORE_NAP.addressLocality}
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                  <a href={telHref()} className="hover:text-zs-blue-700">
                    +34 689 11 06 91
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                  L–V 10:00–14:00 · 17:30–20:30 · Sábado 10:00–14:00
                </li>
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm">
              <iframe
                src={landing.mapEmbedUrl}
                width="100%"
                height="380"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Ruta desde ${landing.name} hasta Zona Sport`}
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Productos destacados */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
              Selección para ti
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zs-blue-900 sm:text-3xl">
              Lo más demandado {landing.distanceKm === 0 ? "en" : "desde"} {landing.name}:{" "}
              {landing.highlightCategoryLabel}
            </h2>
          </div>
          <Link
            href={`/${landing.highlightCategorySlug}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-zs-blue-700 hover:underline"
          >
            Ver todo {landing.highlightCategoryLabel.toLowerCase()}{" "}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-zs-border bg-zs-surface/40 p-10 text-center">
            <Star className="mx-auto h-10 w-10 text-zs-blue-700/60" />
            <p className="mt-4 font-medium text-zs-blue-900">
              Visítanos para descubrir nuestro catálogo
            </p>
            <p className="mt-2 text-sm text-zs-muted">
              Tenemos producto en tienda en todo momento. Si buscas algo concreto,
              escríbenos por WhatsApp y te confirmamos disponibilidad al instante.
            </p>
            <a
              href={whatsappUrl(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" /> Pregunta por WhatsApp
            </a>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const img = p.mainImageUrl ?? p.images[0]?.url;
              const alt = p.images[0]?.alt || p.name;
              const price = Number(p.salePrice ?? p.retailPrice);
              const previous = p.salePrice ? Number(p.retailPrice) : null;
              return (
                <li key={p.id}>
                  <Link
                    href={`/producto/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm transition hover:border-zs-blue-700/50 hover:shadow-md"
                  >
                    <div className="relative aspect-square bg-zs-surface">
                      {img ? (
                        <Image
                          src={img}
                          alt={alt}
                          fill
                          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                          className="object-contain p-4 transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zs-muted">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-4">
                      <p className="text-xs uppercase tracking-wide text-zs-muted">
                        {p.brand.name}
                      </p>
                      <p className="line-clamp-2 text-sm font-semibold text-zs-ink">
                        {cleanProductName(p.name)}
                      </p>
                      <div className="mt-auto flex items-baseline gap-2 pt-3">
                        <span className="text-base font-bold text-zs-blue-900">
                          {formatPrice(price)}
                        </span>
                        {previous && previous > price ? (
                          <span className="text-xs text-zs-muted line-through">
                            {formatPrice(previous)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* FAQ */}
      <section className="border-t border-zs-border bg-zs-surface/40 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
            Dudas habituales
          </p>
          <h2 className="mt-2 text-2xl font-bold text-zs-blue-900 sm:text-3xl">
            Preguntas frecuentes desde {landing.name}
          </h2>

          <div className="mt-8 rounded-2xl border border-zs-border bg-white px-5 shadow-sm sm:px-7">
            <Accordion type="single" collapsible className="w-full">
              {landing.faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <div className="grid gap-6 rounded-3xl border border-zs-border bg-white p-8 shadow-sm sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-zs-blue-900 sm:text-3xl">
              Visítanos en Puebla de la Calzada
            </h2>
            <p className="mt-3 text-zs-ink/85">
              Si vives en {landing.name}, hacer el camino merece la pena: te atendemos sin
              prisas, te dejamos probar el material y te asesoramos en zapatilla, pala o
              equipación con conocimiento de causa.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                <span>
                  {STORE_NAP.streetAddress}, {STORE_NAP.postalCode}{" "}
                  {STORE_NAP.addressLocality}, {STORE_NAP.addressRegion}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                <a href={telHref()} className="hover:text-zs-blue-700">
                  +34 689 11 06 91
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                <a href={`mailto:${STORE_NAP.email}`} className="hover:text-zs-blue-700">
                  {STORE_NAP.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                <span>L–V 10–14h · 17:30–20:30h. Sábado 10–14h. Domingo cerrado.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-3 rounded-2xl bg-zs-blue-50 p-6">
            <p className="text-base font-semibold text-zs-blue-900">
              ¿Prefieres consultar antes?
            </p>
            <p className="text-sm text-zs-ink/85">
              Escríbenos por WhatsApp con el modelo y la talla. Te confirmamos disponibilidad
              en minutos y te lo apartamos.
            </p>
            <a
              href={whatsappUrl(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
            </a>
            <Link
              href="/contacto"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-blue-900 hover:bg-zs-surface"
            >
              Otras formas de contacto
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
