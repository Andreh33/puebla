"use client";

import * as React from "react";
import { toast } from "sonner";
import { Search, Plus, Trash2, Receipt, MessageCircle, CreditCard, ImageOff } from "lucide-react";
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

  function addToCart(p: PosSearchResult, size: string | null) {
    setCart((c) => [
      ...c,
      {
        key: `${p.id}-${size ?? "u"}-${Date.now()}`,
        productId: p.id, name: p.name, family: p.family,
        size, sizes: p.sizes, productStock: p.productStock,
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

  // Cada talla es su propia fila en el buscador ("Talla 42 — Nombre" + foto).
  // Los accesorios sin tallas quedan en una sola fila con la talla a null.
  type SearchRow = { product: PosSearchResult; size: string | null; stock: number };
  const searchRows: SearchRow[] = results.flatMap<SearchRow>((p) =>
    p.sizes.length > 0
      ? p.sizes.map((s) => ({ product: p, size: s.size, stock: s.stock }))
      : [{ product: p, size: null, stock: p.productStock }],
  );

  return (
    <section className="mb-10 rounded-2xl border border-zs-border bg-white p-4 shadow-sm sm:p-6">
      <h2 className="mb-1 font-display text-lg font-bold text-zs-blue-900">Venta en tienda (TPV físico)</h2>
      <p className="mb-4 text-sm text-zs-muted">
        Busca productos, descuenta stock y emite el comprobante. El pago es presencial.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, SKU, modelo o EAN…" className="pl-9" />
        {searchRows.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-[26rem] w-full overflow-auto rounded-xl border border-zs-border bg-white shadow-lg">
            {searchRows.map(({ product: p, size, stock }) => {
              const outOfStock = stock <= 0;
              return (
                <li key={`${p.id}-${size ?? "u"}`}>
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={() => addToCart(p, size)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zs-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zs-border bg-zs-surface">
                      {p.mainImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.mainImageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-zs-muted">
                          <ImageOff className="h-5 w-5" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-zs-blue-900">
                        {size ? (
                          <span className="text-zs-red-600">Talla {size}</span>
                        ) : (
                          <span className="text-zs-muted">Sin tallas</span>
                        )}
                        {" — "}
                        {p.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-zs-muted">
                        {p.baseSku} · {formatPriceEUR(p.unitPrice)} ·{" "}
                        {outOfStock ? "sin stock" : `${stock} en stock`}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-zs-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {searching && <p className="mt-1 text-xs text-zs-muted">Buscando…</p>}
      </div>

      {cart.length > 0 && (
        <div className="mt-4 space-y-2">
          {cart.map((l) => (
            <div key={l.key} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-zs-border p-2 text-sm">
              <div className="col-span-12 sm:col-span-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-zs-muted">Producto</span>
                <p className="truncate font-medium" title={l.name}>{l.name}</p>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-zs-muted">Talla</span>
                {l.sizes.length > 0 ? (
                  <Select value={l.size ?? ""} onValueChange={(v) => patch(l.key, { size: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Talla" /></SelectTrigger>
                    <SelectContent>
                      {l.sizes.map((s) => (
                        <SelectItem key={s.size} value={s.size} disabled={s.stock <= 0}>
                          {s.size} ({s.stock} en stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="flex h-9 items-center text-xs text-zs-muted">Sin tallas · {l.productStock} ud.</p>
                )}
              </div>
              <div className="col-span-6 sm:col-span-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-zs-muted">Unidades</span>
                <Input type="number" min={1} value={l.quantity} aria-label="Unidades"
                  onChange={(e) => patch(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-9" />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-zs-muted">Precio (€/ud.)</span>
                <Input type="number" min={0} step="0.01" value={l.unitPrice} aria-label="Precio por unidad"
                  onChange={(e) => patch(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-9" />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-zs-muted">Dto. (€)</span>
                <Input type="number" min={0} step="0.01" value={l.lineDiscount} aria-label="Descuento de la línea"
                  onChange={(e) => patch(l.key, { lineDiscount: Math.max(0, Number(e.target.value) || 0) })}
                  className="h-9" />
              </div>
              <div className="col-span-12 flex items-center justify-between sm:col-span-2 sm:justify-end sm:gap-2">
                <div className="text-right">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-zs-muted">Subtotal</span>
                  <span className="font-semibold tabular-nums">{formatPriceEUR(lineSubtotal(l))}</span>
                </div>
                <button type="button" onClick={() => removeLine(l.key)} aria-label="Quitar línea"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zs-muted hover:bg-zs-surface hover:text-zs-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
