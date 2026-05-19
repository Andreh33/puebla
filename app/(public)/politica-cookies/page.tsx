import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd, STORE_NAP } from "@/lib/seo/schema-org";
import { CookieReopenButton } from "@/components/public/CookieReopenButton";

export const metadata: Metadata = buildMetadata({
  title: "Política de cookies",
  description:
    "Política de cookies de Zona Sport: qué cookies usamos, para qué sirven, cuánto duran y cómo configurarlas o desactivarlas.",
  path: "/politica-cookies",
});

const COOKIES = [
  {
    name: "zs_consent",
    purpose:
      "Almacena tu decisión sobre el banner de cookies (qué categorías aceptaste o rechazaste).",
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
    name: "_va",
    purpose:
      "Identificador anónimo de visitante para Vercel Analytics. Se carga solo si aceptas la categoría &laquo;Analíticas&raquo;.",
    provider: "Vercel Inc.",
    type: "Analítica",
    duration: "Hasta 1 año",
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

export default function PoliticaCookiesPage() {
  const updated = new Date().toLocaleDateString("es-ES", {
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
            ]),
          ),
        }}
      />

      <section className="bg-zs-surface/60 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
            Información legal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zs-blue-900 sm:text-4xl">
            Política de cookies
          </h1>
          <p className="mt-2 text-sm text-zs-muted">Última actualización: {updated}</p>
          <div className="mt-5">
            <CookieReopenButton />
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-zs max-w-none text-zs-ink/90">
          <h2>1. ¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que un sitio web instala en tu
            navegador para reconocer tu dispositivo en visitas posteriores, recordar tus
            preferencias o medir el uso de la web. Algunas son imprescindibles para el
            funcionamiento del sitio; otras son opcionales y solo se activan con tu
            consentimiento.
          </p>

          <h2>2. ¿Qué cookies usamos?</h2>
          <p>
            En Zona Sport intentamos usar las menos cookies posibles. La mayoría son técnicas
            (imprescindibles) y solo activamos analítica si nos das tu consentimiento
            explícito a través del banner.
          </p>

          <div className="not-prose my-6 overflow-x-auto rounded-2xl border border-zs-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zs-surface/80 text-xs uppercase tracking-wide text-zs-blue-900">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Finalidad</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zs-border text-zs-ink/85">
                {COOKIES.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-3 font-mono text-xs">{c.name}</td>
                    <td className="px-4 py-3">{c.type}</td>
                    <td
                      className="px-4 py-3 text-xs"
                      dangerouslySetInnerHTML={{ __html: c.purpose }}
                    />
                    <td className="px-4 py-3 text-xs">{c.provider}</td>
                    <td className="px-4 py-3 text-xs">{c.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>3. Tipos de cookies según finalidad</h2>
          <h3>3.1 Cookies técnicas o necesarias</h3>
          <p>
            Permiten la navegación a través del Sitio y la utilización de las distintas
            opciones (recordar el consentimiento del banner, mantener una sesión de
            administrador). No requieren consentimiento conforme al art. 22.2 LSSI-CE.
          </p>

          <h3>3.2 Cookies analíticas</h3>
          <p>
            Permiten analizar de forma agregada y anónima el comportamiento de los usuarios
            (páginas vistas, tiempo en página, dispositivo, país de origen). Usamos{" "}
            <strong>Vercel Analytics</strong> y <strong>Vercel Speed Insights</strong>, y solo
            las cargamos si has aceptado la categoría correspondiente.
          </p>

          <h3>3.3 Cookies de marketing</h3>
          <p>
            Reservadas para futuras campañas de remarketing o publicidad personalizada.
            Actualmente <strong>no usamos ninguna cookie de marketing</strong>. Si en el
            futuro las incorporamos, te lo notificaremos a través del banner de
            consentimiento.
          </p>

          <h2>4. Cómo gestionar tus cookies</h2>
          <p>
            Cuando accedes por primera vez al Sitio, se muestra un banner desde el que puedes
            aceptar, rechazar o configurar las cookies. Puedes cambiar tu decisión en
            cualquier momento pulsando el botón &laquo;Configurar cookies&raquo; situado al
            inicio de esta página.
          </p>
          <p>
            Adicionalmente, puedes bloquear o eliminar cookies desde la configuración de tu
            navegador. Te dejamos los enlaces oficiales:
          </p>
          <ul>
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Chrome
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                target="_blank"
                rel="noopener noreferrer"
              >
                Mozilla Firefox
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
              >
                Safari
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
              >
                Microsoft Edge
              </a>
            </li>
          </ul>

          <h2>5. Cambios en la política de cookies</h2>
          <p>
            Podemos actualizar esta política para adaptarla a cambios legales, novedades en
            las cookies utilizadas o decisiones de la AEPD. La versión vigente estará siempre
            publicada en esta página con la fecha de la última actualización.
          </p>

          <h2>6. Más información</h2>
          <p>
            Si tienes cualquier duda sobre nuestra política de cookies, escríbenos a{" "}
            <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a>.
          </p>
        </div>
      </article>
    </>
  );
}
