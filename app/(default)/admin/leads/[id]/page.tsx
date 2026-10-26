import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { formatDateTimeES } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LeadDetailClient } from "./LeadDetailClient";

export const metadata: Metadata = { title: "Detalle de lead" };
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const product = lead.productId
    ? await db.product.findUnique({
        where: { id: lead.productId },
        select: { id: true, name: true, slug: true },
      })
    : null;

  return (
    <div>
      <AdminPageHeader
        title={lead.name}
        description={`Lead recibido el ${formatDateTimeES(lead.createdAt)}`}
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Leads", href: "/admin/leads" },
          { label: lead.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-zs-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zs-blue-900">
                Mensaje
              </h2>
              <Badge variant="outline">{lead.status}</Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm text-zs-ink">
              {lead.message}
            </p>
          </div>

          <div className="rounded-lg border border-zs-border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zs-blue-900">
              Datos del contacto
            </h2>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zs-muted">Email</dt>
                <dd>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-zs-blue-700 hover:underline"
                  >
                    {lead.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zs-muted">Teléfono</dt>
                <dd>{lead.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zs-muted">Página origen</dt>
                <dd>{lead.sourcePage ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zs-muted">Producto</dt>
                <dd>
                  {product ? (
                    <Link
                      href={`/admin/productos/${product.id}`}
                      className="text-zs-blue-700 hover:underline"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zs-muted">IP</dt>
                <dd className="font-mono text-xs">{lead.ipAddress ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zs-muted">Consentimiento RGPD</dt>
                <dd>{lead.gdprConsent ? "Sí" : "No"}</dd>
              </div>
            </dl>
          </div>
        </section>

        <aside>
          <LeadDetailClient
            lead={{
              id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              status: lead.status,
              notes: lead.notes ?? "",
              message: lead.message,
              productName: product?.name ?? null,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
