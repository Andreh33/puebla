/**
 * Página /admin/importar/historial â€” tabla con los últimos 50 ImportJob
 * de cualquier source (XLSX, MIRAVIA, AMAZON).
 */

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatDateTimeES } from "@/lib/utils";

export const metadata = { title: "Historial de importaciones" };
export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  switch (status) {
    case "DONE":
      return <Badge variant="success">Completado</Badge>;
    case "RUNNING":
      return <Badge variant="warning">En curso</Badge>;
    case "FAILED":
      return <Badge variant="sale">Fallido</Badge>;
    case "PENDING":
      return <Badge variant="draft">Pendiente</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function sourceBadge(src: string) {
  const tones: Record<string, "default" | "amazon" | "outline"> = {
    XLSX: "default",
    AMAZON: "amazon",
    MIRAVIA: "outline",
  };
  return <Badge variant={tones[src] ?? "outline"}>{src}</Badge>;
}

export default async function ImportHistoryPage() {
  const jobs = await db.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      source: true,
      status: true,
      mode: true,
      fileName: true,
      totalRows: true,
      processedRows: true,
      createdRows: true,
      updatedRows: true,
      errorRows: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Historial de importaciones"
        description="Ãšltimos 50 jobs de importación de catálogo (PRICAT, Miravia y Amazon)."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Importar" },
          { label: "Historial" },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <div className="p-10 text-center text-sm text-zs-muted">
              Aún no se ha lanzado ninguna importación.{" "}
              <Link
                href="/admin/importar/xlsx"
                className="font-semibold text-zs-blue-700 hover:text-zs-red-600"
              >
                Empezar â†’
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zs-surface text-xs uppercase tracking-wide text-zs-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Fuente</th>
                    <th className="px-4 py-3 text-left font-medium">Archivo / Origen</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Modo</th>
                    <th className="px-4 py-3 text-right font-medium">Filas</th>
                    <th className="px-4 py-3 text-right font-medium">Creados</th>
                    <th className="px-4 py-3 text-right font-medium">Actualizados</th>
                    <th className="px-4 py-3 text-right font-medium">Errores</th>
                    <th className="px-4 py-3 text-left font-medium">Lanzado</th>
                    <th className="px-4 py-3 text-left font-medium">Finalizado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zs-border">
                  {jobs.map((j) => (
                    <tr key={j.id} className="hover:bg-zs-surface/60">
                      <td className="px-4 py-3">{sourceBadge(j.source)}</td>
                      <td className="px-4 py-3 text-zs-ink">{j.fileName ?? "â€”"}</td>
                      <td className="px-4 py-3">{statusBadge(j.status)}</td>
                      <td className="px-4 py-3 text-xs text-zs-muted">{j.mode ?? "â€”"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {j.processedRows}/{j.totalRows}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {j.createdRows}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zs-blue-700">
                        {j.updatedRows}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-zs-red-600">
                        {j.errorRows}
                      </td>
                      <td className="px-4 py-3 text-xs text-zs-muted">
                        {formatDateTimeES(j.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-zs-muted">
                        {j.finishedAt ? formatDateTimeES(j.finishedAt) : "â€”"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {j.errorRows > 0 && (
                          <Link
                            href={`/api/import/jobs/${j.id}/errors.csv`}
                            className="text-xs font-semibold text-zs-blue-700 hover:text-zs-red-600"
                          >
                            CSV
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
