import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FacturasClient, type InvoiceDTO, type ColumnDTO, type SupplierDTO } from "./FacturasClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Facturas de proveedores · Admin" };

export default async function FacturasPage() {
  const [invoices, columns, suppliers] = await Promise.all([
    db.supplierInvoice
      .findMany({
        orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
        include: { dueDates: { orderBy: { dueDate: "asc" } } },
      })
      .catch(() => []),
    db.invoiceColumn.findMany({ orderBy: { position: "asc" } }).catch(() => []),
    db.supplier.findMany({ orderBy: { name: "asc" } }).catch(() => []),
  ]);

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
    customValues:
      inv.customValues && typeof inv.customValues === "object" && !Array.isArray(inv.customValues)
        ? (inv.customValues as Record<string, string>)
        : {},
  }));

  const cols: ColumnDTO[] = columns.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    width: c.width,
  }));

  const suppliersDTO: SupplierDTO[] = suppliers.map((s) => ({ id: s.id, name: s.name }));

  const todayYmd = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Facturas de proveedores"
        description="Registro de facturas y vencimientos a pagar. Todo se rellena a mano."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Facturas" }]}
      />
      <FacturasClient invoices={serialized} columns={cols} suppliers={suppliersDTO} todayYmd={todayYmd} />
    </div>
  );
}
