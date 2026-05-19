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
import { Download, ExternalLink, RefreshCw, Search } from "lucide-react";
import { formatDateTimeES, formatPriceEUR, truncate } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderDetail, OrderSummary } from "@/lib/stripe/types";
import {
  exportOrdersCsv,
  getOrderDetail,
  syncCatalogToStripe,
} from "./_actions";

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
                  <td className="px-3 py-2 align-top">{statusBadge(o.status)}</td>
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
                    <button
                      onClick={() => openDetail(o.id)}
                      className="text-xs text-zs-blue-700 hover:underline"
                      disabled={loadingDetail}
                      type="button"
                    >
                      Ver detalle
                    </button>
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
                  {statusBadge(selected.status)}
                  <span className="text-lg font-bold">
                    {formatPriceEUR(selected.total)}
                  </span>
                </div>

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
                  <ul className="space-y-1 rounded-lg border border-zs-border p-3">
                    {selected.items.map((it) => (
                      <li key={it.id} className="flex justify-between gap-2">
                        <span>
                          {it.quantity}× {it.productName}
                          {it.variantSize && (
                            <span className="text-zs-muted">
                              {" "}
                              · talla {it.variantSize}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-medium">
                          {formatPriceEUR(it.subtotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
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
