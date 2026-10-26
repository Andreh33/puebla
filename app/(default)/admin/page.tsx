import Link from "next/link";
import {
  Package,
  FileText,
  Users,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  CheckCircle2,
  Euro,
  ShoppingCart,
  Receipt,
  Wallet,
  Boxes,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/KpiCard";
import { RecentActivity, type ActivityItem } from "@/components/admin/RecentActivity";
import { LeadsChart } from "@/components/admin/LeadsChart";
import { SalesChart } from "@/components/admin/SalesChart";
import { MonthlyOperatingBalanceCard } from "@/components/admin/MonthlyOperatingBalanceCard";
import {
  getProductCounts,
  getRecentLeads,
  getRecentImports,
  getBlogStats,
  getSettingsAlerts,
} from "@/lib/admin/dashboard-queries";
import {
  getSalesKpis,
  getSalesByDay,
  getTopProductos,
  startOfCurrentMonth,
  daysThisMonth,
} from "@/lib/admin/sales-queries";
import { getCurrentMonthOperatingSnapshot } from "@/lib/admin/dashboard-finance";
import { formatPriceEUR } from "@/lib/utils";
import { auth } from "@/lib/auth";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<"LOCAL" | "MIRAVIA" | "AMAZON", string> = {
  LOCAL: "Locales",
  MIRAVIA: "Miravia",
  AMAZON: "Amazon",
};

const IMPORT_STATUS_VARIANT: Record<
  "PENDING" | "RUNNING" | "DONE" | "FAILED",
  "default" | "secondary" | "success" | "warning" | "sale"
> = {
  PENDING: "secondary",
  RUNNING: "warning",
  DONE: "success",
  FAILED: "sale",
};

const SEVERITY_STYLES = {
  info: {
    border: "border-zs-blue-200",
    bg: "bg-zs-blue-50",
    text: "text-zs-blue-900",
    Icon: Info,
  },
  warning: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-900",
    Icon: AlertTriangle,
  },
  danger: {
    border: "border-zs-red-200",
    bg: "bg-zs-red-50",
    text: "text-zs-red-900",
    Icon: AlertCircle,
  },
} as const;

export default async function AdminDashboard() {
  const session = await auth();
  const [
    products,
    leads,
    imports,
    blog,
    alerts,
    salesKpis,
    salesByDay,
    topProductos,
    operatingSnapshot,
  ] = await Promise.all([
    getProductCounts(),
    getRecentLeads(7),
    getRecentImports(5),
    getBlogStats(),
    getSettingsAlerts(),
    getSalesKpis(daysThisMonth(), startOfCurrentMonth()),
    getSalesByDay(daysThisMonth(), startOfCurrentMonth()),
    getTopProductos(daysThisMonth(), 8, startOfCurrentMonth()),
    getCurrentMonthOperatingSnapshot(),
  ]);

  const activity: ActivityItem[] = [
    ...imports.map(
      (i): ActivityItem => ({
        id: i.id,
        kind: "import",
        title: i.fileName ?? `Importación ${i.source}`,
        subtitle: `${i.createdRows} nuevos · ${i.updatedRows} actualizados · ${i.errorRows} errores`,
        status: i.status,
        href: "/admin/importar/historial",
        createdAt: i.createdAt,
      }),
    ),
    ...leads.items.slice(0, 5).map(
      (l): ActivityItem => ({
        id: l.id,
        kind: "lead",
        title: l.name,
        subtitle: `${l.email}${l.sourcePage ? ` · ${l.sourcePage}` : ""}`,
        status: l.status,
        href: "/admin/leads",
        createdAt: l.createdAt,
      }),
    ),
    ...blog.recent
      .filter((p) => p.status === "PUBLISHED")
      .slice(0, 3)
      .map(
        (p): ActivityItem => ({
          id: p.id,
          kind: "post",
          title: p.title,
          subtitle: `/${p.slug}`,
          status: p.status,
          href: `/admin/blog`,
          createdAt: p.publishedAt ?? p.updatedAt,
        }),
      ),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zs-blue-900">
          Hola{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""} · Bienvenido
          al CRM
        </h1>
        <p className="mt-1 text-sm text-zs-muted">
          Resumen del estado del catálogo, leads recientes y acciones pendientes.
        </p>
      </div>

      {/* Ventas (este mes) */}
      <section aria-labelledby="sales-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="sales-heading"
            className="text-lg font-semibold text-zs-blue-900"
          >
            Ventas (este mes)
          </h2>
          <Link
            href="/admin/pedidos"
            className="text-sm font-semibold text-zs-blue-700 hover:underline"
          >
            Ver pedidos →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Ingresos"
            value={formatPriceEUR(salesKpis.ingresos)}
            hint={`${salesKpis.pedidos} ${salesKpis.pedidos === 1 ? "pedido" : "pedidos"}`}
            icon={Euro}
            tone="success"
          />
          <KpiCard
            label="Pedidos"
            value={salesKpis.pedidos}
            hint="Pagados y en curso"
            href="/admin/pedidos"
            icon={ShoppingCart}
          />
          <KpiCard
            label="Ticket medio"
            value={formatPriceEUR(salesKpis.ticketMedio)}
            hint="Ingresos / pedidos"
            icon={Receipt}
          />
          <KpiCard
            label="Beneficio"
            value={formatPriceEUR(salesKpis.beneficio)}
            hint="Margen bruto (coste congelado)"
            icon={Wallet}
            tone={salesKpis.beneficio > 0 ? "success" : "default"}
          />
          <KpiCard
            label="Unidades"
            value={salesKpis.unidades}
            hint={
              salesKpis.devueltos > 0
                ? `${formatPriceEUR(salesKpis.devueltos)} devueltos`
                : "Artículos vendidos"
            }
            icon={Boxes}
            tone={salesKpis.devueltos > 0 ? "warning" : "default"}
          />
        </div>

        <MonthlyOperatingBalanceCard snapshot={operatingSnapshot} />

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Ingresos por día
              </CardTitle>
              <Badge variant="outline">{formatPriceEUR(salesKpis.ingresos)} total</Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <SalesChart data={salesByDay} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top productos vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              {topProductos.length === 0 ? (
                <p className="text-sm text-zs-muted">Aún no hay ventas.</p>
              ) : (
                <ol className="space-y-2" aria-label="Productos más vendidos">
                  {topProductos.map((p, i) => (
                    <li
                      key={`${p.productName}-${i}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zs-surface text-xs font-semibold tabular-nums text-zs-muted">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium text-zs-ink">
                          {p.productName}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-zs-muted">
                        {p.unidades} uds · {formatPriceEUR(p.ingresos)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* KPIs */}
      <section aria-labelledby="kpis-heading">
        <h2 id="kpis-heading" className="sr-only">
          Indicadores clave
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Productos publicados"
            value={products.active}
            hint={`${products.total} en total`}
            href="/admin/productos?status=ACTIVE"
            icon={Package}
            tone="success"
          />
          <KpiCard
            label="Productos borrador"
            value={products.draft}
            hint="Pendientes de imagen o publicación"
            href="/admin/productos?status=DRAFT"
            icon={AlertCircle}
            tone={products.draft > 0 ? "warning" : "default"}
          />
          <KpiCard
            label="Sin imagen principal"
            value={products.withoutImage}
            hint="Asignar antes de publicar"
            href="/admin/productos?noImage=1"
            icon={ImageIcon}
            tone={products.withoutImage > 0 ? "danger" : "default"}
          />
          <KpiCard
            label="Leads (7 días)"
            value={leads.count}
            hint="Formulario de contacto"
            href="/admin/leads"
            icon={Users}
            tone={leads.count > 0 ? "success" : "default"}
          />
          <KpiCard
            label="Posts publicados"
            value={blog.published}
            hint={`${blog.draft} en borrador`}
            href="/admin/blog"
            icon={FileText}
          />
          <KpiCard
            label="Importaciones recientes"
            value={imports.length}
            hint="PRICAT, Miravia, Amazon"
            href="/admin/importar/historial"
            icon={Upload}
          />
        </div>
      </section>

      {/* Chart + Brands */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-zs-blue-700" aria-hidden="true" />
              Leads últimos 7 días
            </CardTitle>
            <Badge variant="outline">{leads.count} en total</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            <LeadsChart data={leads.dailyChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top marcas</CardTitle>
          </CardHeader>
          <CardContent>
            {products.byBrand.length === 0 ? (
              <p className="text-sm text-zs-muted">Aún no hay productos catalogados.</p>
            ) : (
              <ul className="space-y-3" aria-label="Distribución por marca">
                {products.byBrand.map((b) => {
                  const pct =
                    products.total > 0 ? Math.round((b.count / products.total) * 100) : 0;
                  return (
                    <li key={b.brandId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-zs-ink">{b.brandName}</span>
                        <span className="tabular-nums text-zs-muted">
                          {b.count} · {pct}%
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-zs-surface"
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full bg-zs-blue-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {products.bySource.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-zs-border pt-4">
                {products.bySource.map((s) => (
                  <Badge key={s.source} variant="outline" className="gap-1">
                    {SOURCE_LABEL[s.source]}
                    <span className="font-bold tabular-nums">{s.count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Acciones rápidas */}
      <section aria-labelledby="quick-actions-heading">
        <h2
          id="quick-actions-heading"
          className="mb-4 text-lg font-semibold text-zs-blue-900"
        >
          Acciones rápidas
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/importar/xlsx">Importar PRICAT (xlsx)</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/productos/nuevo">Crear producto manual</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/blog/nuevo">Nuevo post de blog</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/imagenes">Galería de imágenes</Link>
          </Button>
        </div>
      </section>

      {/* Alertas + actividad */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas de configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Sin alertas pendientes. ¡Buen trabajo!
              </div>
            ) : (
              alerts.map((a) => {
                const sev = SEVERITY_STYLES[a.severity];
                return (
                  <div
                    key={a.id}
                    className={`flex gap-3 rounded-xl border ${sev.border} ${sev.bg} p-3 ${sev.text}`}
                  >
                    <sev.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="mt-0.5 text-xs">{a.description}</p>
                      {a.href && (
                        <Link
                          href={a.href}
                          className="mt-1 inline-block text-xs font-semibold underline-offset-2 hover:underline"
                        >
                          Resolver â†’
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <RecentActivity items={activity} />
      </section>
    </div>
  );
}
