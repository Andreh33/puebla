import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

const DAYS = 30;

/** Hoy (medianoche) en horario peninsular, como Date (YYYY-MM-DD UTC). */
function madridToday(): Date {
  const ymd = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Madrid" });
  return new Date(ymd);
}

export default async function VisitasPage() {
  const today = madridToday();
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const [byDay, byPath, totalAgg] = await Promise.all([
    db.pageView.groupBy({
      by: ["day"],
      where: { day: { gte: since } },
      _sum: { count: true },
    }),
    db.pageView.groupBy({
      by: ["path"],
      where: { day: { gte: since } },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 15,
    }),
    db.pageView.aggregate({ where: { day: { gte: since } }, _sum: { count: true } }),
  ]);

  const total = totalAgg._sum.count ?? 0;

  // Rellena los DAYS días (incluidos los de 0 visitas) para la gráfica.
  const countByDay = new Map<string, number>();
  for (const r of byDay) {
    countByDay.set(r.day.toISOString().slice(0, 10), r._sum.count ?? 0);
  }
  const series: Array<{ date: Date; key: string; count: number }> = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: d, key, count: countByDay.get(key) ?? 0 });
  }
  const maxDay = Math.max(1, ...series.map((s) => s.count));

  const topPaths = byPath.map((r) => ({ path: r.path, count: r._sum.count ?? 0 }));
  const maxPath = Math.max(1, ...topPaths.map((p) => p.count));

  const fmtDay = (d: Date) =>
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Visitas"
        description={`Analítica propia · últimos ${DAYS} días`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Visitas" }]}
      />

      {total === 0 ? (
        <div className="rounded-xl border border-zs-border bg-white p-8 text-center text-sm text-zs-muted">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-zs-muted" aria-hidden />
          Todavía no hay visitas registradas en los últimos {DAYS} días.
          <p className="mx-auto mt-2 max-w-md text-xs">
            Se cuentan las visitas de quienes aceptan las cookies de analítica. Empezarán a
            aparecer aquí en cuanto haya tráfico tras el despliegue.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label={`Visitas (${DAYS} días)`} value={total.toLocaleString("es-ES")} />
            <Stat
              label="Páginas distintas"
              value={topPaths.length >= 15 ? "15+" : String(topPaths.length)}
            />
          </div>

          <section className="rounded-xl border border-zs-border bg-white p-4">
            <h2 className="mb-4 text-sm font-semibold text-zs-ink">Visitas por día</h2>
            <div className="flex h-40 items-end gap-1">
              {series.map((s) => (
                <div
                  key={s.key}
                  className="flex flex-1 flex-col items-center justify-end"
                  title={`${fmtDay(s.date)}: ${s.count} ${s.count === 1 ? "visita" : "visitas"}`}
                >
                  <div
                    className="w-full rounded-t bg-zs-blue-600/80 transition-colors hover:bg-zs-blue-700"
                    style={{ height: `${Math.max(2, (s.count / maxDay) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-zs-muted">
              <span>{fmtDay(series[0]!.date)}</span>
              <span>{fmtDay(series[series.length - 1]!.date)}</span>
            </div>
          </section>

          <section className="rounded-xl border border-zs-border bg-white p-4">
            <h2 className="mb-4 text-sm font-semibold text-zs-ink">Páginas más vistas</h2>
            <ul className="space-y-2">
              {topPaths.map((p) => (
                <li key={p.path} className="flex items-center gap-3 text-sm">
                  <Link
                    href={p.path}
                    target="_blank"
                    className="w-56 shrink-0 truncate text-zs-blue-700 hover:underline sm:w-72"
                    title={p.path}
                  >
                    {p.path}
                  </Link>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zs-surface">
                    <div
                      className="h-full rounded-full bg-zs-blue-600"
                      style={{ width: `${(p.count / maxPath) * 100}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-medium tabular-nums">
                    {p.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zs-border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-zs-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-zs-ink">{value}</p>
    </div>
  );
}
