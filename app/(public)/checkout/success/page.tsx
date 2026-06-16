/**
 * /checkout/success
 *
 * Página de confirmación de compra. Stripe redirige aquí tras un pago exitoso
 * con ?session_id=cs_xxx. Vacía el carrito del navegador al montar.
 *
 * El vaciado del carrito se hace en un client component para poder acceder a
 * localStorage (el carrito es client-only).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { ClearCartOnMount } from "./ClearCartOnMount";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pedido confirmado — Zona Sport",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      {/* Vaciamos el carrito en cliente al montar esta página */}
      <ClearCartOnMount />

      <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle2
          className="h-12 w-12 text-emerald-500"
          aria-hidden
          strokeWidth={1.5}
        />
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
        ¡Gracias por tu compra! 🎉
      </h1>
      <p className="mt-3 text-lg font-semibold text-zs-blue-900">
        Tu pedido está confirmado.
      </p>
      <p className="mt-2 text-sm text-zs-muted">
        Te hemos enviado un email con los detalles. Si tienes cualquier duda,
        escríbenos por WhatsApp o llámanos a la tienda.
      </p>

      {session_id && (
        <p className="mt-4 text-[11px] text-zs-muted/60">
          Referencia: <span className="font-mono">{session_id}</span>
        </p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zs-blue-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800"
        >
          Seguir comprando
        </Link>
        <Link
          href="/marcas"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-ink transition hover:bg-zs-surface"
        >
          Ver más productos
        </Link>
      </div>
    </section>
  );
}
