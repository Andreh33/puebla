"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellRing, CheckCircle2, ExternalLink, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { broadcastMarketplaceNotificationCount } from "@/components/admin/marketplace-alert";
import { resolveMarketplaceNotificationAction } from "./_actions";

export type MarketplaceNotificationDTO = {
  id: string;
  marketplace: string;
  productId: string | null;
  productName: string;
  productSku: string | null;
  quantitySold: number;
  saleCount: number;
  lastOrderId: string | null;
  firstSoldAt: string;
  lastSoldAt: string;
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

function marketplaceLabel(marketplace: string): string {
  if (marketplace === "MIRAVIA") return "Miravia";
  if (marketplace === "AMAZON") return "Amazon";
  return marketplace;
}

export function NotificationsClient({
  notifications,
  totalCount,
  loadError = false,
}: {
  notifications: MarketplaceNotificationDTO[];
  totalCount: number;
  loadError?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState(notifications);
  const [pendingCount, setPendingCount] = React.useState(totalCount);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRows(notifications);
    setPendingCount(totalCount);
    if (!loadError) broadcastMarketplaceNotificationCount(totalCount);
  }, [notifications, totalCount, loadError]);

  async function resolveNotification(row: MarketplaceNotificationDTO) {
    const confirmed = window.confirm(
      `¿Confirmas que ya has retirado “${row.productName}” de ${marketplaceLabel(row.marketplace)}?`,
    );
    if (!confirmed) return;

    setBusyId(row.id);
    try {
      const result = await resolveMarketplaceNotificationAction(row.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRows((current) => {
        const next = current.filter((item) => item.id !== row.id);
        return next;
      });
      setPendingCount((current) => {
        const next = Math.max(0, current - 1);
        broadcastMarketplaceNotificationCount(next);
        return next;
      });
      toast.success(`Marcado como retirado de ${marketplaceLabel(row.marketplace)}`);
      router.refresh();
    } catch {
      toast.error("No se pudo resolver la notificación.");
    } finally {
      setBusyId(null);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
        <AlertTriangle className="mx-auto h-9 w-9 text-red-700" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold text-red-950">No se pudieron cargar los avisos</h2>
        <p className="mx-auto mt-1 max-w-xl text-sm text-red-900/75">
          No se ha borrado ninguna notificación. Reintenta al recuperar la conexión con la base de
          datos.
        </p>
        <Button type="button" variant="outline" className="mt-5" onClick={() => router.refresh()}>
          Volver a intentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-zs-muted text-xs font-semibold tracking-wide uppercase">
              Pendientes de retirar
            </p>
            <p className="font-display mt-0.5 text-2xl font-bold text-amber-800">{pendingCount}</p>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="border-zs-border rounded-2xl border border-dashed bg-white px-5 py-16 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
          <h2 className="text-zs-blue-900 mt-4 text-lg font-bold">Todo al día</h2>
          <p className="text-zs-muted mt-1 text-sm">
            No hay productos vendidos pendientes de retirar de marketplaces.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingCount > rows.length && (
            <p className="text-zs-muted text-xs">
              Mostrando los {rows.length} avisos más recientes de {pendingCount}. Al resolverlos
              aparecerán automáticamente los siguientes.
            </p>
          )}
          <div className="border-zs-border overflow-x-auto rounded-xl border bg-white">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="bg-zs-surface text-zs-muted text-left text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Marketplace</th>
                  <th className="px-4 py-3 font-medium">Producto vendido</th>
                  <th className="px-4 py-3 font-medium">Ventas</th>
                  <th className="px-4 py-3 font-medium">Última venta</th>
                  <th className="px-4 py-3 font-medium">Referencia</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-zs-border border-t align-middle">
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                        {marketplaceLabel(row.marketplace)}
                      </span>
                    </td>
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="text-zs-ink font-semibold">{row.productName}</p>
                      <p className="text-zs-muted mt-0.5 font-mono text-xs">
                        SKU: {row.productSku ?? "Sin SKU"}
                      </p>
                    </td>
                    <td className="text-zs-ink px-4 py-3 whitespace-nowrap">
                      <strong>{row.quantitySold}</strong> ud.
                      <span className="text-zs-muted ml-1 text-xs">
                        en {row.saleCount} {row.saleCount === 1 ? "venta" : "ventas"}
                      </span>
                    </td>
                    <td className="text-zs-muted px-4 py-3 whitespace-nowrap">
                      {formatDateTime(row.lastSoldAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {row.productId && (
                          <Link
                            href={`/admin/productos/${row.productId}`}
                            className="text-zs-blue-700 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          >
                            Ver producto <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        )}
                        {row.lastOrderId && (
                          <Link
                            href={`/admin/pedidos?all=1&q=${encodeURIComponent(row.lastOrderId)}`}
                            className="text-zs-muted hover:text-zs-blue-700 inline-flex items-center gap-1 text-xs hover:underline"
                          >
                            Ver última venta
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => resolveNotification(row)}
                        className="bg-emerald-700 hover:bg-emerald-800"
                      >
                        <PackageCheck className="h-4 w-4" aria-hidden="true" />
                        {busyId === row.id ? "Guardando…" : "Ya está retirado"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
