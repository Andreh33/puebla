import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { MiraviaImportClient } from "./MiraviaImportClient";
import { formatDateTimeES } from "@/lib/utils";

export const metadata: Metadata = { title: "Importar de Miravia" };
export const dynamic = "force-dynamic";

export default async function MiraviaImportPage() {
  const enabled =
    process.env.MIRAVIA_ENABLED === "true" && !!process.env.MIRAVIA_FEED_URL;

  const recent = await db.importJob
    .findMany({
      where: { source: "MIRAVIA" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        status: true,
        totalRows: true,
        createdRows: true,
        updatedRows: true,
        errorRows: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
      },
    })
    .catch(() => []);

  return (
    <div>
      <AdminPageHeader
        title="Importar desde Miravia"
        description="Sincroniza el catálogo Miravia (CSV/JSON/XML)."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Importar", href: "/admin/importar/xlsx" },
          { label: "Miravia" },
        ]}
      />

      {!enabled && (
        <div className="mb-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Conector Miravia no activado</p>
              <p className="mt-1">
                Configura en Vercel:
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                <li>
                  <code>MIRAVIA_ENABLED=true</code>
                </li>
                <li>
                  <code>MIRAVIA_FEED_URL</code> â€” URL HTTPS o ruta al fichero
                </li>
                <li>
                  <code>MIRAVIA_FEED_FORMAT</code> â€” <code>csv</code> | <code>json</code> | <code>xml</code>
                </li>
              </ul>
              <p className="mt-2 text-xs">
                Detalle en{" "}
                <Link href="/docs/CONNECTORS.md" className="underline">
                  docs/CONNECTORS.md
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      )}

      <MiraviaImportClient enabled={enabled} />

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-zs-blue-900">
          Histórico
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-zs-muted">Aún no hay importaciones de Miravia.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zs-border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zs-surface text-left text-xs uppercase text-zs-muted">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Creados</th>
                  <th className="px-3 py-2">Actualizados</th>
                  <th className="px-3 py-2">Errores</th>
                  <th className="px-3 py-2">Fin</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((j) => (
                  <tr key={j.id} className="border-t border-zs-border">
                    <td className="px-3 py-2">{formatDateTimeES(j.createdAt)}</td>
                    <td className="px-3 py-2">{j.status}</td>
                    <td className="px-3 py-2">{j.totalRows}</td>
                    <td className="px-3 py-2">{j.createdRows}</td>
                    <td className="px-3 py-2">{j.updatedRows}</td>
                    <td className="px-3 py-2">{j.errorRows}</td>
                    <td className="px-3 py-2">{formatDateTimeES(j.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
