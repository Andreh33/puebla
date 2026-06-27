"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  RefreshCw,
  Search,
} from "lucide-react";
import { formatDateTimeES, formatPriceEUR, truncate } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderDetail, OrderSummary } from "@/lib/stripe/types";
import {
  exportOrdersCsv,
  getOrderDetail,
  issueInvoiceAction,
  returnOrderItem,
  syncCatalogToStripe,
  updateOrderStatus,
} from "./_actions";
import { computeItemReturn } from "@/lib/pos/returns";
import { FULFILLMENT_STATUSES } from "./constants";

const FULFILLMENT_LABELS: Record<(typeof FULFILLMENT_STATUSES)[number], string> = {
  PROCESSING: "Procesando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

function statusBadge(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="warning">Pendiente</Badge>;
    case "PAID":
      return <Badge variant="success">Pagado</Badge>;
    case "PROCESSING":
      return <Badge variant="default">Procesando</Badge>;
    case "SHIPPED":
      return <Badge variant="default">Enviado</Badge>;
    case "DELIVERED":
      return <Badge variant="success">Entregado</Badge>;
    case "CANCELLED":
      return <Badge variant="sale">Cancelado</Badge>;
    case "REFUNDED":
      return <Badge variant="secondary">Reembolsado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function deliveryLabel(method: string | null): string {
  if (method === "pickup") return "Recogida";
  if (method === "shipping") return "Envío";
  if (method === "in_store") return "TPV (tienda)";
  return "—";
}

interface Props {
  orders: OrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; status: OrderStatus | "ALL"; from: string; to: string };
  counts: Record<string, number>;
  role: "OWNER" | "EDITOR";
}

export function PedidosTable({
  orders,
  total,
  page,
  pageSize,
  filters,
  counts,
  role,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(filters.q);
  const [status, setStatus] = React.useState<OrderStatus | "ALL">(filters.status);
  const [from, setFrom] = React.useState(filters.from);
  const [to, setTo] = React.useState(filters.to);
  const [exporting, setExporting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [selected, setSelected] = React.useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<
    (typeof FULFILLMENT_STATUSES)[number] | ""
  >("");
  const [note, setNote] = React.useState("");
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [fiscal, setFiscal] = React.useState({ nif: "", name: "", address: "", city: "", cp: "" });
  const [issuing, setIssuing] = React.useState(false);
  // Devolución por línea (solo TPV): qué línea se está devolviendo y cuántas uds.
  const [returningItemId, setReturningItemId] = React.useState<string | null>(null);
  const [returnQty, setReturnQty] = React.useState(1);
  const [returningBusy, setReturningBusy] = React.useState(false);

  // Un pedido admite devolución por línea solo si es venta de TPV y no está ya
  // cancelado/reembolsado. Las devoluciones se acumulan en selected.returns.
  const isTpv = selected?.deliveryMethod === "in_store";
  const orderReturnable =
    !!selected && isTpv && selected.status !== "CANCELLED" && selected.status !== "REFUNDED";
  const returnedByItem = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of selected?.returns ?? []) m.set(r.itemId, (m.get(r.itemId) ?? 0) + r.qty);
    return m;
  }, [selected]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "ALL") params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/pedidos?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/admin/pedidos?${params.toString()}`);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportOrdersCsv({ q, status, from, to });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data!.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data!.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setExporting(false);
    }
  }

  async function handleSync() {
    if (!confirm("¿Sincronizar el catálogo actual con Stripe? Esto creará/actualizará productos en Stripe.")) {
      return;
    }
    setSyncing(true);
    try {
      const res = await syncCatalogToStripe();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const r = res.data!;
      toast.success(
        `Sincronización completada: ${r.created} creados, ${r.updated} actualizados, ${r.errors.length} errores`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setSyncing(false);
    }
  }

  async function openDetail(id: string) {
    setLoadingDetail(true);
    setNewStatus("");
    setNote("");
    setFiscal({ nif: "", name: "", address: "", city: "", cp: "" });
    try {
      const res = await getOrderDetail(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSelected(res.data!);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleUpdateStatus() {
    if (!selected || !newStatus) return;
    if (
      newStatus === "CANCELLED" &&
      !confirm(
        "¿Cancelar este pedido? Si ya había descontado stock, se restaurará automáticamente.",
      )
    ) {
      return;
    }
    setUpdatingStatus(true);
    try {
      const res = await updateOrderStatus(selected.id, newStatus, note);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Estado actualizado a ${FULFILLMENT_LABELS[newStatus]}`);
      // Refresca el detalle abierto y el listado de fondo.
      const fresh = await getOrderDetail(selected.id);
      if (fresh.ok) setSelected(fresh.data!);
      setNote("");
      setNewStatus("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Cancela una venta del TPV (in_store) en un clic y devuelve su stock al
  // inventario. Reutiliza updateOrderStatus → "CANCELLED", que restaura el stock
  // porque la venta se creó en PAID. Solo se ofrece para ventas del TPV: los
  // pedidos online se cancelan/reembolsan desde Stripe, que es quien repone su
  // stock (así no se descuadra el dinero con el inventario).
  async function cancelOrder(orderId: string) {
    if (
      !confirm(
        "¿Cancelar esta venta del TPV? Se devolverá al inventario el stock que descontó.",
      )
    ) {
      return;
    }
    setCancellingId(orderId);
    try {
      const res = await updateOrderStatus(orderId, "CANCELLED");
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Venta cancelada · stock devuelto al inventario");
      // Si el modal está abierto sobre este mismo pedido, refresca su detalle.
      if (selected?.id === orderId) {
        const fresh = await getOrderDetail(orderId);
        if (fresh.ok) setSelected(fresh.data!);
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setCancellingId(null);
    }
  }

  // Devuelve `qty` unidades de una línea de una venta TPV: repone su stock y la
  // descuenta del total. Solo TPV; no toca Stripe ni Holded. Si era la última
  // unidad del pedido, este queda cancelado.
  async function handleReturnItem(itemId: string, qty: number) {
    if (!selected) return;
    setReturningBusy(true);
    try {
      const res = await returnOrderItem(selected.id, itemId, qty);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Devuelto · ${formatPriceEUR(res.data?.refundedAmount ?? 0)} · stock repuesto`,
      );
      if (res.data?.warning) toast(res.data.warning);
      setReturningItemId(null);
      const fresh = await getOrderDetail(selected.id);
      if (fresh.ok) setSelected(fresh.data!);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setReturningBusy(false);
    }
  }

  async function handleIssueInvoice() {
    if (!selected) return;
    if (
      !confirm(
        "¿Emitir la factura de este pedido en Holded? Si VeriFactu está activo se enviará a la AEAT y no se podrá borrar (solo rectificar).",
      )
    ) {
      return;
    }
    setIssuing(true);
    try {
      const res = await issueInvoiceAction(selected.id, fiscal);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Factura emitida${res.data?.invoiceNumber ? `: ${res.data.invoiceNumber}` : ""}`,
      );
      if (res.data?.warning) toast(res.data.warning);
      const fresh = await getOrderDetail(selected.id);
      if (fresh.ok) setSelected(fresh.data!);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setIssuing(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input
            placeholder="Buscar (email, nombre, session_id)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as OrderStatus | "ALL")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos ({total})</SelectItem>
            <SelectItem value="PENDING">Pendientes ({counts.PENDING ?? 0})</SelectItem>
            <SelectItem value="PAID">Pagados ({counts.PAID ?? 0})</SelectItem>
            <SelectItem value="PROCESSING">Procesando ({counts.PROCESSING ?? 0})</SelectItem>
            <SelectItem value="SHIPPED">Enviados ({counts.SHIPPED ?? 0})</SelectItem>
            <SelectItem value="DELIVERED">Entregados ({counts.DELIVERED ?? 0})</SelectItem>
            <SelectItem value="CANCELLED">Cancelados ({counts.CANCELLED ?? 0})</SelectItem>
            <SelectItem value="REFUNDED">Reembolsados ({counts.REFUNDED ?? 0})</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Desde"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Hasta"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={applyFilters} type="button">
          <Search className="mr-2 h-4 w-4" /> Filtrar
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          type="button"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
        {role === "OWNER" && (
          <Button
            variant="secondary"
            onClick={handleSync}
            disabled={syncing}
            type="button"
            title="Crea o actualiza en Stripe los productos ACTIVE con stock > 0"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar catálogo con Stripe"}
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-zs-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zs-surface text-left text-xs uppercase text-zs-muted">
            <tr>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Envío</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-zs-muted" colSpan={7}>
                  Sin pedidos con esos criterios.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-zs-border hover:bg-zs-surface/50"
                >
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col items-start gap-1">
                      {statusBadge(o.status)}
                      {o.oversold && (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          Revisar stock
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {formatDateTimeES(o.createdAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {o.customerName ?? <span className="text-zs-muted">—</span>}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {o.customerEmail ? (
                      <a
                        href={`mailto:${o.customerEmail}`}
                        className="text-zs-blue-700 hover:underline"
                      >
                        {truncate(o.customerEmail, 40)}
                      </a>
                    ) : (
                      <span className="text-zs-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-zs-muted">
                    {deliveryLabel(o.deliveryMethod)}
                  </td>
                  <td className="px-3 py-2 text-right align-top font-medium">
                    {formatPriceEUR(o.total)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col items-start gap-1.5">
                      <button
                        onClick={() => openDetail(o.id)}
                        className="text-xs text-zs-blue-700 hover:underline"
                        disabled={loadingDetail}
                        type="button"
                      >
                        Ver detalle
                      </button>
                      {o.deliveryMethod === "in_store" &&
                        o.status !== "CANCELLED" &&
                        o.status !== "REFUNDED" && (
                          <button
                            onClick={() => cancelOrder(o.id)}
                            className="text-xs font-semibold text-zs-red-600 hover:underline disabled:opacity-50"
                            disabled={cancellingId === o.id}
                            type="button"
                            title="Cancela la venta del TPV y devuelve el stock al inventario"
                          >
                            {cancellingId === o.id ? "Cancelando…" : "Cancelar"}
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zs-muted">
          <span>
            Página {page} de {totalPages} · {total} pedidos
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              type="button"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              type="button"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Pedido {selected.id.slice(0, 10)}</DialogTitle>
                <DialogDescription>
                  {formatDateTimeES(selected.createdAt)} ·{" "}
                  {deliveryLabel(selected.deliveryMethod)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusBadge(selected.status)}
                    {orderReturnable && selected.returns.length > 0 && (
                      <Badge variant="warning">Devolución parcial</Badge>
                    )}
                  </div>
                  <span className="text-lg font-bold">
                    {formatPriceEUR(selected.total)}
                  </span>
                </div>

                {selected.oversold && (
                  <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <p className="text-xs">
                      <span className="font-semibold">Revisar stock:</span> alguna
                      línea se vendió sin stock disponible (carrera de inventario).
                      Comprueba existencias antes de preparar el envío.
                    </p>
                  </div>
                )}

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-zs-muted">
                    Cliente
                  </h3>
                  <p>{selected.customerName ?? "—"}</p>
                  {selected.customerEmail && (
                    <a
                      href={`mailto:${selected.customerEmail}`}
                      className="text-zs-blue-700 hover:underline"
                    >
                      {selected.customerEmail}
                    </a>
                  )}
                  {selected.customerPhone && (
                    <p className="text-zs-muted">{selected.customerPhone}</p>
                  )}
                </section>

                {selected.shippingAddress && (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-zs-muted">
                      Dirección de envío
                    </h3>
                    <address className="not-italic">
                      {selected.shippingAddress.name && (
                        <div>{selected.shippingAddress.name}</div>
                      )}
                      {selected.shippingAddress.line1 && (
                        <div>{selected.shippingAddress.line1}</div>
                      )}
                      {selected.shippingAddress.line2 && (
                        <div>{selected.shippingAddress.line2}</div>
                      )}
                      <div>
                        {[
                          selected.shippingAddress.postal_code,
                          selected.shippingAddress.city,
                          selected.shippingAddress.state,
                          selected.shippingAddress.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </address>
                  </section>
                )}

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-zs-muted">
                    Productos ({selected.items.length})
                  </h3>
                  <ul className="rounded-lg border border-zs-border p-3">
                    {selected.items.map((it) => {
                      const returned = returnedByItem.get(it.id) ?? 0;
                      const fullyReturned = it.quantity === 0;
                      const canReturn = orderReturnable && it.quantity > 0;
                      const isReturning = returningItemId === it.id;
                      const clampedQty = Math.min(Math.max(returnQty, 1), it.quantity || 1);
                      const previewAmount = isReturning
                        ? computeItemReturn(it.subtotal, it.quantity, clampedQty).returnedGross
                        : 0;
                      return (
                        <li
                          key={it.id}
                          className="flex flex-col gap-1 border-b border-zs-border/40 py-1.5 first:pt-0 last:border-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={fullyReturned ? "text-zs-muted line-through" : ""}>
                              {it.quantity}× {it.productName}
                              {it.variantSize && (
                                <span className="text-zs-muted"> · talla {it.variantSize}</span>
                              )}
                              {returned > 0 && (
                                <span className="ml-1 text-xs font-semibold text-zs-red-600">
                                  · devuelto: {returned}
                                </span>
                              )}
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span
                                className={`font-medium ${fullyReturned ? "text-zs-muted line-through" : ""}`}
                              >
                                {formatPriceEUR(it.subtotal)}
                              </span>
                              {canReturn && !isReturning && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReturningItemId(it.id);
                                    setReturnQty(it.quantity);
                                  }}
                                  className="text-xs font-semibold text-zs-red-600 hover:underline"
                                  title="Devolver este artículo: vuelve al inventario y se descuenta de la venta"
                                >
                                  Devolver
                                </button>
                              )}
                            </span>
                          </div>
                          {isReturning && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-zs-surface/60 p-2 text-xs">
                              {it.quantity > 1 ? (
                                <label className="flex items-center gap-1">
                                  Unidades:
                                  <Input
                                    type="number"
                                    min={1}
                                    max={it.quantity}
                                    value={clampedQty}
                                    onChange={(e) => {
                                      const v = Math.round(Number(e.target.value));
                                      setReturnQty(
                                        Number.isFinite(v)
                                          ? Math.min(Math.max(v, 1), it.quantity)
                                          : 1,
                                      );
                                    }}
                                    className="h-8 w-16"
                                  />
                                  <span className="text-zs-muted">de {it.quantity}</span>
                                </label>
                              ) : (
                                <span>Devolver 1 unidad</span>
                              )}
                              <span className="font-semibold">
                                Devuelve {formatPriceEUR(previewAmount)} al cliente
                              </span>
                              <span className="ml-auto flex gap-2">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={returningBusy}
                                  onClick={() => handleReturnItem(it.id, clampedQty)}
                                >
                                  {returningBusy ? "Devolviendo…" : "Confirmar devolución"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={returningBusy}
                                  onClick={() => setReturningItemId(null)}
                                >
                                  Cancelar
                                </Button>
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {orderReturnable && (
                    <p className="mt-1.5 text-xs text-zs-muted">
                      Pulsa <span className="font-semibold text-zs-red-600">Devolver</span> en un
                      artículo para reponerlo al inventario y descontarlo de la venta (efectivo en
                      mano). Solo ventas de tienda (TPV).
                    </p>
                  )}
                </section>

                <section className="space-y-1 border-t border-zs-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-zs-muted">Subtotal</span>
                    <span>{formatPriceEUR(selected.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zs-muted">Envío</span>
                    <span>{formatPriceEUR(selected.shippingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zs-muted">IVA</span>
                    <span>{formatPriceEUR(selected.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-zs-border pt-1 font-semibold">
                    <span>Total</span>
                    <span>{formatPriceEUR(selected.total)}</span>
                  </div>
                </section>

                <section className="border-t border-zs-border pt-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-zs-muted">
                    Factura (Holded · VeriFactu)
                  </h3>
                  {selected.holdedInvoiceNumber ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-sm font-semibold text-emerald-900">
                        ✓ Factura emitida: {selected.holdedInvoiceNumber}
                      </p>
                      {selected.invoicedAt && (
                        <p className="text-xs text-emerald-700">
                          {formatDateTimeES(selected.invoicedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-zs-muted">
                        Sin NIF → factura simplificada. Con NIF/datos → factura completa.
                        Se emite en Holded y va a VeriFactu (AEAT) si está activo.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={fiscal.nif}
                          onChange={(e) => setFiscal((f) => ({ ...f, nif: e.target.value }))}
                          placeholder="NIF / CIF (opcional)"
                        />
                        <Input
                          value={fiscal.name}
                          onChange={(e) => setFiscal((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Razón social (opcional)"
                        />
                        <Input
                          value={fiscal.address}
                          onChange={(e) => setFiscal((f) => ({ ...f, address: e.target.value }))}
                          placeholder="Dirección (opcional)"
                        />
                        <Input
                          value={fiscal.city}
                          onChange={(e) => setFiscal((f) => ({ ...f, city: e.target.value }))}
                          placeholder="Ciudad (opcional)"
                        />
                        <Input
                          value={fiscal.cp}
                          onChange={(e) => setFiscal((f) => ({ ...f, cp: e.target.value }))}
                          placeholder="C.P. (opcional)"
                        />
                      </div>
                      <Button type="button" onClick={handleIssueInvoice} disabled={issuing}>
                        {issuing ? "Emitiendo…" : "Emitir factura"}
                      </Button>
                    </div>
                  )}
                </section>

                <section className="border-t border-zs-border pt-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase text-zs-muted">
                    Gestionar estado
                  </h3>
                  <div className="space-y-2">
                    <Select
                      value={newStatus}
                      onValueChange={(v) =>
                        setNewStatus(v as (typeof FULFILLMENT_STATUSES)[number])
                      }
                    >
                      <SelectTrigger aria-label="Nuevo estado">
                        <SelectValue placeholder="Cambiar estado a…" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* "Cancelado" se gestiona con el botón dedicado (solo
                            TPV), no desde aquí: así no hay dos vías de cancelar. */}
                        {FULFILLMENT_STATUSES.filter(
                          (s) => s !== "CANCELLED",
                        ).map((s) => (
                          <SelectItem key={s} value={s}>
                            {FULFILLMENT_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Nota / seguimiento (opcional): nº de seguimiento, transportista…"
                      className="min-h-[60px] text-sm"
                    />
                    <Button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={!newStatus || updatingStatus}
                      className="w-full sm:w-auto"
                    >
                      {updatingStatus ? "Actualizando…" : "Actualizar estado"}
                    </Button>
                  </div>
                  {selected.deliveryMethod === "in_store" &&
                    selected.status !== "CANCELLED" &&
                    selected.status !== "REFUNDED" && (
                      <div className="mt-4 border-t border-zs-border pt-4">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => cancelOrder(selected.id)}
                          disabled={cancellingId === selected.id}
                          className="w-full sm:w-auto"
                        >
                          {cancellingId === selected.id
                            ? "Cancelando…"
                            : "Cancelar venta y devolver stock"}
                        </Button>
                        <p className="mt-1.5 text-xs text-zs-muted">
                          Solo para ventas del TPV. Marca la venta como cancelada y
                          devuelve al inventario el stock que descontó.
                        </p>
                      </div>
                    )}
                  {selected.notes && (
                    <div className="mt-3 rounded-lg border border-zs-border bg-zs-surface/50 p-2">
                      <p className="mb-1 text-xs font-semibold uppercase text-zs-muted">
                        Notas / seguimiento
                      </p>
                      <pre className="whitespace-pre-wrap break-words font-sans text-xs text-zs-ink">
                        {selected.notes}
                      </pre>
                    </div>
                  )}
                </section>

                {selected.stripePaymentIntentId && (
                  <section className="border-t border-zs-border pt-3 text-xs">
                    <h3 className="mb-1 font-semibold uppercase text-zs-muted">
                      Stripe
                    </h3>
                    <a
                      href={`https://dashboard.stripe.com/payments/${selected.stripePaymentIntentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-zs-blue-700 hover:underline"
                    >
                      Ver en dashboard Stripe
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                    <p className="mt-1 text-zs-muted break-all">
                      <code>{selected.stripePaymentIntentId}</code>
                    </p>
                  </section>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
