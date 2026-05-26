"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Receipt,
  MessageCircle,
  Loader2,
  CheckCircle2,
  Printer,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatPriceEUR } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";
import {
  createInStoreSaleAction,
  generateTicketAction,
} from "@/app/admin/pedidos/pos-actions";
import { cartTotals, type Cart, type PaymentMethod } from "./pos-shared";

const METHODS: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
  { value: "efectivo", label: "Efectivo", icon: <Banknote className="h-4 w-4" /> },
  { value: "tarjeta", label: "Tarjeta", icon: <CreditCard className="h-4 w-4" /> },
  { value: "bizum", label: "Bizum", icon: <Smartphone className="h-4 w-4" /> },
];

type Done = { orderId: string; ticketNumber: string; ticket: { url: string; text: string } | null };

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cart: Cart;
  onCompleted: () => void;
}) {
  const totals = cartTotals(cart);
  const [payment, setPayment] = React.useState<PaymentMethod>(cart.payment);
  const [name, setName] = React.useState(cart.customerName);
  const [phone, setPhone] = React.useState(cart.customerPhone);
  const [saving, setSaving] = React.useState<null | "plain" | "ticket">(null);
  const [done, setDone] = React.useState<Done | null>(null);

  // Reinicia el formulario cada vez que se abre con el carrito vigente.
  React.useEffect(() => {
    if (open) {
      setPayment(cart.payment);
      setName(cart.customerName);
      setPhone(cart.customerPhone);
      setDone(null);
      setSaving(null);
    }
  }, [open, cart.payment, cart.customerName, cart.customerPhone]);

  async function register(withTicket: boolean) {
    if (!cart.lines.length) {
      toast.error("El carrito está vacío");
      return;
    }
    setSaving(withTicket ? "ticket" : "plain");
    try {
      const res = await createInStoreSaleAction({
        lines: cart.lines.map((l) => ({
          productId: l.productId,
          size: l.size,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineDiscount: l.lineDiscount,
        })),
        paymentMethod: payment,
        totalDiscount: cart.totalDiscount,
        customer: { name: name || undefined, phone: phone || undefined },
        note: cart.note || undefined,
        meta: cart.meta.length ? cart.meta : undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Venta registrada · ${res.ticketNumber} · stock descontado`);
      let ticket: Done["ticket"] = null;
      if (withTicket) {
        const t = await generateTicketAction(res.orderId);
        if (t.ok) {
          ticket = { url: t.ticketUrl, text: t.text };
          toast.success("Ticket generado");
        } else {
          toast.error(t.error);
        }
      }
      setDone({ orderId: res.orderId, ticketNumber: res.ticketNumber, ticket });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar la venta");
    } finally {
      setSaving(null);
    }
  }

  function finishAndClear() {
    onCompleted();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (saving ? null : onOpenChange(v))}>
      <DialogContent className="max-w-md">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Venta registrada
              </DialogTitle>
              <DialogDescription>
                Ticket <strong className="text-zs-ink">{done.ticketNumber}</strong> · stock
                descontado.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Total cobrado</p>
              <p className="font-display text-3xl font-bold text-emerald-900">
                {formatPriceEUR(totals.total)}
              </p>
            </div>

            <div className="grid gap-2">
              {done.ticket ? (
                <>
                  <a
                    href={done.ticket.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
                  >
                    <Printer className="h-4 w-4" /> Ver / Imprimir PDF
                  </a>
                  <a
                    href={phone ? whatsappUrl(done.ticket.text, phone) : "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!phone}
                    onClick={(e) => {
                      if (!phone) {
                        e.preventDefault();
                        toast.error("Indica el WhatsApp del cliente para enviar el ticket");
                      }
                    }}
                    className={cn(
                      "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white",
                      phone ? "bg-[#25D366] hover:bg-[#1ebe57]" : "cursor-not-allowed bg-[#25D366]/50",
                    )}
                  >
                    <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                  </a>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={async () => {
                    const t = await generateTicketAction(done.orderId);
                    if (t.ok) {
                      setDone({ ...done, ticket: { url: t.ticketUrl, text: t.text } });
                      toast.success("Ticket generado");
                    } else {
                      toast.error(t.error);
                    }
                  }}
                >
                  <Receipt className="h-4 w-4" /> Generar ticket
                </Button>
              )}
              <Button type="button" className="h-11" onClick={finishAndClear}>
                <ShoppingBag className="h-4 w-4" /> Nueva venta
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cobrar venta</DialogTitle>
              <DialogDescription>
                {totals.units} {totals.units === 1 ? "artículo" : "artículos"} · pago presencial en
                caja.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-zs-border bg-zs-surface/60 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-zs-muted">Total a cobrar</p>
              <p className="font-display text-3xl font-bold text-zs-blue-900">
                {formatPriceEUR(totals.total)}
              </p>
              <p className="mt-0.5 text-xs text-zs-muted">IVA incluido {formatPriceEUR(totals.tax)}</p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zs-muted">
                Método de pago
              </p>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayment(m.value)}
                    className={cn(
                      "inline-flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors",
                      payment === m.value
                        ? "border-zs-blue-700 bg-zs-blue-50 text-zs-blue-900 ring-1 ring-zs-blue-700"
                        : "border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cliente (opcional)"
                className="h-10 rounded-xl border border-zs-border px-3 text-sm outline-none focus:border-zs-blue-700"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp (34600…)"
                inputMode="tel"
                className="h-10 rounded-xl border border-zs-border px-3 text-sm outline-none focus:border-zs-blue-700"
              />
            </div>

            <div className="grid gap-2">
              <Button
                type="button"
                className="h-12 bg-emerald-600 text-base hover:bg-emerald-700 active:bg-emerald-800"
                disabled={saving != null}
                onClick={() => register(false)}
              >
                {saving === "plain" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Banknote className="h-5 w-5" />
                )}
                Registrar venta y descontar stock
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={saving != null}
                onClick={() => register(true)}
              >
                {saving === "ticket" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4" />
                )}
                Registrar + generar ticket
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
