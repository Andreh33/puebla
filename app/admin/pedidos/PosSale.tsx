"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Plus, Trash2, Receipt, MessageCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPriceEUR } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";
import {
  searchProductsForPos, createInStoreSaleAction, generateTicketAction,
  type PosSearchResult,
} from "./pos-actions";
import type { PaymentMethod } from "@/lib/pos/sale";

type CartLine = {
  key: string;
  productId: string;
  name: string;
  family: PosSearchResult["family"];
  size: string | null;
  sizes: PosSearchResult["sizes"];
  productStock: number;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
};

const IVA = 0.21;
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function PosSale() {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<PosSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [payment, setPayment] = React.useState<PaymentMethod>("efectivo");
  const [totalDiscount, setTotalDiscount] = React.useState(0);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [lastSale, setLastSale] = React.useState<{ orderId: string; ticketNumber: string } | null>(null);
  const [ticket, setTicket] = React.useState<{ url: string; text: string } | null>(null);

  React.useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await searchProductsForPos(q)); }
      catch { toast.error("Error buscando productos"); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  function addToCart(p: PosSearchResult) {
    const hasSizes = p.sizes.length > 0;
    const defaultSize = hasSizes ? (p.sizes.find((s) => s.stock > 0)?.size ?? p.sizes[0]!.size) : null;
    setCart((c) => [
      ...c,
      {
        key: `${p.id}-${defaultSize ?? "u"}-${Date.now()}`,
        productId: p.id, name: p.name, family: p.family,
        size: defaultSize, sizes: p.sizes, productStock: p.productStock,
        quantity: 1, unitPrice: p.unitPrice, lineDiscount: 0,
      },
    ]);
    setQ(""); setResults([]);
  }

  function patch(key: string, data: Partial<CartLine>) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, ...data } : l)));
  }
  function removeLine(key: string) { setCart((c) => c.filter((l) => l.key !== key)); }

  const lineSubtotal = (l: CartLine) => Math.max(0, round2(l.unitPrice * l.quantity - l.lineDiscount));
  const gross = cart.reduce((a, l) => a + lineSubtotal(l), 0);
  const total = Math.max(0, round2(gross - totalDiscount));
  const tax = round2(total - total / (1 + IVA));
  const base = round2(total - tax);

  async function registrar(generarTicket: boolean) {
    if (!cart.length) { toast.error("Carrito vacío"); return; }
    setSaving(true);
    try {
      const res = await createInStoreSaleAction({
        lines: cart.map((l) => ({
          productId: l.productId, size: l.size, quantity: l.quantity,
          unitPrice: l.unitPrice, lineDiscount: l.lineDiscount,
        })),
        paymentMethod: payment,
        totalDiscount,
        customer: { name: customerName || undefined, phone: customerPhone || undefined },
      });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(`Venta registrada (${res.ticketNumber}) · stock descontado`);
      setLastSale({ orderId: res.orderId, ticketNumber: res.ticketNumber });
      setTicket(null);
      setCart([]); setTotalDiscount(0);
      if (generarTicket) await generar(res.orderId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function generar(orderId: string) {
    const res = await generateTicketAction(orderId);
    if (!res.ok) { toast.error(res.error); return; }
    setTicket({ url: res.ticketUrl, text: res.text });
    toast.success("Ticket generado");
  }

  return (
    <section className="mb-10 rounded-2xl border border-zs-border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-1 font-display text-lg font-bold text-zs-blue-900">Venta en tienda (TPV físico)</h2>
      <p className="mb-4 text-sm text-zs-muted">
        Busca productos, descuenta stock y emite el comprobante. El pago es presencial.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, SKU, modelo o EAN…" className="pl-9" />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-zs-border bg-white shadow-lg">
            {results.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => addToCart(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-zs-surface">
                  <span className="truncate">{p.name} <span className="text-zs-muted">· {p.baseSku}</span></span>
                  <span className="flex items-center gap-2 text-zs-muted">
                    {formatPriceEUR(p.unitPrice)}
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searching && <p className="mt-1 text-xs text-zs-muted">Buscando…</p>}
      </div>

      {cart.length > 0 && (
        <div className="mt-4 space-y-2">
          {cart.map((l) => (
            <div key={l.key} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-zs-border p-2 text-sm">
              <span className="col-span-12 truncate font-medium sm:col-span-4">{l.name}</span>
              {l.sizes.length > 0 ? (
                <div className="col-span-4 sm:col-span-2">
                  <Select value={l.size ?? ""} onValueChange={(v) => patch(l.key, { size: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Talla" /></SelectTrigger>
                    <SelectContent>
                      {l.sizes.map((s) => (
                        <SelectItem key={s.size} value={s.size} disabled={s.stock <= 0}>
                          {s.size} ({s.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="col-span-4 text-xs text-zs-muted sm:col-span-2">Stock: {l.productStock}</span>
              )}
              <Input type="number" min={1} value={l.quantity} aria-label="Cantidad"
                onChange={(e) => patch(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                className="col-span-3 h-9 sm:col-span-1" />
              <Input type="number" min={0} step="0.01" value={l.unitPrice} aria-label="Precio"
                onChange={(e) => patch(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                className="col-span-3 h-9 sm:col-span-2" />
              <Input type="number" min={0} step="0.01" value={l.lineDiscount} aria-label="Descuento línea"
                onChange={(e) => patch(l.key, { lineDiscount: Math.max(0, Number(e.target.value) || 0) })}
                className="col-span-3 h-9 sm:col-span-1" placeholder="Dto." />
              <span className="col-span-2 text-right font-semibold tabular-nums sm:col-span-1">{formatPriceEUR(lineSubtotal(l))}</span>
              <button type="button" onClick={() => removeLine(l.key)} aria-label="Quitar"
                className="col-span-1 inline-flex justify-center text-zs-muted hover:text-zs-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-zs-muted">Método de pago</label>
            <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                <SelectItem value="bizum">Bizum</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Nombre del cliente (opcional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input placeholder="WhatsApp del cliente (ej. 34600111222)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
          <div className="space-y-1 rounded-xl border border-zs-border bg-zs-surface/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zs-muted">Descuento total</span>
              <Input type="number" min={0} step="0.01" value={totalDiscount}
                onChange={(e) => setTotalDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="h-8 w-28 text-right" />
            </div>
            <div className="flex justify-between"><span className="text-zs-muted">Base</span><span>{formatPriceEUR(base)}</span></div>
            <div className="flex justify-between"><span className="text-zs-muted">IVA (21%)</span><span>{formatPriceEUR(tax)}</span></div>
            <div className="flex justify-between border-t border-zs-border pt-1 text-base font-bold"><span>Total</span><span>{formatPriceEUR(total)}</span></div>
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={saving} onClick={() => registrar(false)}>
            Registrar venta y descontar stock
          </Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => registrar(true)}>
            <Receipt className="mr-2 h-4 w-4" /> Registrar + generar ticket
          </Button>
          <Button type="button" variant="outline" disabled title="Disponible al configurar Stripe">
            <CreditCard className="mr-2 h-4 w-4" /> Cobrar con Stripe
          </Button>
        </div>
      )}

      {lastSale && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-semibold text-emerald-900">Última venta: {lastSale.ticketNumber}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!ticket && (
              <Button type="button" size="sm" variant="outline" onClick={() => generar(lastSale.orderId)}>
                <Receipt className="mr-2 h-4 w-4" /> Generar ticket
              </Button>
            )}
            {ticket && (
              <>
                <a href={ticket.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-zs-border bg-white px-3 text-sm font-semibold hover:bg-zs-surface">
                  <Receipt className="h-4 w-4" /> Ver/Imprimir PDF
                </a>
                <a
                  href={customerPhone ? whatsappUrl(ticket.text, customerPhone) : "#"}
                  target="_blank" rel="noopener noreferrer"
                  aria-disabled={!customerPhone}
                  onClick={(e) => { if (!customerPhone) { e.preventDefault(); toast.error("Indica el WhatsApp del cliente"); } }}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-[#25D366] px-3 text-sm font-semibold text-white">
                  <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
