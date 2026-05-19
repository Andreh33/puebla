import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd, STORE_NAP } from "@/lib/seo/schema-org";

export const metadata: Metadata = buildMetadata({
  title: "Aviso legal",
  description:
    "Aviso legal de Zona Sport conforme a la Ley 34/2002 (LSSI-CE). Identificación del titular, condiciones de uso, propiedad intelectual y responsabilidad.",
  path: "/aviso-legal",
});

export default function AvisoLegalPage() {
  const today = new Date();
  const updated = today.toLocaleDateString("es-ES", {
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
              { name: "Aviso legal", path: "/aviso-legal" },
            ]),
          ),
        }}
      />

      <section className="bg-zs-surface/60 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
            Información legal
          </p>
          <h1 className="mt-2 text-3xl font-bold text-zs-blue-900 sm:text-4xl">Aviso legal</h1>
          <p className="mt-2 text-sm text-zs-muted">
            Última actualización: {updated}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-zs max-w-none text-zs-ink/90">
          <p>
            El presente aviso legal regula el uso del sitio web alojado en{" "}
            <strong>zonasport.es</strong> (en adelante, &laquo;el Sitio&raquo;), titularidad
            de Zona Sport, en cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio,
            de Servicios de la Sociedad de la Información y Comercio Electrónico (LSSI-CE).
          </p>

          <h2>1. Identificación del titular</h2>
          <ul>
            <li><strong>Denominación:</strong> Zona Sport</li>
            <li><strong>CIF / NIF:</strong> <em className="text-zs-muted">Disponible a petición justificada en hola@zonasport.es</em></li>
            <li>
              <strong>Domicilio:</strong> {STORE_NAP.streetAddress}, {STORE_NAP.postalCode}{" "}
              {STORE_NAP.addressLocality} ({STORE_NAP.addressRegion}), España
            </li>
            <li>
              <strong>Teléfono:</strong>{" "}
              <a href={`tel:${STORE_NAP.telephone}`}>+34 689 11 06 91</a>
            </li>
            <li>
              <strong>Correo electrónico:</strong>{" "}
              <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a>
            </li>
          </ul>

          <h2>2. Objeto y ámbito de aplicación</h2>
          <p>
            Este Sitio tiene por objeto presentar la actividad comercial de Zona Sport como
            tienda de artículos deportivos, facilitar información de catálogo, blog
            informativo y canales de contacto. El acceso y uso del Sitio atribuye la condición
            de usuario e implica la aceptación plena de las condiciones recogidas en este
            aviso legal y, en su caso, la política de privacidad y la política de cookies.
          </p>

          <h2>3. Condiciones de uso</h2>
          <p>
            El usuario se compromete a hacer un uso adecuado y lícito de los contenidos y
            servicios ofrecidos a través del Sitio, absteniéndose de:
          </p>
          <ul>
            <li>
              Utilizarlos con fines o efectos contrarios a la ley, a la moral, al orden
              público o a las buenas costumbres.
            </li>
            <li>
              Provocar daños en los sistemas físicos o lógicos del Sitio o de terceros, o
              introducir o difundir virus o cualquier otro elemento susceptible de causar
              daños.
            </li>
            <li>
              Intentar acceder, utilizar o manipular los datos de Zona Sport, terceros
              proveedores u otros usuarios.
            </li>
            <li>
              Realizar actividades publicitarias o de explotación comercial a través del Sitio
              sin autorización previa y por escrito.
            </li>
          </ul>

          <h2>4. Propiedad intelectual e industrial</h2>
          <p>
            Todos los contenidos del Sitio (textos, fotografías, gráficos, logos, código
            fuente, diseño, estructura de navegación, bases de datos y demás elementos) son
            propiedad de Zona Sport o de terceros que han autorizado su uso. Quedan reservados
            todos los derechos de propiedad intelectual e industrial sobre dichos contenidos.
          </p>
          <p>
            Queda expresamente prohibida la reproducción, distribución, transformación o
            comunicación pública de cualquier contenido del Sitio sin autorización previa y
            por escrito de Zona Sport, salvo para uso estrictamente personal y privado.
          </p>
          <p>
            Las marcas comerciales de productos mostrados en el catálogo pertenecen a sus
            respectivos titulares y se muestran exclusivamente con finalidad descriptiva y
            comercial autorizada por la legislación vigente.
          </p>

          <h2>5. Enlaces a sitios de terceros</h2>
          <p>
            El Sitio puede contener enlaces a páginas web de terceros. Zona Sport no asume
            ninguna responsabilidad sobre los contenidos, productos, servicios o información
            que dichas páginas puedan ofrecer. La inclusión del enlace no implica vinculación
            ni recomendación más allá de la mera referencia informativa o, en su caso,
            comercial cuando así se indique expresamente (enlaces de afiliación a Amazon u
            otras plataformas).
          </p>

          <h2>6. Exclusión de garantías y responsabilidad</h2>
          <p>
            Zona Sport realiza esfuerzos razonables para asegurar la veracidad, exactitud y
            actualización de la información publicada, pero no garantiza la inexistencia de
            errores ni la disponibilidad ininterrumpida del Sitio. En consecuencia, no se hace
            responsable de los daños o perjuicios derivados de:
          </p>
          <ul>
            <li>Interrupciones, fallos o errores técnicos del Sitio o de su red de soporte.</li>
            <li>
              Actualizaciones de catálogo, precios o disponibilidad que puedan haber quedado
              desactualizadas; el precio y disponibilidad definitivos se confirman siempre en
              tienda o mediante WhatsApp.
            </li>
            <li>
              Uso ilícito, negligente, fraudulento o contrario al presente aviso legal por
              parte del usuario.
            </li>
          </ul>

          <h2>7. Modificaciones</h2>
          <p>
            Zona Sport se reserva el derecho a modificar en cualquier momento y sin previo
            aviso las condiciones recogidas en este aviso legal, en la política de privacidad
            o en la política de cookies. El usuario será informado a través del propio Sitio.
          </p>

          <h2>8. Legislación aplicable y jurisdicción</h2>
          <p>
            Las presentes condiciones se rigen por la legislación española. Para la resolución
            de cualquier controversia que pudiera derivarse del acceso o uso del Sitio, las
            partes se someten a los Juzgados y Tribunales del domicilio del consumidor cuando
            este actúe como tal y, en otro caso, a los Juzgados y Tribunales de Badajoz,
            renunciando a cualquier otro fuero que pudiera corresponderles.
          </p>

          <h2>9. Contacto</h2>
          <p>
            Para cualquier consulta relacionada con este aviso legal, puedes escribirnos a{" "}
            <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a> o llamarnos al{" "}
            <a href={`tel:${STORE_NAP.telephone}`}>+34 689 11 06 91</a>.
          </p>
        </div>
      </article>
    </>
  );
}
