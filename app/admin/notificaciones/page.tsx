import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { NotificationsClient, type MarketplaceNotificationDTO } from "./NotificationsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notificaciones · Admin" };

export default async function NotificationsPage() {
  const result = await db
    .$transaction([
      db.marketplaceRemovalNotification.findMany({
        where: { resolvedAt: null },
        orderBy: { lastSoldAt: "desc" },
        take: 500,
      }),
      db.marketplaceRemovalNotification.count({ where: { resolvedAt: null } }),
    ])
    .then(([rows, totalCount]) => ({ rows, totalCount, loadError: false }))
    .catch(() => ({ rows: [], totalCount: 0, loadError: true }));

  const notifications: MarketplaceNotificationDTO[] = result.rows.map((row) => ({
    id: row.id,
    marketplace: row.marketplace,
    productId: row.productId,
    productName: row.productName,
    productSku: row.productSku,
    quantitySold: row.quantitySold,
    saleCount: row.saleCount,
    lastOrderId: row.lastOrderId,
    firstSoldAt: row.firstSoldAt.toISOString(),
    lastSoldAt: row.lastSoldAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notificaciones"
        description="Avisos persistentes de productos vendidos que siguen publicados en marketplaces. Solo desaparecen cuando confirmas que ya los has retirado."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Notificaciones" }]}
      />
      <NotificationsClient
        notifications={notifications}
        totalCount={result.totalCount}
        loadError={result.loadError}
      />
    </div>
  );
}
