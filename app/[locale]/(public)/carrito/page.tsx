import { t } from "@/lib/i18n/dictionaries";
import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { CartView } from "./CartView";

 const baseMetadata: Metadata = buildMetadata({
  title: "Tu carrito",
  description:
    "Revisa los productos que has seleccionado en Zona Sport. Reserva por WhatsApp y recoge en tienda en Puebla de la Calzada.",
  path: "/carrito",
  noIndex: true,
});

  function CartPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
          {t("Tu carrito")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-zs-muted">
          {t("Paga de forma segura con tarjeta, Bizum o a plazos con Klarna — o confirma tu reserva por WhatsApp.")}</p>
      </header>
      <CartView />
    </section>
  );
}

export default withLocalePage(CartPage);
export const generateMetadata = withLocaleMetadata(baseMetadata);
