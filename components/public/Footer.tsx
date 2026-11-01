import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import Image from "next/image";
import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react";
import { STORE_NAP } from "@/lib/seo/schema-org";
import { OpenNowBadge } from "@/components/public/OpenNowBadge";

const COLS = [
  {
    // Bloque 4: navegación por hubs género→familia. Antes había un sub-nav de
    // deportes (Running/Pádel/Montaña/Calzado) con slugs que dejaron de existir
    // tras el Bloque 2. Reemplazado por los 5 hubs + Marcas.
    title: "Tienda",
    links: [
      { label: "Hombre", href: "/hombre" },
      { label: "Mujer", href: "/mujer" },
      { label: "Niño", href: "/nino" },
      { label: "Niña", href: "/nina" },
      { label: "Complementos", href: "/accesorios" },
      { label: "Marcas", href: "/marcas" },
    ],
  },
  {
    title: "Información",
    links: [
      { label: "Sobre nosotros", href: "/sobre-nosotros" },
      { label: "Blog", href: "/blog" },
      { label: "Contacto", href: "/contacto" },
      { label: "Envíos y devoluciones", href: "/condiciones-de-venta" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Aviso legal", href: "/aviso-legal" },
      { label: "Política de privacidad", href: "/politica-privacidad" },
      { label: "Política de cookies", href: "/politica-cookies" },
      { label: "Condiciones de venta", href: "/condiciones-de-venta" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-zs-border bg-zs-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Bloque marca */}
          <div className="space-y-4">
            <Image src="/logo.webp" alt={t("Zona Sport")} width={270} height={186} className="h-16 w-auto" />
            <p className="max-w-xs text-sm text-zs-muted">
              {t("Tu tienda de deportes en Puebla de la Calzada. Multimarca, atención cercana y consejo experto desde hace años.")}</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2 text-zs-ink">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zs-blue-700" />
                <span>{tx(STORE_NAP.streetAddress)}, {tx(STORE_NAP.postalCode)} {tx(STORE_NAP.addressLocality)}, {tx(STORE_NAP.addressRegion)}</span>
              </li>
              <li className="flex items-center gap-2 text-zs-ink">
                <Phone className="h-4 w-4 shrink-0 text-zs-blue-700" />
                <a href={`tel:${STORE_NAP.telephone}`} className="hover:text-zs-blue-700">
                  +34 689 11 06 91
                </a>
              </li>
              <li className="flex items-center gap-2 text-zs-ink">
                <Mail className="h-4 w-4 shrink-0 text-zs-blue-700" />
                <a href={`mailto:${STORE_NAP.email}`} className="hover:text-zs-blue-700">
                  {tx(STORE_NAP.email)}
                </a>
              </li>
            </ul>
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2 font-semibold text-zs-ink">
                <Clock className="h-4 w-4 text-zs-blue-700" /> {t("Horario")}</p>
              <p className="text-zs-muted">{t("L–V: 10:00–14:00 · 17:30–20:30")}</p>
              <p className="text-zs-muted">{t("Sábado: 10:00–14:00")}</p>
              <p className="text-zs-muted">{t("Domingo: cerrado")}</p>
              <div className="pt-2">
                <OpenNowBadge tone="light" />
              </div>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zs-blue-900">
                {tx(col.title)}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-zs-ink transition-colors hover:text-zs-blue-700"
                    >
                      {tx(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="my-10 border-zs-border" />

        <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs text-zs-muted">
            © {new Date().getFullYear()} {t("Zona Sport · Hecho con cariño en Puebla de la Calzada · Diseño web por")}{tx(" ")}
            <a
              href="https://serviciosonlineweb.com"
              target="_blank"
              rel="noopener"
              className="transition-colors hover:text-zs-blue-700"
            >
              {t("Latech")}</a>
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label={t("Facebook")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zs-border bg-white text-zs-ink transition hover:border-zs-blue-700 hover:text-zs-blue-700"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label={t("Instagram")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zs-border bg-white text-zs-ink transition hover:border-zs-blue-700 hover:text-zs-blue-700"
            >
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
