import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd, STORE_NAP } from "@/lib/seo/schema-org";

export const metadata: Metadata = buildMetadata({
  title: "Política de privacidad",
  description:
    "Política de privacidad de Zona Sport conforme al RGPD y la LOPDGDD. Información sobre el tratamiento de datos, finalidades, plazos, destinatarios y derechos.",
  path: "/politica-privacidad",
});

export default function PoliticaPrivacidadPage() {
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
              { name: "Política de privacidad", path: "/politica-privacidad" },
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
            Política de privacidad
          </h1>
          <p className="mt-2 text-sm text-zs-muted">Última actualización: {updated}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-zs max-w-none text-zs-ink/90">
          <p>
            En Zona Sport nos tomamos en serio la protección de tus datos personales. Esta
            política explica con claridad qué información recogemos, para qué la usamos,
            durante cuánto tiempo la conservamos y qué derechos puedes ejercer en cualquier
            momento, todo ello conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley
            Orgánica 3/2018, de Protección de Datos Personales y garantía de los derechos
            digitales (LOPDGDD).
          </p>

          <h2>1. Responsable del tratamiento</h2>
          <ul>
            <li><strong>Identidad:</strong> Zona Sport</li>
            <li><strong>CIF / NIF:</strong> <em className="text-zs-muted">Disponible a petición justificada en hola@zonasport.es</em></li>
            <li>
              <strong>Dirección:</strong> {STORE_NAP.streetAddress}, {STORE_NAP.postalCode}{" "}
              {STORE_NAP.addressLocality}, {STORE_NAP.addressRegion}, España
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a>
            </li>
            <li>
              <strong>Teléfono:</strong>{" "}
              <a href={`tel:${STORE_NAP.telephone}`}>+34 689 11 06 91</a>
            </li>
          </ul>
          <p>
            Para cualquier cuestión relacionada con tus datos personales o el ejercicio de tus
            derechos, puedes contactar con nosotros por cualquiera de los medios anteriores
            indicando como referencia &laquo;Protección de datos&raquo;.
          </p>

          <h2>2. Finalidades del tratamiento y bases legales</h2>
          <p>Tratamos tus datos para las siguientes finalidades:</p>

          <h3>2.1 Gestión de consultas y atención al cliente</h3>
          <ul>
            <li>
              <strong>Datos tratados:</strong> nombre, apellidos, email, teléfono (opcional),
              contenido del mensaje y, en su caso, producto sobre el que consultas.
            </li>
            <li>
              <strong>Finalidad:</strong> atender tu solicitud, resolver dudas sobre productos
              o servicios, gestionar reservas y envíos pactados por WhatsApp.
            </li>
            <li>
              <strong>Base legal:</strong> consentimiento del interesado (art. 6.1.a RGPD) y
              ejecución de medidas precontractuales a petición del interesado (art. 6.1.b
              RGPD) cuando la consulta tiene por objeto la posible adquisición de un producto.
            </li>
            <li>
              <strong>Plazo:</strong> los datos se conservarán durante el tiempo necesario
              para gestionar la consulta y, posteriormente, durante un máximo de 12 meses
              salvo que solicites antes su supresión.
            </li>
          </ul>

          <h3>2.2 Newsletter y comunicaciones comerciales</h3>
          <ul>
            <li>
              <strong>Datos tratados:</strong> email y, opcionalmente, nombre.
            </li>
            <li>
              <strong>Finalidad:</strong> envío de boletines con novedades de catálogo,
              promociones y contenidos del blog. Solo si has marcado expresamente la casilla
              de consentimiento.
            </li>
            <li>
              <strong>Base legal:</strong> consentimiento expreso del interesado (art. 6.1.a
              RGPD y art. 22 LSSI-CE).
            </li>
            <li>
              <strong>Plazo:</strong> hasta que retires tu consentimiento (cada email
              incluirá un enlace de baja).
            </li>
          </ul>

          <h3>2.3 Analítica web</h3>
          <ul>
            <li>
              <strong>Datos tratados:</strong> métricas agregadas y anónimas de navegación
              (páginas visitadas, dispositivo, país, duración de la sesión). Si has dado tu
              consentimiento, también métricas de rendimiento de Vercel Speed Insights.
            </li>
            <li>
              <strong>Finalidad:</strong> entender qué contenidos funcionan, detectar errores
              y mejorar la web.
            </li>
            <li>
              <strong>Base legal:</strong> consentimiento explícito a través del banner de
              cookies (art. 6.1.a RGPD).
            </li>
            <li>
              <strong>Plazo:</strong> según establezca el proveedor (Vercel Analytics, hasta
              25 meses).
            </li>
          </ul>

          <h3>2.4 Cumplimiento de obligaciones legales</h3>
          <p>
            Trataremos los datos estrictamente necesarios para el cumplimiento de obligaciones
            legales en materia fiscal, contable y mercantil (base legal: art. 6.1.c RGPD;
            plazo: el establecido por la normativa aplicable, hasta 6 años para
            documentación contable según el Código de Comercio).
          </p>

          <h2>3. Destinatarios de los datos</h2>
          <p>
            No cedemos tus datos a terceros salvo obligación legal. Algunos prestadores de
            servicios pueden acceder a ellos en calidad de encargados del tratamiento,
            siempre bajo contrato firmado conforme al art. 28 RGPD:
          </p>
          <ul>
            <li>
              <strong>Vercel Inc.</strong> (EE.UU., con representante en la UE): proveedor de
              hosting, analítica web y red CDN. Adherido al EU-U.S. Data Privacy Framework.
            </li>
            <li>
              <strong>Resend Inc.</strong> (EE.UU.): proveedor de envío transaccional de
              correos electrónicos (notificaciones de formularios, newsletter). Adherido al
              EU-U.S. Data Privacy Framework.
            </li>
            <li>
              <strong>Proveedores futuros:</strong> pasarelas de pago (Stripe, PayPal) y
              empresas de transporte, en el momento en que activemos venta online y envíos.
              Se actualizará esta política y se solicitará el consentimiento adicional que
              corresponda.
            </li>
          </ul>

          <h2>4. Transferencias internacionales</h2>
          <p>
            Los proveedores Vercel y Resend están ubicados en Estados Unidos. Las
            transferencias se realizan al amparo del{" "}
            <strong>Marco de Privacidad de Datos UE-EE.UU. (Data Privacy Framework)</strong>{" "}
            aprobado por la Comisión Europea el 10 de julio de 2023, que ofrece un nivel de
            protección equivalente al europeo. Adicionalmente, mantenemos Cláusulas
            Contractuales Tipo (SCC) como garantía suplementaria.
          </p>

          <h2>5. Derechos del interesado</h2>
          <p>
            Conforme al RGPD, puedes ejercer en cualquier momento los siguientes derechos:
          </p>
          <ul>
            <li>
              <strong>Acceso:</strong> conocer qué datos tuyos tratamos.
            </li>
            <li>
              <strong>Rectificación:</strong> corregir datos inexactos o incompletos.
            </li>
            <li>
              <strong>Supresión (&laquo;derecho al olvido&raquo;):</strong> que eliminemos
              tus datos cuando ya no sean necesarios.
            </li>
            <li>
              <strong>Oposición:</strong> oponerte al tratamiento de tus datos en determinadas
              circunstancias.
            </li>
            <li>
              <strong>Limitación:</strong> solicitar la limitación del tratamiento mientras se
              verifica una reclamación.
            </li>
            <li>
              <strong>Portabilidad:</strong> recibir tus datos en formato estructurado y de
              uso común para transmitirlos a otro responsable.
            </li>
            <li>
              <strong>Retirada del consentimiento:</strong> revocar en cualquier momento el
              consentimiento prestado, sin que ello afecte a la licitud del tratamiento
              previo.
            </li>
          </ul>
          <p>
            Para ejercer tus derechos, envíanos un correo a{" "}
            <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a> indicando el derecho
            que deseas ejercer y aportando copia del DNI o documento equivalente. Te
            responderemos en el plazo máximo de un mes.
          </p>

          <h2>6. Reclamación ante la autoridad de control</h2>
          <p>
            Si consideras que no hemos atendido correctamente tus derechos, puedes presentar
            una reclamación ante la <strong>Agencia Española de Protección de Datos</strong>{" "}
            (AEPD), C/ Jorge Juan, 6, 28001 Madrid, o a través de su sede electrónica en{" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.aepd.es
            </a>
            .
          </p>

          <h2>7. Seguridad</h2>
          <p>
            Aplicamos medidas técnicas y organizativas razonables y proporcionales al riesgo
            del tratamiento: cifrado en tránsito (HTTPS / TLS), control de acceso por roles,
            registros de auditoría, copias de seguridad y formación interna en buenas
            prácticas. Pese a ello, ningún sistema es invulnerable; si detectases una posible
            brecha, te agradeceríamos que nos lo comunicaras a la mayor brevedad.
          </p>

          <h2>8. Cambios en esta política</h2>
          <p>
            Podemos actualizar esta política para reflejar cambios legales, técnicos o
            comerciales. La versión vigente estará siempre publicada en esta página, con
            indicación de la fecha de la última actualización.
          </p>
        </div>
      </article>
    </>
  );
}
