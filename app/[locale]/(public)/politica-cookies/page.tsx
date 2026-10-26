import { LOCALE_INFO } from "@/lib/i18n/config";
import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { getRequestLocale } from "@/lib/i18n/request";
import { t } from "@/lib/i18n/dictionaries";
import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd, STORE_NAP } from "@/lib/seo/schema-org";
import { CookieReopenButton } from "@/components/public/CookieReopenButton";

 const baseMetadata: Metadata = buildMetadata({
  title: "Política de cookies",
  description:
    "Política de cookies de Zona Sport: qué cookies usamos, para qué sirven, cuánto duran y cómo configurarlas o desactivarlas.",
  path: "/politica-cookies",
});

const COOKIES = [
  {
    name: "zs_consent",
    purpose:
      "Almacena tus preferencias de cookies opcionales y las retiradas de consentimiento.",
    provider: "Zona Sport (propia)",
    type: "Técnica / necesaria",
    duration: "1 año",
  },
  {
    name: "_vercel_jwt",
    purpose:
      "Cookie de sesión utilizada únicamente en entornos de previsualización protegida (no presente en producción pública).",
    provider: "Vercel Inc.",
    type: "Técnica",
    duration: "Sesión",
  },
  {
    name: "next-auth.session-token",
    purpose:
      "Cookie de sesión para los administradores de la tienda. No se crea para visitantes habituales.",
    provider: "Zona Sport (propia)",
    type: "Técnica",
    duration: "Sesión / 30 días",
  },
] as const;

  function PoliticaCookiesPage() {
  const updated = new Date().toLocaleDateString(LOCALE_INFO[getRequestLocale()].language, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(
            breadcrumbSchema([
              { name: "Inicio", path: "/" },
              { name: "Política de cookies", path: "/politica-cookies" },
            ], getRequestLocale()),
          ),
        }}
      />

      <section className="bg-zs-surface/60 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
            {t("Información legal")}</p>
          <h1 className="mt-2 text-3xl font-bold text-zs-blue-900 sm:text-4xl">
            {t("Política de cookies")}</h1>
          <p className="mt-2 text-sm text-zs-muted">{t("Última actualización:")}{" "}{tx(updated)}</p>
          <div className="mt-5">
            <CookieReopenButton />
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-zs max-w-none text-zs-ink/90">
          <h2>{t("1. ¿Qué son las cookies?")}</h2>
          <p>
            {t("Las cookies son pequeños archivos de texto que un sitio web instala en tu navegador para reconocer tu dispositivo en visitas posteriores, recordar tus preferencias o medir el uso de la web. Algunas son imprescindibles para el funcionamiento del sitio; otras son opcionales y solo se activan con tu consentimiento.")}</p>

          <h2>{t("2. ¿Qué cookies usamos?")}</h2>
          <p>
            {t("La analítica permanece desactivada por defecto. Si anteriormente diste tu consentimiento, puedes retirarlo desde esta página.")}</p>

          <div className="not-prose my-6 overflow-x-auto rounded-2xl border border-zs-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zs-surface/80 text-xs uppercase tracking-wide text-zs-blue-900">
                <tr>
                  <th className="px-4 py-3">{t("Nombre")}</th>
                  <th className="px-4 py-3">{t("Tipo")}</th>
                  <th className="px-4 py-3">{t("Finalidad")}</th>
                  <th className="px-4 py-3">{t("Proveedor")}</th>
                  <th className="px-4 py-3">{t("Duración")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zs-border text-zs-ink/85">
                {COOKIES.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-3 font-mono text-xs">{tx(c.name)}</td>
                    <td className="px-4 py-3">{tx(c.type)}</td>
                    <td
                      className="px-4 py-3 text-xs"
                      dangerouslySetInnerHTML={{ __html: c.purpose }}
                    />
                    <td className="px-4 py-3 text-xs">{tx(c.provider)}</td>
                    <td className="px-4 py-3 text-xs">{tx(c.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>{t("3. Tipos de cookies según finalidad")}</h2>
          <h3>{t("3.1 Cookies técnicas o necesarias")}</h3>
          <p>
            {t("Permiten la navegación a través del Sitio y la utilización de las distintas opciones (recordar preferencias de cookies, mantener una sesión de administrador). No requieren consentimiento conforme al art. 22.2 LSSI-CE.")}</p>

          <h3>{t("3.2 Cookies analíticas")}</h3>
          <p>
            {t("Permiten analizar de forma agregada y anónima el comportamiento de los usuarios (páginas vistas, tiempo en página, dispositivo, país de origen). Usamos")}{tx(" ")}
            <strong>{t("Vercel Analytics")}</strong> {t("y")}{" "}<strong>{t("Vercel Speed Insights")}</strong>{t(", y solo las cargamos si has aceptado la categoría correspondiente.")}</p>

          <h3>{t("3.3 Cookies de marketing")}</h3>
          <p>
            {t("Reservadas para futuras campañas de remarketing o publicidad personalizada. Actualmente")}{" "}<strong>{t("no usamos ninguna cookie de marketing")}</strong>{t(". Cualquier activación futura de cookies opcionales requerirá el consentimiento correspondiente.")}</p>

          <h2>{t("4. Cómo gestionar tus cookies")}</h2>
          <p>
            {t("No mostramos un popup de cookies. Las cookies opcionales permanecen desactivadas por defecto. Puedes retirar cualquier consentimiento anterior pulsando «Desactivar cookies opcionales» al inicio de esta página.")}</p>
          <p>
            {t("Adicionalmente, puedes bloquear o eliminar cookies desde la configuración de tu navegador. Te dejamos los enlaces oficiales:")}</p>
          <ul>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Google Chrome")}</a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Mozilla Firefox")}</a>
            </li>
            <li>
              <a
                href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Safari")}</a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Microsoft Edge")}</a>
            </li>
          </ul>

          <h2>{t("5. Cambios en la política de cookies")}</h2>
          <p>
            {t("Podemos actualizar esta política para adaptarla a cambios legales, novedades en las cookies utilizadas o decisiones de la AEPD. La versión vigente estará siempre publicada en esta página con la fecha de la última actualización.")}</p>

          <h2>{t("6. Más información")}</h2>
          <p>
            {t("Si tienes cualquier duda sobre nuestra política de cookies, escríbenos a")}{tx(" ")}
            <a href={`mailto:${STORE_NAP.email}`}>{tx(STORE_NAP.email)}</a>.
          </p>
        </div>
      </article>
    </>
  );
}

export default withLocalePage(PoliticaCookiesPage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
