import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AmazonImportClient } from "./AmazonImportClient";

export const metadata: Metadata = { title: "Importar de Amazon" };
export const dynamic = "force-dynamic";

export default function AmazonImportPage() {
  const enabled = process.env.AMAZON_ENABLED === "true";
  const hasCreds = Boolean(
    process.env.AMAZON_ACCESS_KEY &&
      process.env.AMAZON_SECRET_KEY &&
      process.env.AMAZON_ASSOCIATE_TAG,
  );

  return (
    <div>
      <AdminPageHeader
        title="Importar desde Amazon"
        description="Añade productos de afiliados Amazon a la tienda usando ASIN o URL."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Importar", href: "/admin/importar/xlsx" },
          { label: "Amazon" },
        ]}
      />

      {!enabled || !hasCreds ? (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Conector Amazon no activado
                {hasCreds ? " (AMAZON_ENABLED!=true)" : " (faltan credenciales)"}
              </p>
              <p className="mt-1">
                Para habilitar este importador necesitas configurar en Vercel:
              </p>
              <ul className="mt-2 list-disc pl-5 text-xs">
                <li>
                  <code>AMAZON_ACCESS_KEY</code> — Access Key de PA-API 5.0
                </li>
                <li>
                  <code>AMAZON_SECRET_KEY</code> — Secret Key de PA-API 5.0
                </li>
                <li>
                  <code>AMAZON_ASSOCIATE_TAG</code> — Tag de afiliados (ej.{" "}
                  <code>zonasport-21</code>)
                </li>
                <li>
                  <code>AMAZON_HOST</code> — opcional, por defecto{" "}
                  <code>webservices.amazon.es</code>
                </li>
                <li>
                  <code>AMAZON_REGION</code> — opcional, por defecto{" "}
                  <code>eu-west-1</code>
                </li>
                <li>
                  <code>AMAZON_ENABLED</code> — pon a <code>true</code> cuando
                  quieras activarlo.
                </li>
              </ul>
              <p className="mt-2 text-xs">
                Consulta <Link href="/docs/CONNECTORS.md" className="underline">docs/CONNECTORS.md</Link>{" "}
                para el detalle.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-zs-border bg-zs-surface p-3 text-xs text-zs-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            PA-API permite 1 request/segundo. Las importaciones grandes pueden
            tardar varios segundos por batch.
          </span>
        </div>
      )}

      <AmazonImportClient enabled={enabled && hasCreds} />
    </div>
  );
}
