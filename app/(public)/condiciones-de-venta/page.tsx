import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd, STORE_NAP } from "@/lib/seo/schema-org";

export const metadata: Metadata = buildMetadata({
  title: "Condiciones de venta y devoluciones",
  description:
    "Condiciones de venta, reservas, envíos, garantías y devoluciones de Zona Sport. Información clara conforme a la Ley General para la Defensa de los Consumidores.",
  path: "/condiciones-de-venta",
});

export default function CondicionesPage() {
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
              { name: "Condiciones de venta", path: "/condiciones-de-venta" },
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
            Condiciones de venta y devoluciones
          </h1>
          <p className="mt-2 text-sm text-zs-muted">Última actualización: {updated}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-zs max-w-none text-zs-ink/90">
          <div className="not-prose mb-8 rounded-2xl border border-zs-tennis-300 bg-zs-tennis-100/40 p-5 text-sm text-zs-ink">
            <p className="font-semibold text-zs-blue-900">Pago online en desarrollo</p>
            <p className="mt-1">
              Actualmente el carrito y el pago online se encuentran en fase de desarrollo. La
              tienda funciona como <strong>escaparate de catálogo</strong>: confirmamos
              disponibilidad y precio, gestionamos la reserva por WhatsApp o teléfono, y la
              compra se finaliza en tienda física o, en su caso, mediante transferencia
              previa al envío.
            </p>
          </div>

          <h2>1. Identificación del vendedor</h2>
          <ul>
            <li><strong>Denominación:</strong> Zona Sport</li>
            <li><strong>CIF / NIF:</strong> <em className="text-zs-muted">Disponible a petición justificada en hola@zonasport.es</em></li>
            <li>
              <strong>Domicilio:</strong> {STORE_NAP.streetAddress}, {STORE_NAP.postalCode}{" "}
              {STORE_NAP.addressLocality}, {STORE_NAP.addressRegion}, España
            </li>
            <li>
              <strong>Teléfono:</strong>{" "}
              <a href={`tel:${STORE_NAP.telephone}`}>+34 689 11 06 91</a>
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a>
            </li>
          </ul>

          <h2>2. Productos, precios y disponibilidad</h2>
          <p>
            Los precios y la disponibilidad mostrados en la web son orientativos y se
            confirman siempre en el momento de la reserva. Los precios incluyen el IVA al
            tipo vigente. Zona Sport se reserva el derecho a modificar precios y a retirar de
            la venta productos sin previo aviso, así como a corregir errores tipográficos
            evidentes.
          </p>

          <h2>3. Proceso de reserva y compra</h2>
          <ol>
            <li>
              <strong>Consulta:</strong> el cliente contacta por WhatsApp (+34 689 11 06 91)
              o por el formulario web, indicando producto, talla y color.
            </li>
            <li>
              <strong>Confirmación:</strong> Zona Sport responde con disponibilidad, precio y
              plazos. La reserva se mantiene hasta 48 horas sin compromiso.
            </li>
            <li>
              <strong>Compra:</strong> el cliente pasa por la tienda física a pagar y recoger,
              o bien se acuerda envío con pago anticipado por transferencia (en este caso,
              hasta que esté operativa la pasarela de pago online).
            </li>
          </ol>

          <h2>4. Formas de pago</h2>
          <ul>
            <li>
              <strong>En tienda:</strong> efectivo, tarjeta bancaria (Visa, Mastercard) o
              Bizum.
            </li>
            <li>
              <strong>Reservas con envío:</strong> transferencia bancaria previa al envío.
            </li>
            <li>
              <strong>Próximamente:</strong> pago con tarjeta y wallets digitales (Apple Pay,
              Google Pay) directamente desde la web, una vez activada la pasarela de pago.
            </li>
          </ul>

          <h2>5. Envíos</h2>
          <p>
            Realizamos envíos a domicilio dentro de la comarca de las Vegas Bajas del
            Guadiana y Tierra de Barros (Puebla de la Calzada, Montijo, Lobón, Talavera la
            Real, Mérida, Badajoz y poblaciones cercanas). Para envíos al resto del territorio
            nacional, consultar disponibilidad por WhatsApp.
          </p>
          <ul>
            <li>
              <strong>Plazo:</strong> 24-72 horas laborables desde la confirmación del pago.
            </li>
            <li>
              <strong>Gastos de envío:</strong> gratuito a partir de 60 € de compra dentro de
              la comarca. Para importes menores, se informa del coste al confirmar el pedido.
            </li>
          </ul>

          <h2>6. Derecho de desistimiento y devoluciones</h2>
          <p>
            Conforme al artículo 102 del Real Decreto Legislativo 1/2007, de 16 de noviembre,
            por el que se aprueba el texto refundido de la Ley General para la Defensa de los
            Consumidores y Usuarios (TRLGDCU), si compras a distancia dispones de un plazo de{" "}
            <strong>14 días naturales</strong> desde la recepción del producto para desistir
            del contrato sin necesidad de justificación.
          </p>
          <p>
            Para ejercer el derecho de desistimiento, notifícanoslo por email a{" "}
            <a href={`mailto:${STORE_NAP.email}`}>{STORE_NAP.email}</a> o por escrito en
            tienda. Devuelve el producto en su embalaje original, sin uso y con todos los
            complementos y etiquetas. Te reembolsaremos el importe abonado (excluidos los
            gastos de envío de devolución, salvo defecto del producto) en un plazo máximo de
            14 días desde que tengamos constancia de tu decisión.
          </p>
          <p>
            <strong>Excepciones:</strong> conforme al art. 103 TRLGDCU, no aplica el desistimiento
            a productos personalizados o confeccionados según especificaciones del consumidor
            (por ejemplo, equipaciones con nombre o número estampado).
          </p>

          <h2>7. Garantía legal</h2>
          <p>
            Todos los productos cuentan con la garantía legal establecida en el TRLGDCU para
            consumidores: <strong>tres años desde la entrega</strong> para faltas de
            conformidad. Conserva siempre el ticket o factura como justificante.
          </p>
          <p>
            Si el producto presenta un defecto de fabricación, contáctanos lo antes posible.
            Gestionaremos directamente la reparación, sustitución o devolución conforme a la
            ley y a los acuerdos con la marca fabricante.
          </p>

          <h2>8. Reclamaciones</h2>
          <p>
            Disponemos de hojas de reclamaciones oficiales a disposición del consumidor en la
            tienda física. También puedes contactar con la Oficina Municipal de Información
            al Consumidor (OMIC) correspondiente o con la Dirección General de Consumo de la
            Junta de Extremadura.
          </p>
          <p>
            Conforme al Reglamento (UE) 524/2013, la Comisión Europea pone a disposición de
            los consumidores la plataforma de Resolución de Litigios en Línea, accesible en:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
            >
              ec.europa.eu/consumers/odr
            </a>
            .
          </p>

          <h2>9. Legislación aplicable y jurisdicción</h2>
          <p>
            Estas condiciones se rigen por la legislación española. Para cualquier
            controversia, las partes se someten a los Juzgados y Tribunales del domicilio del
            consumidor cuando este actúe como tal y, en otro caso, a los de Badajoz.
          </p>

          <h2>10. Documentación complementaria</h2>
          <p>
            Las presentes condiciones se completan con el{" "}
            <Link href="/aviso-legal">aviso legal</Link>, la{" "}
            <Link href="/politica-privacidad">política de privacidad</Link> y la{" "}
            <Link href="/politica-cookies">política de cookies</Link> de este Sitio.
          </p>
        </div>
      </article>
    </>
  );
}
