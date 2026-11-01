import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PromocionesClient, type PromoDTO } from "./PromocionesClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promociones · Admin" };

export default async function PromocionesPage() {
  const rows = await db.promoCode.findMany({ orderBy: { createdAt: "desc" } }).catch(() => []);

  // Nº de usos por código = pedidos que lo llevan en metadata.promoCode.
  const usage = await Promise.all(
    rows.map((r) =>
      db.order
        .count({
          where: {
            metadata: { path: ["promoCode"], equals: r.code },
            status: { notIn: ["REFUNDED", "CANCELLED"] },
          },
        })
        .catch(() => 0),
    ),
  );

  const promos: PromoDTO[] = rows.map((r, i) => ({
    id: r.id,
    code: r.code,
    description: r.description,
    discountType: r.discountType === "FIXED" ? "FIXED" : "PERCENT",
    value: Number(r.value),
    active: r.active,
    startsAt: r.startsAt ? r.startsAt.toISOString().slice(0, 10) : null,
    endsAt: r.endsAt ? r.endsAt.toISOString().slice(0, 10) : null,
    minSubtotal: r.minSubtotal != null ? Number(r.minSubtotal) : null,
    maxRedemptions: r.maxRedemptions,
    used: usage[i] ?? 0,
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promociones"
        description="Códigos de descuento para la web y el TPV. El descuento se aplica rebajando el importe del pedido (la factura y los reembolsos siguen cuadrando)."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Promociones" }]}
      />
      <PromocionesClient promos={promos} />
    </div>
  );
}
