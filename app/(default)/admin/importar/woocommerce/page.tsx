/**
 * Página /admin/importar/woocommerce — sube un export nativo de WooCommerce
 * (CSV) y crea/actualiza productos en lote.
 *
 * Server component: carga jobs recientes y delega el flujo interactivo al
 * client component WooImportClient.
 */

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatDateTimeES } from "@/lib/utils";
import { WooImportClient } from "./WooImportClient";

export const metadata = {
  title: "Importar de WooCommerce (csv)",
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

export default async function ImportWooPage() {
  const recentJobs = await db.importJob
    .findMany({
      where: { source: "WOOCOMMERCE" },
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
    })
    .catch(() => []);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Importar de WooCommerce (csv)"
        description="Sube el export nativo de WooCommerce. Cada producto variable se importa como un Product con sus variations como tallas; los productos simples se crean sin tallas."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Importar", href: "/admin/importar/xlsx" },
          { label: "WooCommerce (csv)" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Cómo funciona la importación</CardTitle>
          <CardDescription>
            Procesado idempotente, descarga de imágenes en background.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="ml-5 list-decimal space-y-2 text-sm text-zs-ink">
            <li>
              <strong>Selecciona</strong> el fichero <code>.csv</code>{" "}
              exportado desde <em>WooCommerce → Productos → Exportar</em>{" "}
              (máximo 20MB).
            </li>
            <li>
              <strong>Revisa la vista previa</strong> de los primeros 10
              productos detectados (la columna &quot;Tipo&quot; debe ser{" "}
              <code>variable</code> o <code>simple</code>).
            </li>
            <li>
              <strong>Configura</strong> modo (crear/actualizar) y estado por
              defecto.
            </li>
            <li>
              <strong>Lanza la importación</strong>. El procesado corre en
              segundo plano: cada bloque sube imágenes a Vercel Blob y
              publica el producto solo si la imagen principal se descargó OK.
            </li>
          </ol>
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Mapping clave:</strong> 1 producto variable WooCommerce ={" "}
            1 <code>Product</code> + N <code>ProductSize</code>. Las URLs de
            la columna &quot;Imágenes&quot; se descargan y suben a Vercel
            Blob — la primera queda como <code>mainImageUrl</code> y el resto
            como <code>ProductImage</code> adicionales. Productos con{" "}
            <code>isCustomized = true</code> conservan los campos editados a
            mano.
          </p>
        </CardContent>
      </Card>

      <WooImportClient />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Importaciones recientes</CardTitle>
            <CardDescription>
              Últimos 8 jobs WooCommerce
            </CardDescription>
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
              Aún no se ha importado ningún CSV WooCommerce. Sube el primero
              arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zs-surface text-xs uppercase tracking-wide text-zs-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">
                      Archivo
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">
                      Productos
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Creados
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Actualizados
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      Errores
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Lanzado
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zs-border">
                  {recentJobs.map((j) => (
                    <tr key={j.id} className="hover:bg-zs-surface/60">
                      <td className="px-4 py-3 text-zs-ink">
                        {j.fileName ?? "—"}
                      </td>
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
