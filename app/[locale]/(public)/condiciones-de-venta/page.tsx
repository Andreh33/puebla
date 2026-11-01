import { LOCALE_INFO } from "@/lib/i18n/config";
import { translateValue as tx, translateTemplate as tf } from "@/lib/i18n/dictionaries";
import { getRequestLocale } from "@/lib/i18n/request";
import { t } from "@/lib/i18n/dictionaries";
import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema, jsonLd, STORE_NAP } from "@/lib/seo/schema-org";

 const baseMetadata: Metadata = buildMetadata({
  title: "Condiciones de venta y devoluciones",
  description:
    "Condiciones de venta, reservas, envíos, garantías y devoluciones de Zona Sport. Información clara conforme a la Ley General para la Defensa de los Consumidores.",
  path: "/condiciones-de-venta",
});

  function CondicionesPage() {
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
              { name: "Condiciones de venta", path: "/condiciones-de-venta" },
            ], getRequestLocale()),
          ),
        }}
      />

      <section className="bg-zs-surface/60 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zs-blue-700">
            {t("Información legal")}</p>
          <h1 className="mt-2 text-3xl font-bold text-zs-blue-900 sm:text-4xl">
            {t("Condiciones de venta y devoluciones")}</h1>
          <p className="mt-2 text-sm text-zs-muted">{t("Última actualización:")}{" "}{tx(updated)}</p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12">
        <div className="prose prose-zs max-w-none text-zs-ink/90">
          <div className="not-prose mb-8 rounded-2xl border border-zs-tennis-300 bg-zs-tennis-100/40 p-5 text-sm text-zs-ink">
            <p className="font-semibold text-zs-blue-900">{t("Compra online y atención en tienda")}</p>
            <p className="mt-1">
              {t("Compra desde el catálogo con")}{" "}<strong>{t("pago online seguro")}</strong>{t(". También puedes consultar disponibilidad y gestionar reservas por WhatsApp o teléfono, o comprar en nuestra tienda física de Puebla de la Calzada.")}</p>
          </div>

          <h2>{t("1. Identificación del vendedor")}</h2>
          <ul>
            <li><strong>{t("Denominación:")}</strong> {t("Zona Sport")}</li>
            <li><strong>{t("CIF / NIF:")}</strong> <em className="text-zs-muted">{t("Disponible a petición justificada en hola@zonasport.es")}</em></li>
            <li>
              <strong>{t("Domicilio:")}</strong> {tx(STORE_NAP.streetAddress)}, {tx(STORE_NAP.postalCode)}{tx(" ")}
              {tx(STORE_NAP.addressLocality)}, {tx(STORE_NAP.addressRegion)}{t(", España")}</li>
            <li>
              <strong>{t("Teléfono:")}</strong>{tx(" ")}
              <a href={`tel:${STORE_NAP.telephone}`}>+34 689 11 06 91</a>
            </li>
            <li>
              <strong>{t("Email:")}</strong>{tx(" ")}
              <a href={`mailto:${STORE_NAP.email}`}>{tx(STORE_NAP.email)}</a>
            </li>
          </ul>

          <h2>{t("2. Productos, precios y disponibilidad")}</h2>
          <p>
            {t("Los precios y la disponibilidad mostrados en la web son orientativos y se confirman siempre en el momento de la reserva. Los precios incluyen el IVA al tipo vigente. Zona Sport se reserva el derecho a modificar precios y a retirar de la venta productos sin previo aviso, así como a corregir errores tipográficos evidentes.")}</p>

          <h2>{t("3. Proceso de reserva y compra")}</h2>
          <ol>
            <li>
              <strong>{t("Consulta:")}</strong> {t("el cliente contacta por WhatsApp (+34 689 11 06 91) o por el formulario web, indicando producto, talla y color.")}</li>
            <li>
              <strong>{t("Confirmación:")}</strong> {t("Zona Sport responde con disponibilidad, precio y plazos. La reserva se mantiene hasta 48 horas sin compromiso.")}</li>
            <li>
              <strong>{t("Compra:")}</strong> {t("paga online desde la web (tarjeta, Bizum o a plazos con Klarna) y recoge en tienda o recibe el pedido por envío; o pasa por la tienda física a pagar y recoger.")}</li>
          </ol>

          <h2>{t("4. Formas de pago")}</h2>
          <ul>
            <li>
              <strong>{t("Online:")}</strong> {t("pago seguro a través de Stripe, directamente desde la web: tarjeta (Visa, Mastercard, American Express), Bizum, y pago a plazos con Klarna.")}</li>
            <li>
              <strong>{t("En tienda:")}</strong> {t("efectivo, tarjeta bancaria (Visa, Mastercard) o Bizum.")}</li>
            <li>
              <strong>{t("Reserva por WhatsApp:")}</strong> {t("también puedes reservar un producto y acordar el pago y la recogida o el envío.")}</li>
          </ul>

          <h2>{t("5. Envíos")}</h2>
          <p>
            {t("Enviamos a España, Portugal, Francia, Italia y Alemania. El envío es gratuito en España, sin importe mínimo de compra. Los envíos a Portugal, Francia, Italia y Alemania tienen un coste fijo de 9,80 €.")}</p>
          <ul>
            <li>
              <strong>{t("Plazo:")}</strong> {t("Consulta la previsión de entrega al confirmar el pedido. No publicamos un plazo internacional fijo.")}</li>
            <li>
              <strong>{t("Gastos de envío:")}</strong> {t("España: envío gratuito sin importe mínimo. Portugal, Francia, Italia y Alemania: 9,80 €. La recogida en tienda no tiene gastos de envío.")}</li>
          </ul>

          <h2>{t("6. Derecho de desistimiento y devoluciones")}</h2>
          <p>
            {t("Conforme al artículo 102 del Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios (TRLGDCU), si compras a distancia dispones de un plazo de")}{tx(" ")}
            <strong>{t("14 días naturales")}</strong> {t("desde la recepción del producto para desistir del contrato sin necesidad de justificación.")}</p>
          <p>
            {t("Para ejercer el derecho de desistimiento, notifícanoslo por email a")}{tx(" ")}
            <a href={`mailto:${STORE_NAP.email}`}>{tx(STORE_NAP.email)}</a> {t("o por escrito en tienda. Devuelve el producto en su embalaje original, sin uso y con todos los complementos y etiquetas. Te reembolsaremos el importe abonado (excluidos los gastos de envío de devolución, salvo defecto del producto) en un plazo máximo de 14 días desde que tengamos constancia de tu decisión.")}</p>
          <p>
            <strong>{t("Excepciones:")}</strong> {t("conforme al art. 103 TRLGDCU, no aplica el desistimiento a productos personalizados o confeccionados según especificaciones del consumidor (por ejemplo, equipaciones con nombre o número estampado).")}</p>

          <h2>{t("7. Garantía legal")}</h2>
          <p>
            {t("Todos los productos cuentan con la garantía legal establecida en el TRLGDCU para consumidores:")}{" "}<strong>{t("tres años desde la entrega")}</strong> {t("para faltas de conformidad. Conserva siempre el ticket o factura como justificante.")}</p>
          <p>
            {t("Si el producto presenta un defecto de fabricación, contáctanos lo antes posible. Gestionaremos directamente la reparación, sustitución o devolución conforme a la ley y a los acuerdos con la marca fabricante.")}</p>

          <h2>{t("8. Reclamaciones")}</h2>
          <p>
            {t("Disponemos de hojas de reclamaciones oficiales a disposición del consumidor en la tienda física. También puedes contactar con la Oficina Municipal de Información al Consumidor (OMIC) correspondiente o con la Dirección General de Consumo de la Junta de Extremadura.")}</p>
          <p>
            {t("Consulta las vías de resolución extrajudicial de conflictos de consumo en el portal oficial de la Comisión Europea:")}{tx(" ")}
            <a
              href="https://consumer-redress.ec.europa.eu/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Resolución de conflictos de consumo en la Unión Europea")}</a>
            .
          </p>

          <h2>{t("9. Legislación aplicable y jurisdicción")}</h2>
          <p>
            {t("Estas condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a los Juzgados y Tribunales del domicilio del consumidor cuando este actúe como tal y, en otro caso, a los de Badajoz.")}</p>

          <h2>{t("10. Documentación complementaria")}</h2>
          <p>
            {t("Las presentes condiciones se completan con el")}{tx(" ")}
            <Link href="/aviso-legal">{t("aviso legal")}</Link>{t(", la")}{tx(" ")}
            <Link href="/politica-privacidad">{t("política de privacidad")}</Link> {t("y la")}{tx(" ")}
            <Link href="/politica-cookies">{t("política de cookies")}</Link> {t("de este Sitio.")}</p>
        </div>
      </article>
    </>
  );
}

export default withLocalePage(CondicionesPage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
