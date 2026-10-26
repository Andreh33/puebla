"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2, Package, ShoppingBag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateReservationStatus, deleteReservation } from "./_actions";

export type ReservationDTO = {
  id: string;
  kind: string;
  productName: string | null;
  sku: string | null;
  size: string | null;
  itemsCount: number | null;
  amount: number | null;
  summary: string;
  status: string;
  createdAt: string;
};

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const STATUS_META: Record<string, { label: string; badge: string }> = {
  NEW: { label: "Nueva", badge: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  CONTACTED: { label: "Contactado", badge: "bg-amber-100 text-amber-900 border border-amber-200" },
  DONE: { label: "Completada", badge: "bg-zs-surface text-zs-muted border border-zs-border" },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReservasClient({ reservations }: { reservations: ReservationDTO[] }) {
  const [rows, setRows] = React.useState<ReservationDTO[]>(reservations);
  const [filter, setFilter] = React.useState<"all" | "NEW" | "CONTACTED" | "DONE">("all");

  const filtered = React.useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  async function changeStatus(id: string, status: string) {
    const prev = rows.find((r) => r.id === id)?.status;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    const res = await updateReservationStatus(id, status);
    if (!res.ok) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: prev ?? r.status } : r)));
      toast.error(res.error);
    }
  }

  async function remove(id: string) {
    const snapshot = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const res = await deleteReservation(id);
    if (!res.ok) {
      setRows(snapshot);
      toast.error(res.error);
    }
  }

  const newCount = rows.filter((r) => r.status === "NEW").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Card className="flex-1 min-w-[200px]">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-zs-muted">Reservas sin atender</p>
            <p className="mt-1 font-display text-2xl font-bold text-emerald-700">{newCount}</p>
          </CardContent>
        </Card>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="NEW">Nuevas</SelectItem>
            <SelectItem value="CONTACTED">Contactadas</SelectItem>
            <SelectItem value="DONE">Completadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zs-border bg-white">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-zs-surface text-left text-xs uppercase text-zs-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Tipo</th>
              <th className="px-3 py-2 font-medium">Detalle</th>
              <th className="px-3 py-2 text-right font-medium">Importe</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zs-muted">
                  {rows.length === 0
                    ? "Aún no hay reservas por WhatsApp."
                    : "Ninguna reserva con ese estado."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.NEW!;
                return (
                  <tr key={r.id} className="border-t border-zs-border align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-zs-muted">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zs-ink">
                        {r.kind === "cart" ? (
                          <>
                            <ShoppingBag className="h-3.5 w-3.5" /> Carrito
                          </>
                        ) : (
                          <>
                            <Package className="h-3.5 w-3.5" /> Producto
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.kind === "cart" ? (
                        <details className="text-zs-ink">
                          <summary className="cursor-pointer">
                            {r.itemsCount ?? "?"} {r.itemsCount === 1 ? "artículo" : "artículos"}{" "}
                            <span className="text-xs text-zs-blue-700">· ver</span>
                          </summary>
                          <pre className="mt-1 max-w-[380px] whitespace-pre-wrap break-words rounded-lg bg-zs-surface p-2 text-[11px] leading-snug text-zs-ink">
                            {r.summary}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-zs-ink">
                          {r.productName ?? "—"}
                          {r.size && <span className="text-zs-muted"> · talla {r.size}</span>}
                          {r.sku && (
                            <span className="ml-1 block font-mono text-[11px] text-zs-muted">SKU: {r.sku}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">
                      {r.amount != null ? EUR.format(r.amount) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                          {meta.label}
                        </span>
                        <Select value={r.status} onValueChange={(v) => changeStatus(r.id, v)}>
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">Nueva</SelectItem>
                            <SelectItem value="CONTACTED">Contactado</SelectItem>
                            <SelectItem value="DONE">Completada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        aria-label="Borrar reserva"
                        className="text-zs-muted hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
