import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReservasClient, type ReservationDTO } from "./ReservasClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reservas WhatsApp · Admin" };

export default async function ReservasPage() {
  const rows = await db.whatsappReservation
    .findMany({ orderBy: { createdAt: "desc" }, take: 500 })
    .catch(() => []);

  const reservations: ReservationDTO[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    productName: r.productName,
    sku: r.sku,
    size: r.size,
    itemsCount: r.itemsCount,
    amount: r.amount != null ? Number(r.amount) : null,
    summary: r.summary,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reservas por WhatsApp"
        description="Cuando un cliente pulsa «Reservar por WhatsApp» (producto o carrito) queda registrado aquí. Es la intención de reserva; el mensaje se envía ya en WhatsApp."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Reservas" }]}
      />
      <ReservasClient reservations={reservations} />
    </div>
  );
}
