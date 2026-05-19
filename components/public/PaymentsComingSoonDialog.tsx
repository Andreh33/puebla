"use client";

import { MessageCircle, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";

/**
 * Modal "Pagos próximamente" — se dispara desde cualquier "Comprar" / "Añadir al
 * carrito" durante el MVP. Ofrece dos vías: WhatsApp y visita a tienda.
 *
 * Cuando Stripe se active en fase 2, este componente queda como fallback en caso
 * de error de pago.
 */
type Props = {
  productName?: string;
  size?: string;
  trigger: React.ReactNode;
};

export function PaymentsComingSoonDialog({ productName, size, trigger }: Props) {
  const message = productName
    ? WhatsAppMessages.reservation(productName, size)
    : WhatsAppMessages.generic();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pagos online próximamente</DialogTitle>
          <DialogDescription>
            Estamos terminando de habilitar la pasarela de pago online. Mientras tanto
            te ofrecemos dos opciones, las dos rápidas:
          </DialogDescription>
        </DialogHeader>

        <ul className="my-3 space-y-3 text-sm">
          <li className="flex items-start gap-3 rounded-xl border border-zs-border bg-zs-surface p-3">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-zs-ink">Reserva por WhatsApp</p>
              <p className="text-zs-muted">
                Te lo apartamos y pasas a recogerlo cuando te venga bien.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-xl border border-zs-border bg-zs-surface p-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-zs-blue-700" />
            <div>
              <p className="font-semibold text-zs-ink">Visítanos en tienda</p>
              <p className="text-zs-muted">
                C. Silos, 3, Puebla de la Calzada. L–V 10–14 y 17–20, sábado 10–14.
              </p>
            </div>
          </li>
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={whatsappUrl(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]"
          >
            <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
          </a>
          <a
            href="https://maps.google.com/?q=C.+Silos,+3,+06490+Puebla+de+la+Calzada,+Badajoz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
          >
            <MapPin className="h-4 w-4" /> Cómo llegar
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
