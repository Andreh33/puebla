import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine, ArrowRight } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { OrderStatus, Prisma } from "@prisma/client";
import { isStripeConfigured, missingStripeEnv } from "@/lib/stripe/client";
import { STRIPE_ENV_VARS } from "@/lib/stripe/types";
import { toOrderSummary } from "@/lib/stripe/orders";
import { SOLD_STATUSES } from "@/lib/admin/sales-queries";
import { StripeNotConfigured } from "./StripeNotConfigured";
import { PedidosTable } from "./PedidosTable";
import { buildOrderSeries } from "@/lib/admin/order-series";

export const metadata: Metadata = { title: "Pedidos" };
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: OrderStatus | "ALL";
  from?: string;
  to?: string;
  all?: string;
  page?: string;
}

/** "YYYY-MM-DD" de hoy y del día 1 del mes actual, en hora local. */
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const showAll = sp.all === "1";
  const now = new Date();
  const monthStartYmd = localYmd(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayLocalYmd = localYmd(now);
  // Por defecto (sin filtro ni "todo el histórico") mostramos EL MES ACTUAL: el
  // contador arranca el día 1 y se resetea solo al cambiar de mes. Con filtros o
  // "Todo el histórico" se puede revisar cualquier periodo.
  let from = sp.from ?? "";
  let to = sp.to ?? "";
  if (!showAll && !from && !to) {
    from = monthStartYmd;
    to = todayLocalYmd;
  }
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 25;

  // Filtro base = fecha + búsqueda (SIN estado): lo usan los contadores por
  // estado (para que cada estado muestre su nº en el periodo) y los ingresos.
  const whereBase: Prisma.OrderWhereInput = {};
  if (q) {
    whereBase.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { stripeSessionId: { contains: q } },
      { stripePaymentIntentId: { contains: q } },
    ];
  }
  if (from || to) {
    whereBase.createdAt = {};
    if (from) whereBase.createdAt.gte = new Date(from);
    // `to` inclusivo: hasta el final del día indicado.
    if (to) whereBase.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }
  // Filtro de la tabla = base + estado.
  const where: Prisma.OrderWhereInput = { ...whereBase };
  if (status !== "ALL") where.status = status;

  const [total, ordersRaw, counts, chartOrders, revenueAgg] = await Promise.all([
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
    // Contadores por estado DEL PERIODO (respetan fecha + búsqueda, no el estado).
    db.order.groupBy({ by: ["status"], where: whereBase, _count: { _all: true } }).catch(() => []),
    // Serie para la gráfica: MISMO filtro que la tabla, sin paginar.
    db.order
      .findMany({ where, select: { createdAt: true, total: true }, orderBy: { createdAt: "asc" } })
      .catch(() => []),
    // Ingresos del periodo (ventas no canceladas/reembolsadas), según el filtro.
    db.order
      .aggregate({ where: { ...whereBase, status: { in: [...SOLD_STATUSES] } }, _sum: { total: true } })
      .catch(() => ({ _sum: { total: null } })),
  ]);

  const periodRevenue = Number(revenueAgg._sum.total ?? 0);

  const orders = ordersRaw.map(toOrderSummary);

  // Evolución de pedidos para la gráfica (rango efectivo: from/to o, si "todo",
  // desde el pedido más antiguo del conjunto hasta hoy).
  const todayYmd = new Date().toISOString().slice(0, 10);
  const points = chartOrders.map((o) => ({
    day: o.createdAt.toISOString().slice(0, 10),
    total: Number(o.total),
  }));
  const chartData = buildOrderSeries(points, from || points[0]?.day || todayYmd, to || todayYmd);

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

      {/* TPV físico — pantalla completa en su propia ruta /admin/tpv */}
      <Link
        href="/admin/tpv"
        className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-zs-border bg-gradient-to-r from-zs-blue-950 to-zs-blue-800 p-5 text-white shadow-sm transition-shadow hover:shadow-zs-blue-glow"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <ScanLine className="h-6 w-6 text-zs-yellow-400" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">Venta en tienda (TPV físico)</h2>
            <p className="text-sm text-white/70">
              Abre la caja a pantalla completa: busca por SKU, pulsa la talla y cobra al instante.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zs-blue-900 transition-transform group-hover:translate-x-0.5">
          Abrir TPV
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>

      {!configured && (
        <div className="mb-6">
          <StripeNotConfigured
            missing={missing}
            envKeys={STRIPE_ENV_VARS}
            siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://zonasport.vercel.app"}
          />
        </div>
      )}

      <PedidosTable
        orders={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ q, status, from, to }}
        showAll={showAll}
        periodRevenue={periodRevenue}
        counts={countMap}
        role={role}
        chartData={chartData}
      />
    </div>
  );
}
