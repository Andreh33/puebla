"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GripVertical,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { cn, formatPriceEUR } from "@/lib/utils";
import {
  FAMILY_LABELS,
  GENDER_LABELS,
  type BalanceData,
  type FamilyTable,
  type GenderRow,
  type Metrics,
  type Period,
} from "@/lib/admin/balance-types";

const WIDGET_IDS = ["textil", "calzado", "complemento", "general", "mensual"] as const;
type WidgetId = (typeof WIDGET_IDS)[number];
const STORAGE_KEY = "zs:balance:layout:v1";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "mes", label: "Este mes" },
  { value: "ano", label: "Este año" },
  { value: "todo", label: "Histórico" },
];

const nf = new Intl.NumberFormat("es-ES");

export function BalanceClient({ data }: { data: BalanceData }) {
  const router = useRouter();
  const [order, setOrder] = React.useState<WidgetId[]>([...WIDGET_IDS]);
  const [hidden, setHidden] = React.useState<WidgetId[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const dragId = React.useRef<WidgetId | null>(null);

  // Cargar/persistir diseño en localStorage (por navegador).
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { order?: WidgetId[]; hidden?: WidgetId[] };
        const valid = (saved.order ?? []).filter((id) => WIDGET_IDS.includes(id));
        const merged = [...valid, ...WIDGET_IDS.filter((id) => !valid.includes(id))];
        setOrder(merged);
        setHidden((saved.hidden ?? []).filter((id) => WIDGET_IDS.includes(id)));
      }
    } catch {
      /* sin persistencia */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
    } catch {
      /* noop */
    }
  }, [order, hidden, hydrated]);

  function move(id: WidgetId, dir: -1 | 1) {
    setOrder((cur) => {
      const i = cur.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }

  function reorderTo(target: WidgetId) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === target) return;
    setOrder((cur) => {
      const next = cur.filter((x) => x !== from);
      const ti = next.indexOf(target);
      next.splice(ti, 0, from);
      return next;
    });
  }

  const hide = (id: WidgetId) => setHidden((h) => [...new Set([...h, id])]);
  const show = (id: WidgetId) => setHidden((h) => h.filter((x) => x !== id));
  const resetLayout = () => {
    setOrder([...WIDGET_IDS]);
    setHidden([]);
  };

  const familyById = (id: WidgetId): FamilyTable | undefined =>
    data.families.find((f) => f.family === id);

  function renderWidget(id: WidgetId): React.ReactNode {
    if (id === "general") {
      return (
        <Card
          id={id}
          title="Resumen por género"
          subtitle="Suma de todas las familias"
          onHide={hide}
          onUp={() => move(id, -1)}
          onDown={() => move(id, 1)}
          onDragStart={() => (dragId.current = id)}
          onDrop={() => reorderTo(id)}
        >
          <MetricsTable firstColLabel="Género" rows={data.byGender} total={data.grandTotal} />
        </Card>
      );
    }
    if (id === "mensual") {
      return (
        <Card
          id={id}
          title="Beneficio por mes"
          subtitle="Últimos 12 meses"
          onHide={hide}
          onUp={() => move(id, -1)}
          onDown={() => move(id, 1)}
          onDragStart={() => (dragId.current = id)}
          onDrop={() => reorderTo(id)}
        >
          <MonthlyTable rows={data.profitByMonth} />
        </Card>
      );
    }
    const fam = familyById(id);
    if (!fam) return null;
    return (
      <Card
        id={id}
        title={FAMILY_LABELS[fam.family]}
        onHide={hide}
        onUp={() => move(id, -1)}
        onDown={() => move(id, 1)}
        onDragStart={() => (dragId.current = id)}
        onDrop={() => reorderTo(id)}
      >
        <MetricsTable firstColLabel="Género" rows={fam.rows} total={fam.total} />
      </Card>
    );
  }

  const visible = order.filter((id) => !hidden.includes(id));

  return (
    <div className="space-y-4">
      {/* Barra: periodo + restaurar diseño */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-zs-border bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => router.push(`/admin/balance?period=${p.value}`)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                data.period === p.value
                  ? "bg-zs-blue-900 text-white"
                  : "text-zs-ink hover:bg-zs-surface",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zs-border bg-white px-3 py-1.5 text-xs font-semibold text-zs-ink hover:bg-zs-surface"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar diseño
        </button>
      </div>

      {/* Tablas ocultas → chips para volver a mostrarlas */}
      {hidden.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-zs-border bg-zs-surface/50 p-3 text-xs">
          <span className="font-semibold text-zs-muted">Ocultas:</span>
          {order
            .filter((id) => hidden.includes(id))
            .map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => show(id)}
                className="inline-flex items-center gap-1 rounded-full border border-zs-border bg-white px-2.5 py-1 font-medium text-zs-ink hover:border-zs-blue-700 hover:text-zs-blue-700"
              >
                + {WIDGET_TITLE[id]}
              </button>
            ))}
        </div>
      )}

      {/* Widgets */}
      <div className="grid gap-4">
        {visible.map((id) => (
          <div key={id}>{renderWidget(id)}</div>
        ))}
      </div>

      <p className="text-center text-xs text-zs-muted">
        Arrastra el icono <GripVertical className="inline h-3 w-3" /> o usa las flechas para
        reordenar. Los datos salen en vivo de la tienda (cada venta descuenta stock y suma a
        ventas/beneficio).
      </p>
    </div>
  );
}

const WIDGET_TITLE: Record<WidgetId, string> = {
  textil: "Textil",
  calzado: "Calzado",
  complemento: "Complementos",
  general: "Resumen por género",
  mensual: "Beneficio por mes",
};

// ---------------------------------------------------------------------------
// Tarjeta contenedora (reordenable / ocultable)
// ---------------------------------------------------------------------------

function Card({
  id,
  title,
  subtitle,
  children,
  onHide,
  onUp,
  onDown,
  onDragStart,
  onDrop,
}: {
  id: WidgetId;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onHide: (id: WidgetId) => void;
  onUp: () => void;
  onDown: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  return (
    <section
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="overflow-hidden rounded-xl border border-zs-border bg-white"
    >
      <header
        draggable
        onDragStart={onDragStart}
        className="flex cursor-grab items-center gap-2 border-b border-zs-border bg-zs-surface/60 px-3 py-2 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 text-zs-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-zs-ink">{title}</h2>
          {subtitle && <p className="truncate text-[11px] text-zs-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconBtn label="Subir" onClick={onUp}>
            <ArrowUp className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Bajar" onClick={onDown}>
            <ArrowDown className="h-4 w-4" />
          </IconBtn>
          <IconBtn label="Ocultar" onClick={() => onHide(id)}>
            <EyeOff className="h-4 w-4" />
          </IconBtn>
        </div>
      </header>
      <div className="overflow-x-auto p-1">{children}</div>
    </section>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-7 w-7 place-items-center rounded-md text-zs-muted transition-colors hover:bg-white hover:text-zs-blue-900"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tabla de métricas (familia o resumen por género)
// ---------------------------------------------------------------------------

function MetricsTable({
  firstColLabel,
  rows,
  total,
}: {
  firstColLabel: string;
  rows: GenderRow[];
  total: Metrics;
}) {
  if (rows.length === 0) {
    return <p className="px-3 py-4 text-sm text-zs-muted">Sin datos en este periodo.</p>;
  }
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-zs-muted">
          <th className="px-3 py-2">{firstColLabel}</th>
          <th className="px-3 py-2 text-right">Coste</th>
          <th className="px-3 py-2 text-right">Stock</th>
          <th className="px-3 py-2 text-right">Vendidas</th>
          <th className="px-3 py-2 text-right">Ventas</th>
          <th className="px-3 py-2 text-right">Beneficio</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <MetricsRow key={r.gender} label={GENDER_LABELS[r.gender]} m={r.metrics} />
        ))}
        <MetricsRow label="TOTAL" m={total} total />
      </tbody>
    </table>
  );
}

function MetricsRow({ label, m, total }: { label: string; m: Metrics; total?: boolean }) {
  return (
    <tr
      className={cn(
        "border-t border-zs-border",
        total ? "bg-zs-surface/70 font-bold" : "hover:bg-zs-surface/40",
      )}
    >
      <td className="px-3 py-2">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPriceEUR(m.coste)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{nf.format(m.stock)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{nf.format(m.vendidas)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatPriceEUR(m.ventas)}</td>
      <td
        className={cn(
          "px-3 py-2 text-right tabular-nums",
          m.beneficio < 0 ? "text-zs-red-600" : total ? "text-emerald-700" : "",
        )}
      >
        {formatPriceEUR(m.beneficio)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Tabla de beneficio por mes (con mini-barras)
// ---------------------------------------------------------------------------

function MonthlyTable({
  rows,
}: {
  rows: Array<{ month: string; label: string; beneficio: number; ventas: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.beneficio)));
  const totalBen = Math.round(rows.reduce((a, r) => a + r.beneficio, 0) * 100) / 100;
  const totalVen = Math.round(rows.reduce((a, r) => a + r.ventas, 0) * 100) / 100;
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-zs-muted">
          <th className="px-3 py-2">Mes</th>
          <th className="px-3 py-2 text-right">Ventas</th>
          <th className="px-3 py-2 text-right">Beneficio</th>
          <th className="px-3 py-2">&nbsp;</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.month} className="border-t border-zs-border hover:bg-zs-surface/40">
            <td className="px-3 py-2 capitalize">{r.label}</td>
            <td className="px-3 py-2 text-right tabular-nums">{formatPriceEUR(r.ventas)}</td>
            <td
              className={cn(
                "px-3 py-2 text-right tabular-nums",
                r.beneficio < 0 ? "text-zs-red-600" : "",
              )}
            >
              {formatPriceEUR(r.beneficio)}
            </td>
            <td className="px-3 py-2">
              <div className="h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-zs-surface">
                <div
                  className={cn(
                    "h-full rounded-full",
                    r.beneficio < 0 ? "bg-zs-red-600" : "bg-emerald-600",
                  )}
                  style={{ width: `${(Math.abs(r.beneficio) / max) * 100}%` }}
                />
              </div>
            </td>
          </tr>
        ))}
        <tr className="border-t border-zs-border bg-zs-surface/70 font-bold">
          <td className="px-3 py-2 inline-flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-700" /> TOTAL
          </td>
          <td className="px-3 py-2 text-right tabular-nums">{formatPriceEUR(totalVen)}</td>
          <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
            {formatPriceEUR(totalBen)}
          </td>
          <td className="px-3 py-2">&nbsp;</td>
        </tr>
      </tbody>
    </table>
  );
}
