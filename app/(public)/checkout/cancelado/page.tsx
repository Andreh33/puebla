/**
 * /checkout/cancelado
 *
 * Página de cancelación de pago. Stripe redirige aquí cuando el usuario
 * abandona el checkout sin completar el pago. El carrito NO se vacía para
 * que el usuario pueda intentarlo de nuevo.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Pago cancelado — Zona Sport",
  robots: { index: false, follow: false },
};

export default function CheckoutCanceladoPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-zs-surface">
        <XCircle
          className="h-12 w-12 text-zs-muted"
          aria-hidden
          strokeWidth={1.5}
        />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
        Pago cancelado
      </h1>
      <p className="mt-3 text-base text-zs-muted">
        No se ha realizado ningún cargo. Tus artículos siguen en el carrito
        por si quieres intentarlo de nuevo.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/carrito"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zs-blue-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800"
        >
          Volver al carrito
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-ink transition hover:bg-zs-surface"
        >
          Seguir comprando
        </Link>
      </div>
    </section>
  );
}
