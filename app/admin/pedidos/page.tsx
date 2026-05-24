import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { OrderStatus, Prisma } from "@prisma/client";
import { isStripeConfigured, missingStripeEnv } from "@/lib/stripe/client";
import { STRIPE_ENV_VARS } from "@/lib/stripe/types";
import { toOrderSummary } from "@/lib/stripe/orders";
import { StripeNotConfigured } from "./StripeNotConfigured";
import { PedidosTable } from "./PedidosTable";
import { PosSale } from "./PosSale";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: OrderStatus | "ALL";
  from?: string;
  to?: string;
  page?: string;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const configured = isStripeConfigured();
  const missing = missingStripeEnv();
  const session = await auth().catch(() => null);
  const role = (session?.user?.role ?? "EDITOR") as "OWNER" | "EDITOR";

  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "ALL";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 25;

  const where: Prisma.OrderWhereInput = {};
  if (status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { stripeSessionId: { contains: q } },
      { stripePaymentIntentId: { contains: q } },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [total, ordersRaw, counts] = await Promise.all([
    db.order.count({ where }).catch(() => 0),
    db.order
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { items: true } } },
      })
      .catch(() => []),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }).catch(() => []),
  ]);

  const orders = ordersRaw.map(toOrderSummary);

  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<OrderStatus, number>;

  return (
    <div>
      <AdminPageHeader
        title="Pedidos"
        description="Venta en tienda (TPV físico) y pedidos del TPV online."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Pedidos" }]}
      />

      {/* TPV físico — disponible siempre, no depende de Stripe */}
      <PosSale />

      {!configured && (
        <div className="mb-6">
          <StripeNotConfigured
            missing={missing}
            envKeys={STRIPE_ENV_VARS}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://zonasport.es"}
          />
        </div>
      )}

      <PedidosTable
        orders={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ q, status, from, to }}
        counts={countMap}
        role={role}
      />
    </div>
  );
}
