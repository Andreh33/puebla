/**
 * Página /admin/importar/xlsx — punto de entrada para importar el PRICAT.
 * Server component: carga jobs recientes y delega el flujo interactivo al client component.
 */

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatDateTimeES } from "@/lib/utils";
import { ImportXlsxClient } from "./ImportXlsxClient";

export const metadata = {
  title: "Importar PRICAT (xlsx)",
};

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

export default async function ImportXlsxPage() {
  const recentJobs = await db.importJob.findMany({
    where: { source: "XLSX" },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      processedRows: true,
      createdRows: true,
      updatedRows: true,
      errorRows: true,
      createdAt: true,
      finishedAt: true,
    },
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Importar PRICAT (xlsx)"
        description="Sube el catálogo del proveedor para crear o actualizar productos en lote. Cada combinación de modelo+color se trata como un producto independiente; las tallas se importan como variantes."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Importar" },
          { label: "PRICAT (xlsx)" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cómo funciona la importación</CardTitle>
          <CardDescription>
            Flujo en cuatro pasos para garantizar idempotencia y trazabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="ml-5 list-decimal space-y-2 text-sm text-zs-ink">
            <li>
              <strong>Selecciona</strong> el fichero <code>.xlsx</code> con la estructura del
              PRICAT (hoja &quot;Catálogo&quot;, máximo 10MB).
            </li>
            <li>
              <strong>Revisa la vista previa</strong> de las 10 primeras filas para confirmar
              que las columnas se interpretan correctamente.
            </li>
            <li>
              <strong>Configura las opciones</strong>: modo (crear/actualizar), estado por
              defecto (DRAFT) y categoría por defecto opcional.
            </li>
            <li>
              <strong>Lanza la importación</strong>. El proceso corre en segundo plano y
              puedes seguir el progreso en esta misma página.
            </li>
          </ol>
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Importante:</strong> los productos importados quedan en estado{" "}
            <code>DRAFT</code> hasta que les asignes imagen principal y verifiques los datos.
            Productos con <code>isCustomized = true</code> conservan los campos editados a
            mano y solo se actualiza precio de coste y datos no protegidos.
          </p>
        </CardContent>
      </Card>

      <ImportXlsxClient />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Importaciones recientes</CardTitle>
            <CardDescription>Últimos 8 jobs de PRICAT</CardDescription>
          </div>
          <Link
            href="/admin/importar/historial"
            className="text-xs font-semibold text-zs-blue-700 hover:text-zs-red-600"
          >
            Ver historial completo →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentJobs.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-zs-muted">
              Aún no se ha importado ningún catálogo. Sube el primer fichero arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zs-surface text-xs uppercase tracking-wide text-zs-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Archivo</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Filas</th>
                    <th className="px-4 py-3 text-right font-medium">Creados</th>
                    <th className="px-4 py-3 text-right font-medium">Actualizados</th>
                    <th className="px-4 py-3 text-right font-medium">Errores</th>
                    <th className="px-4 py-3 text-left font-medium">Lanzado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zs-border">
                  {recentJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-zs-surface/60">
                      <td className="px-4 py-3 text-zs-ink">{j.fileName ?? "—"}</td>
                      <td className="px-4 py-3">{statusBadge(j.status)}</td>
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
                      <td className="px-4 py-3 text-right">
                        {j.errorRows > 0 && (
                          <Link
                            href={`/api/import/jobs/${j.id}/errors.csv`}
                            className="text-xs font-semibold text-zs-blue-700 hover:text-zs-red-600"
                          >
                            Errores CSV
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
