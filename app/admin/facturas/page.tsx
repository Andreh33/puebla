import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FacturasClient, type InvoiceDTO } from "./FacturasClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturas de proveedores · Admin" };

export default async function FacturasPage() {
  const invoices = await db.supplierInvoice
    .findMany({
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: { dueDates: { orderBy: { dueDate: "asc" } } },
    })
    .catch(() => []);

  const serialized: InvoiceDTO[] = invoices.map((inv) => ({
    id: inv.id,
    supplier: inv.supplier,
    brandLabel: inv.brandLabel,
    invoiceNumber: inv.invoiceNumber,
    concept: inv.concept,
    issueDate: inv.issueDate.toISOString().slice(0, 10),
    notes: inv.notes,
    dueDates: inv.dueDates.map((d) => ({
      id: d.id,
      dueDate: d.dueDate.toISOString().slice(0, 10),
      amount: Number(d.amount),
      paid: d.paid,
    })),
  }));

  const todayYmd = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Facturas de proveedores"
        description="Registro de facturas y vencimientos a pagar. Todo se rellena a mano."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Facturas" }]}
      />
      <FacturasClient invoices={serialized} todayYmd={todayYmd} />
    </div>
  );
}
