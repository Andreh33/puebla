"use client";

import * as React from "react";
import {
  User,
  Plus,
  SlidersHorizontal,
  Trash2,
  MoreVertical,
  StickyNote,
  ListPlus,
  Save,
  Ban,
  X,
  ShoppingCart,
  CreditCard,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPriceEUR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  searchCustomersAction,
  saveCustomerAction,
  type PosCustomer,
} from "@/app/admin/pedidos/pos-actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  cartTotals,
  lineSubtotal,
  type Cart,
  type CartLine,
  type CartMeta,
  type PaymentMethod,
} from "./pos-shared";

const GRID = "grid grid-cols-[2.75rem_1fr_4.25rem_4.75rem_1.75rem] items-center gap-2";

export function TicketPanel({
  cart,
  flashLineKey,
  onPatchLine,
  onRemoveLine,
  onSetCustomer,
  onSetNote,
  onSetMeta,
  onSetTotalDiscount,
  onSetPayment,
  onAnular,
  onNewCart,
  onSaveServer,
  onCheckout,
}: {
  cart: Cart;
  flashLineKey: string | null;
  onPatchLine: (key: string, data: Partial<CartLine>) => void;
  onRemoveLine: (key: string) => void;
  onSetCustomer: (name: string, phone: string) => void;
  onSetNote: (note: string) => void;
  onSetMeta: (meta: CartMeta[]) => void;
  onSetTotalDiscount: (n: number) => void;
  onSetPayment: (m: PaymentMethod) => void;
  onAnular: () => void;
  onNewCart: () => void;
  onSaveServer: () => void;
  onCheckout: () => void;
}) {
  const totals = cartTotals(cart);
  const empty = cart.lines.length === 0;
  const hasCustomer = !!(cart.customerName || cart.customerPhone);

  return (
    <div className="flex h-full w-full flex-col bg-white">
      {/* Cabecera: cliente + acciones */}
      <div className="flex items-center justify-between gap-2 border-b border-zs-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-semibold text-zs-muted">Cliente:</span>
          <CustomerPill cart={cart} onSetCustomer={onSetCustomer} hasCustomer={hasCustomer} />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onNewCart}
            title="Nuevo carrito"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zs-border text-zs-muted transition-colors hover:bg-zs-surface hover:text-zs-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
          <SettingsPopover cart={cart} onSetTotalDiscount={onSetTotalDiscount} onSetPayment={onSetPayment} />
        </div>
      </div>

      {/* Cabecera de tabla */}
      <div className={cn(GRID, "border-b border-zs-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-zs-muted")}>
        <span>Ctd.</span>
        <span>Nombre</span>
        <span className="text-right">Precio</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      {/* Líneas */}
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-zs-muted">
            <ShoppingCart className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">Carrito vacío</p>
            <p className="text-xs">Busca un producto, pulsa su foto y elige la talla para añadirlo.</p>
          </div>
        ) : (
          cart.lines.map((l) => (
            <TicketLine
              key={l.key}
              line={l}
              flash={flashLineKey === l.key}
              onPatch={onPatchLine}
              onRemove={onRemoveLine}
            />
          ))
        )}
      </div>

      {/* Totales */}
      <div className="border-t border-zs-border px-3 py-2 text-sm">
        <div className="flex justify-between py-0.5">
          <span className="text-zs-muted">Subtotal</span>
          <span className="tabular-nums">{formatPriceEUR(totals.gross)}</span>
        </div>
        {cart.totalDiscount > 0 && (
          <div className="flex justify-between py-0.5 text-zs-red-600">
            <span>Descuento</span>
            <span className="tabular-nums">−{formatPriceEUR(cart.totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between py-0.5 text-zs-muted">
          <span>Impuestos</span>
          <span className="tabular-nums">incl. IVA {formatPriceEUR(totals.tax)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-zs-border pt-1.5">
          <span className="font-display text-base font-bold text-zs-ink">Total</span>
          <span className="font-display text-xl font-bold tabular-nums text-zs-blue-900">
            {formatPriceEUR(totals.total)}
          </span>
        </div>
      </div>

      {/* Botones secundarios */}
      <div className="grid grid-cols-3 gap-2 px-3 pb-2">
        <NotePopover note={cart.note} onSetNote={onSetNote} />
        <MetaDialog meta={cart.meta} onSetMeta={onSetMeta} />
        <button
          type="button"
          onClick={onSaveServer}
          disabled={empty}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zs-border bg-white px-2 text-xs font-semibold text-zs-ink transition-colors hover:bg-zs-surface disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> Guardar
        </button>
      </div>

      {/* Anular / Pagar */}
      <div className="grid grid-cols-[1fr_1.6fr] gap-2 border-t border-zs-border bg-zs-surface/50 p-3">
        <AnularButton disabled={empty} onAnular={onAnular} />
        <button
          type="button"
          onClick={onCheckout}
          disabled={empty}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CreditCard className="h-5 w-5" />
          Pagar {formatPriceEUR(totals.total)}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Línea -- */

function TicketLine({
  line,
  flash,
  onPatch,
  onRemove,
}: {
  line: CartLine;
  flash: boolean;
  onPatch: (key: string, data: Partial<CartLine>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div
      className={cn(
        GRID,
        "border-b border-zs-border px-3 py-2 transition-colors duration-700",
        flash && "bg-emerald-50",
      )}
    >
      {/* Cantidad */}
      <input
        type="number"
        min={1}
        value={line.quantity}
        aria-label="Cantidad"
        onChange={(e) => onPatch(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
        className="h-9 w-full rounded-lg border border-zs-border text-center text-sm tabular-nums outline-none focus:border-zs-blue-700"
      />

      {/* Nombre + talla + menú */}
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="truncate text-sm font-semibold text-zs-ink" title={line.name}>
            {line.name}
          </p>
          <LineMenu line={line} onPatch={onPatch} onRemove={onRemove} />
        </div>
        <p className="text-xs text-zs-muted">
          {line.colorName && line.colorName !== "Único" && (
            <span className="font-medium text-zs-blue-700">{line.colorName} · </span>
          )}
          {line.size ? (
            <>
              Talla <span className="font-semibold text-zs-red-600">{line.size}</span>
            </>
          ) : (
            "Sin tallas"
          )}
          {line.lineDiscount > 0 && (
            <span className="ml-1.5 text-zs-red-600">· −{formatPriceEUR(line.lineDiscount)}</span>
          )}
        </p>
      </div>

      {/* Precio */}
      <input
        type="number"
        min={0}
        step="0.01"
        value={line.unitPrice}
        aria-label="Precio por unidad"
        onChange={(e) => onPatch(line.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
        className="h-9 w-full rounded-lg border border-zs-border px-1.5 text-right text-sm tabular-nums outline-none focus:border-zs-blue-700"
      />

      {/* Total línea */}
      <span className="text-right text-sm font-semibold tabular-nums text-zs-ink">
        {formatPriceEUR(lineSubtotal(line))}
      </span>

      {/* Quitar */}
      <button
        type="button"
        onClick={() => onRemove(line.key)}
        aria-label="Quitar línea"
        className="inline-flex h-7 w-7 items-center justify-center justify-self-end rounded-full bg-zs-red-600 text-white transition-colors hover:bg-zs-red-700"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function LineMenu({
  line,
  onPatch,
  onRemove,
}: {
  line: CartLine;
  onPatch: (key: string, data: Partial<CartLine>) => void;
  onRemove: (key: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasSizes = line.sizes.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Opciones de la línea"
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-zs-muted hover:bg-zs-surface hover:text-zs-ink"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-3">
        {hasSizes && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zs-muted">
              Cambiar talla
            </p>
            <div className="flex flex-wrap gap-1.5">
              {line.sizes.map((s) => {
                const out = s.stock <= 0;
                const sel = line.size === s.size;
                return (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => onPatch(line.key, { size: s.size })}
                    title={out ? `Sin stock (${s.stock})` : `${s.stock} en stock`}
                    className={cn(
                      "min-w-[2.25rem] rounded-lg border px-2 py-1 text-sm font-semibold",
                      sel
                        ? "border-zs-blue-700 bg-zs-blue-50 text-zs-blue-900"
                        : out
                          ? "border-amber-300 bg-amber-50 text-amber-700"
                          : "border-zs-border hover:bg-zs-surface",
                    )}
                  >
                    {s.size}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zs-muted">
            Descuento de línea (€)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={line.lineDiscount}
            onChange={(e) =>
              onPatch(line.key, { lineDiscount: Math.max(0, Number(e.target.value) || 0) })
            }
            className="h-9 w-full rounded-lg border border-zs-border px-2.5 text-sm outline-none focus:border-zs-blue-700"
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => {
            onRemove(line.key);
            setOpen(false);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Quitar del ticket
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------- Cliente -- */

function CustomerPill({
  cart,
  hasCustomer,
  onSetCustomer,
}: {
  cart: Cart;
  hasCustomer: boolean;
  onSetCustomer: (name: string, phone: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(cart.customerName);
  const [phone, setPhone] = React.useState(cart.customerPhone);
  const [results, setResults] = React.useState<PosCustomer[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Al abrir: precarga los campos con el cliente del ticket vigente.
  React.useEffect(() => {
    if (open) {
      setName(cart.customerName);
      setPhone(cart.customerPhone);
    }
  }, [open, cart.customerName, cart.customerPhone]);

  // Busca en la libreta según el campo Nombre (debounce 250 ms). Vacío = recientes.
  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      searchCustomersAction(name.trim())
        .then((rows) => alive && setResults(rows))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [open, name]);

  function pick(c: PosCustomer) {
    onSetCustomer(c.name, c.phone ?? "");
    setOpen(false);
  }

  function attachOnly() {
    onSetCustomer(name.trim(), phone.trim());
    setOpen(false);
  }

  async function save() {
    const n = name.trim();
    const p = phone.trim();
    if (!n && !p) {
      toast.error("Indica al menos el nombre o el WhatsApp");
      return;
    }
    setSaving(true);
    try {
      const res = await saveCustomerAction({ name: n, phone: p });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onSetCustomer(res.customer.name, res.customer.phone ?? "");
      toast.success("Cliente guardado en la libreta");
      setOpen(false);
    } catch {
      toast.error("No se pudo guardar el cliente");
    } finally {
      setSaving(false);
    }
  }

  const showResults = loading || results.length > 0 || name.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
            hasCustomer
              ? "border-zs-blue-700 bg-zs-blue-50 text-zs-blue-900"
              : "border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{hasCustomer ? cart.customerName || cart.customerPhone : "Invitado"}</span>
          {hasCustomer && (
            <X
              className="h-3 w-3 opacity-70"
              role="button"
              aria-label="Quitar cliente"
              onClick={(e) => {
                e.stopPropagation();
                onSetCustomer("", "");
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zs-muted">Cliente</p>

        {/* Nombre — también busca en la libreta de clientes guardados */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zs-muted" />
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (o busca uno guardado)"
            className="h-9 w-full rounded-lg border border-zs-border pl-8 pr-2.5 text-sm outline-none focus:border-zs-blue-700"
          />
        </div>

        {/* Desplegable de la libreta */}
        {showResults && (
          <div className="max-h-36 overflow-y-auto scrollbar-thin rounded-lg border border-zs-border">
            {loading ? (
              <p className="px-2.5 py-2 text-xs text-zs-muted">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-zs-muted">
                {name.trim()
                  ? "Sin coincidencias — pulsa Guardar para crearlo."
                  : "Aún no hay clientes guardados."}
              </p>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-2 border-b border-zs-border px-2.5 py-1.5 text-left last:border-0 hover:bg-zs-surface"
                >
                  <User className="h-3.5 w-3.5 shrink-0 text-zs-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zs-ink">{c.name}</span>
                  {c.phone && <span className="shrink-0 text-xs tabular-nums text-zs-muted">{c.phone}</span>}
                </button>
              ))
            )}
          </div>
        )}

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp (34600111222)"
          inputMode="tel"
          className="h-9 w-full rounded-lg border border-zs-border px-2.5 text-sm outline-none focus:border-zs-blue-700"
        />

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <Button type="button" variant="outline" size="sm" onClick={attachOnly}>
            Solo este ticket
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SettingsPopover({
  cart,
  onSetTotalDiscount,
  onSetPayment,
}: {
  cart: Cart;
  onSetTotalDiscount: (n: number) => void;
  onSetPayment: (m: PaymentMethod) => void;
}) {
  const methods: PaymentMethod[] = ["efectivo", "tarjeta", "bizum"];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Ajustes del pedido"
          className={cn(
            "relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zs-border text-zs-muted transition-colors hover:bg-zs-surface hover:text-zs-blue-700",
            cart.totalDiscount > 0 && "border-zs-blue-700 text-zs-blue-700",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zs-muted">
            Descuento total (€)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={cart.totalDiscount}
            onChange={(e) => onSetTotalDiscount(Math.max(0, Number(e.target.value) || 0))}
            className="h-9 w-full rounded-lg border border-zs-border px-2.5 text-sm outline-none focus:border-zs-blue-700"
          />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zs-muted">
            Método de pago por defecto
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {methods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSetPayment(m)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize transition-colors",
                  cart.payment === m
                    ? "border-zs-blue-700 bg-zs-blue-50 text-zs-blue-900"
                    : "border-zs-border hover:bg-zs-surface",
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------------------------------------- Nota/Meta -- */

function NotePopover({ note, onSetNote }: { note: string; onSetNote: (n: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(note);
  React.useEffect(() => {
    if (open) setDraft(note);
  }, [open, note]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-white px-2 text-xs font-semibold transition-colors hover:bg-zs-surface",
            note ? "border-zs-blue-700 text-zs-blue-700" : "border-zs-border text-zs-ink",
          )}
        >
          <StickyNote className="h-3.5 w-3.5" /> Nota
          {note && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-zs-blue-700" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zs-muted">Nota del pedido</p>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Observaciones (sale en el ticket)…"
          className="w-full rounded-lg border border-zs-border p-2 text-sm outline-none focus:border-zs-blue-700"
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={() => {
            onSetNote(draft.trim());
            setOpen(false);
          }}
        >
          Guardar nota
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function MetaDialog({ meta, onSetMeta }: { meta: CartMeta[]; onSetMeta: (m: CartMeta[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<CartMeta[]>(meta);
  React.useEffect(() => {
    if (open) setRows(meta.length ? meta : [{ key: "", value: "" }]);
  }, [open, meta]);

  function update(i: number, patch: Partial<CartMeta>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-white px-2 text-xs font-semibold transition-colors hover:bg-zs-surface",
          meta.length ? "border-zs-blue-700 text-zs-blue-700" : "border-zs-border text-zs-ink",
        )}
      >
        <ListPlus className="h-3.5 w-3.5" /> Meta
        {meta.length > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-zs-blue-700 px-1 text-[9px] text-white">
            {meta.length}
          </span>
        )}
      </button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meta del pedido</DialogTitle>
          <DialogDescription>
            Campos extra que se guardan con la venta (vendedor, origen, referencia…).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={row.key}
                onChange={(e) => update(i, { key: e.target.value })}
                placeholder="Campo"
                className="h-9 w-1/3 rounded-lg border border-zs-border px-2.5 text-sm outline-none focus:border-zs-blue-700"
              />
              <input
                value={row.value}
                onChange={(e) => update(i, { value: e.target.value })}
                placeholder="Valor"
                className="h-9 flex-1 rounded-lg border border-zs-border px-2.5 text-sm outline-none focus:border-zs-blue-700"
              />
              <button
                type="button"
                onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                aria-label="Quitar campo"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zs-muted hover:bg-zs-surface hover:text-zs-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((r) => [...r, { key: "", value: "" }])}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zs-blue-700 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Añadir campo
          </button>
        </div>
        <Button
          type="button"
          onClick={() => {
            onSetMeta(rows.filter((r) => r.key.trim() || r.value.trim()));
            setOpen(false);
          }}
        >
          Guardar meta
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function AnularButton({ disabled, onAnular }: { disabled: boolean; onAnular: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-zs-red-600 text-sm font-bold text-white shadow-sm transition-colors hover:bg-zs-red-700 active:bg-zs-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban className="h-4 w-4" /> Anular
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2">
        <p className="text-sm font-semibold text-zs-ink">¿Anular el ticket?</p>
        <p className="text-xs text-zs-muted">Se vaciarán las líneas, el cliente y la nota.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => {
              onAnular();
              setOpen(false);
            }}
          >
            Sí, anular
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
