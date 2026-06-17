/**
 * /checkout/success
 *
 * Página de confirmación. Stripe redirige aquí tras el checkout con
 * ?session_id=cs_xxx. VERIFICAMOS el pago real en Stripe antes de confirmar
 * nada: sin esta comprobación, cualquiera que aterrice con un session_id (o que
 * vuelva atrás sin pagar) vería "pedido confirmado".
 *
 * Solo vaciamos el carrito cuando el pago está confirmado.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { getStripe } from "@/lib/stripe/client";
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

  // Estado de pago REAL desde Stripe. Solo "paid" (o "no_payment_required")
  // cuenta como confirmado; "unpaid" / sesión inválida → NO confirmado.
  let paid = false;
  if (session_id) {
    const stripe = getStripe();
    if (stripe) {
      try {
        const s = await stripe.checkout.sessions.retrieve(session_id);
        paid =
          s.payment_status === "paid" ||
          s.payment_status === "no_payment_required";
      } catch {
        // sesión inexistente / Stripe no disponible → tratamos como no pagado
      }
    }
  }

  // Pago NO confirmado: ni vaciamos el carrito ni decimos "confirmado".
  if (!paid) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
          <Clock
            className="h-12 w-12 text-amber-500"
            aria-hidden
            strokeWidth={1.5}
          />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-zs-blue-900 sm:text-4xl">
          Pago no completado
        </h1>
        <p className="mt-3 text-lg font-semibold text-zs-blue-900">
          Todavía no hemos podido confirmar tu pago.
        </p>
        <p className="mt-2 text-sm text-zs-muted">
          Si cerraste la pasarela o el pago no llegó a procesarse, tu carrito
          sigue intacto: puedes intentarlo de nuevo. Si crees que es un error,
          escríbenos por WhatsApp y lo revisamos.
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
            Ir al inicio
          </Link>
        </div>
      </section>
    );
  }

  // Pago confirmado → ahora sí vaciamos el carrito y confirmamos.
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center">
      {/* Vaciamos el carrito en cliente al montar (solo si está pagado) */}
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
