import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { CartView } from "./CartView";

export const metadata: Metadata = buildMetadata({
  title: "Tu carrito",
  description:
    "Revisa los productos que has seleccionado en Zona Sport. Reserva por WhatsApp y recoge en tienda en Puebla de la Calzada.",
  path: "/carrito",
  noIndex: true,
});

export default function CartPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
          Tu carrito
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zs-muted">
          Paga de forma segura con tarjeta, Bizum o a plazos con Klarna — o confirma
          tu reserva por WhatsApp.
        </p>
      </header>
      <CartView />
    </section>
  );
}
