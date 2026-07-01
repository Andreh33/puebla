"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  GripVertical,
  SlidersHorizontal,
  Users,
  Pencil,
  Check,
  Receipt,
  Wallet,
  Clock,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  invoiceTotal,
  invoiceOutstanding,
  invoiceStatus,
  totalInvoiced,
  totalPaid,
  totalOutstanding,
  outstandingInMonth,
  spendByMonth,
  spendBySupplier,
  filterInvoices,
  type InvoiceStatus,
  type InvoiceFilter,
} from "@/lib/admin/supplier-invoices";
import {
  createInvoiceAction,
  updateInvoiceFieldAction,
  deleteInvoiceAction,
  addDueDateAction,
  updateDueDateAction,
  setDueDatePaidAction,
  deleteDueDateAction,
  createColumnAction,
  renameColumnAction,
  reorderColumnsAction,
  resizeColumnAction,
  deleteColumnAction,
  setCustomValueAction,
  createSupplierAction,
  renameSupplierAction,
  deleteSupplierAction,
} from "./_actions";

export type DueDTO = { id: string; dueDate: string; amount: number; paid: boolean };
export type ColumnDTO = { id: string; name: string; position: number; width: number };
export type SupplierDTO = { id: string; name: string };
export type InvoiceDTO = {
  id: string;
  supplier: string;
  brandLabel: string | null;
  invoiceNumber: string | null;
  concept: string | null;
  issueDate: string;
  notes: string | null;
  dueDates: DueDTO[];
  customValues: Record<string, string>;
};

type EditableField = "supplier" | "brandLabel" | "invoiceNumber" | "concept" | "issueDate" | "notes";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmt = (n: number) => EUR.format(n);

/** Suma `delta` meses a un "YYYY-MM" (Date.UTC normaliza el cruce de año). */
function addMonthToYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → "30 jun 2026". */
function formatDueDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const STATUS_META: Record<InvoiceStatus, { label: string; row: string; badge: string }> = {
  paid: { label: "Pagada", row: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  overdue: { label: "Vencida", row: "bg-red-50", badge: "bg-red-100 text-red-800 border border-red-200" },
  pending: { label: "Pendiente", row: "bg-amber-50", badge: "bg-amber-100 text-amber-900 border border-amber-200" },
  empty: { label: "Sin vencimientos", row: "", badge: "bg-zs-surface text-zs-muted border border-zs-border" },
};

/** Ejecuta una server action sin que un rechazo (p. ej. sesión caducada, que
 *  hace que requireSession lance ANTES del try/catch de la action) escape al
 *  handler: lo normaliza a {ok:false} para que siempre haya rollback + aviso. */
async function safeAction<T extends { ok: boolean; error?: string }>(
  run: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await run();
  } catch {
    return { ok: false, error: "No se pudo guardar. ¿Quizá caducó la sesión? Recarga la página." };
  }
}

export function FacturasClient({
  invoices,
  columns,
  suppliers,
  todayYmd,
}: {
  invoices: InvoiceDTO[];
  columns: ColumnDTO[];
  suppliers: SupplierDTO[];
  todayYmd: string;
}) {
  const [rows, setRows] = React.useState<InvoiceDTO[]>(invoices);
  const [cols, setCols] = React.useState<ColumnDTO[]>(columns);
  const [sups, setSups] = React.useState<SupplierDTO[]>(suppliers);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | InvoiceStatus>("all");
  const [supplierFilter, setSupplierFilter] = React.useState<string>(""); // "" = todos
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [minAmount, setMinAmount] = React.useState("");
  const [maxAmount, setMaxAmount] = React.useState("");
  const [month, setMonth] = React.useState(todayYmd.slice(0, 7));
  const [creating, setCreating] = React.useState(false);

  // El estado local (rows/cols) es la fuente de verdad durante la sesión: NO lo
  // resincronizamos con las props en cada revalidación. Hacerlo pisaba ediciones
  // en vuelo — p. ej. la fecha de un vencimiento recién creado "se iba a hoy"
  // cuando el refresh de la creación llegaba tarde. Al navegar fuera y volver, el
  // componente se remonta con datos frescos del servidor.

  const colSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // --- mutadores optimistas (rollback + toast si la acción falla) -----------
  const patchInvoice = (id: string, patch: Partial<InvoiceDTO>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const patchDue = (invId: string, dueId: string, patch: Partial<DueDTO>) =>
    setRows((rs) =>
      rs.map((r) =>
        r.id === invId
          ? { ...r, dueDates: r.dueDates.map((d) => (d.id === dueId ? { ...d, ...patch } : d)) }
          : r,
      ),
    );

  async function commitField(id: string, field: EditableField, value: string, prev: string) {
    // Solo estos campos admiten null (vacío = null). supplier e issueDate son
    // NOT NULL: el vacío se queda como "" y lo rechaza el servidor (rollback).
    const nullable = field === "brandLabel" || field === "invoiceNumber" || field === "concept" || field === "notes";
    const next: string | null = value === "" && nullable ? null : value;
    patchInvoice(id, { [field]: next } as Partial<InvoiceDTO>);
    const res = await safeAction(() => updateInvoiceFieldAction(id, field, value));
    if (!res.ok) {
      patchInvoice(id, { [field]: prev } as Partial<InvoiceDTO>);
      toast.error(res.error);
    }
  }

  async function addInvoice() {
    setCreating(true);
    try {
      const res = await safeAction(() => createInvoiceAction());
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const id = res.id;
      // Idempotente por id: si la revalidación del RSC ya trajo la fila, no la
      // duplicamos.
      setRows((rs) =>
        rs.some((r) => r.id === id)
          ? rs
          : [
              { id, supplier: "", brandLabel: null, invoiceNumber: null, concept: null, issueDate: todayYmd, notes: null, dueDates: [], customValues: {} },
              ...rs,
            ],
      );
    } finally {
      setCreating(false);
    }
  }

  async function removeInvoice(id: string) {
    const snapshot = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    const res = await safeAction(() => deleteInvoiceAction(id));
    if (!res.ok) {
      setRows(snapshot);
      toast.error(res.error);
    }
  }

  async function addDue(invId: string) {
    const res = await safeAction(() => addDueDateAction(invId, todayYmd, "0"));
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const dueId = res.id;
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== invId) return r;
        if (r.dueDates.some((d) => d.id === dueId)) return r; // ya traído por revalidación
        return { ...r, dueDates: [...r.dueDates, { id: dueId, dueDate: todayYmd, amount: 0, paid: false }] };
      }),
    );
  }

  async function commitDue(invId: string, dueId: string, patch: { dueDate?: string; amount?: string }, prev: Partial<DueDTO>) {
    const optimistic: Partial<DueDTO> = {};
    if (patch.dueDate !== undefined) optimistic.dueDate = patch.dueDate;
    if (patch.amount !== undefined) optimistic.amount = Number(patch.amount.replace(",", ".")) || 0;
    patchDue(invId, dueId, optimistic);
    const res = await safeAction(() => updateDueDateAction(dueId, patch));
    if (!res.ok) {
      patchDue(invId, dueId, prev);
      toast.error(res.error);
    }
  }

  async function toggleDuePaid(invId: string, dueId: string, paid: boolean) {
    patchDue(invId, dueId, { paid });
    const res = await safeAction(() => setDueDatePaidAction(dueId, paid));
    if (!res.ok) {
      patchDue(invId, dueId, { paid: !paid });
      toast.error(res.error);
    }
  }

  async function removeDue(invId: string, dueId: string) {
    const snapshot = rows;
    setRows((rs) =>
      rs.map((r) => (r.id === invId ? { ...r, dueDates: r.dueDates.filter((d) => d.id !== dueId) } : r)),
    );
    const res = await safeAction(() => deleteDueDateAction(dueId));
    if (!res.ok) {
      setRows(snapshot);
      toast.error(res.error);
    }
  }

  // --- columnas personalizadas ----------------------------------------------
  async function addColumn() {
    const res = await safeAction(() => createColumnAction("Columna"));
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const id = res.id;
    setCols((cs) =>
      cs.some((c) => c.id === id) ? cs : [...cs, { id, name: "Columna", position: cs.length + 1, width: 160 }],
    );
  }

  async function commitColumnName(id: string, name: string, prev: string) {
    const n = name.trim() || prev;
    setCols((cs) => cs.map((c) => (c.id === id ? { ...c, name: n } : c)));
    const res = await safeAction(() => renameColumnAction(id, n));
    if (!res.ok) {
      setCols((cs) => cs.map((c) => (c.id === id ? { ...c, name: prev } : c)));
      toast.error(res.error);
    }
  }

  async function onColumnDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = cols.findIndex((c) => c.id === e.active.id);
    const newIdx = cols.findIndex((c) => c.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const snapshot = cols;
    const next = arrayMove(cols, oldIdx, newIdx);
    setCols(next);
    const res = await safeAction(() => reorderColumnsAction(next.map((c) => c.id)));
    if (!res.ok) {
      setCols(snapshot);
      toast.error(res.error);
    }
  }

  async function removeColumn(id: string) {
    const snapshot = cols;
    setCols((cs) => cs.filter((c) => c.id !== id));
    const res = await safeAction(() => deleteColumnAction(id));
    if (!res.ok) {
      setCols(snapshot);
      toast.error(res.error);
    }
  }

  function startResize(e: React.MouseEvent, id: string, startWidth: number) {
    e.preventDefault();
    const startX = e.clientX;
    let latest = startWidth;
    const onMove = (ev: MouseEvent) => {
      latest = Math.max(80, Math.min(600, startWidth + (ev.clientX - startX)));
      setCols((cs) => cs.map((c) => (c.id === id ? { ...c, width: latest } : c)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      void safeAction(() => resizeColumnAction(id, latest)).then((r) => {
        if (!r.ok) {
          setCols((cs) => cs.map((c) => (c.id === id ? { ...c, width: startWidth } : c)));
          toast.error(r.error);
        }
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  async function commitCustomValue(invoiceId: string, columnId: string, value: string, prev: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.id === invoiceId ? { ...r, customValues: { ...r.customValues, [columnId]: value } } : r,
      ),
    );
    const res = await safeAction(() => setCustomValueAction(invoiceId, columnId, value));
    if (!res.ok) {
      setRows((rs) =>
        rs.map((r) =>
          r.id === invoiceId ? { ...r, customValues: { ...r.customValues, [columnId]: prev } } : r,
        ),
      );
      toast.error(res.error);
    }
  }

  // --- registro de proveedores (lista guardada del desplegable) --------------
  /** Inserta un proveedor en el registro (idempotente por nombre) y devuelve su
   *  nombre canónico, o null si falló. Lo usa el combobox de la celda. */
  async function createSupplier(name: string): Promise<string | null> {
    const res = await safeAction(() => createSupplierAction(name));
    if (!res.ok) {
      toast.error(res.error);
      return null;
    }
    setSups((ss) => (ss.some((s) => s.id === res.id) ? ss : [...ss, { id: res.id, name: res.name }].sort((a, b) => a.name.localeCompare(b.name))));
    return res.name;
  }

  async function renameSupplier(id: string, name: string, prev: string) {
    const n = name.trim();
    if (!n || n === prev) return;
    setSups((ss) => ss.map((s) => (s.id === id ? { ...s, name: n } : s)).sort((a, b) => a.name.localeCompare(b.name)));
    // Renombrar propaga a las facturas locales que usaban el nombre anterior.
    setRows((rs) => rs.map((r) => (r.supplier === prev ? { ...r, supplier: n } : r)));
    const res = await safeAction(() => renameSupplierAction(id, n));
    if (!res.ok) {
      setSups((ss) => ss.map((s) => (s.id === id ? { ...s, name: prev } : s)).sort((a, b) => a.name.localeCompare(b.name)));
      setRows((rs) => rs.map((r) => (r.supplier === n ? { ...r, supplier: prev } : r)));
      toast.error(res.error);
    }
  }

  async function removeSupplier(id: string) {
    const snapshot = sups;
    setSups((ss) => ss.filter((s) => s.id !== id));
    const res = await safeAction(() => deleteSupplierAction(id));
    if (!res.ok) {
      setSups(snapshot);
      toast.error(res.error);
    }
  }

  const supplierOptions = React.useMemo(
    () => sups.map((s) => ({ value: s.name, label: s.name })),
    [sups],
  );

  // --- filtros + derivados ---------------------------------------------------
  const filter: InvoiceFilter = React.useMemo(
    () => ({
      supplier: supplierFilter,
      from,
      to,
      min: minAmount.trim() === "" ? null : Number(minAmount.replace(",", ".")),
      max: maxAmount.trim() === "" ? null : Number(maxAmount.replace(",", ".")),
      status: statusFilter,
      text: search,
      today: todayYmd,
    }),
    [supplierFilter, from, to, minAmount, maxAmount, statusFilter, search, todayYmd],
  );

  const filtered = React.useMemo(() => filterInvoices(rows, filter), [rows, filter]);

  const filtersActive =
    supplierFilter !== "" ||
    from !== "" ||
    to !== "" ||
    minAmount !== "" ||
    maxAmount !== "" ||
    statusFilter !== "all" ||
    search.trim() !== "";

  function clearFilters() {
    setSupplierFilter("");
    setFrom("");
    setTo("");
    setMinAmount("");
    setMaxAmount("");
    setStatusFilter("all");
    setSearch("");
  }

  // KPIs y análisis se calculan sobre el subconjunto FILTRADO.
  const kpiInvoiced = totalInvoiced(filtered);
  const kpiPaid = totalPaid(filtered);
  const kpiOutstanding = totalOutstanding(filtered);
  const byMonth = React.useMemo(() => spendByMonth(filtered), [filtered]);
  const bySupplier = React.useMemo(() => spendBySupplier(filtered), [filtered]);

  const monthDebt = outstandingInMonth(filtered, month);
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="space-y-5">
      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zs-muted">
          {filtersActive ? (
            <>
              Mostrando <span className="font-semibold text-zs-ink">{filtered.length}</span> de {rows.length} facturas
            </>
          ) : (
            <>
              <span className="font-semibold text-zs-ink">{rows.length}</span> facturas registradas
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <SupplierManagerDialog
            suppliers={sups}
            onCreate={createSupplier}
            onRename={renameSupplier}
            onRemove={removeSupplier}
          />
          <Button type="button" variant="outline" onClick={addColumn}>
            <Plus className="mr-1 h-4 w-4" /> Columna
          </Button>
          <Button type="button" onClick={addInvoice} disabled={creating}>
            <Plus className="mr-1 h-4 w-4" /> Añadir factura
          </Button>
        </div>
      </div>

      {/* KPIs — se recalculan con los filtros activos */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Receipt className="h-4 w-4" />}
          tone="blue"
          label="Facturado"
          value={fmt(kpiInvoiced)}
          hint={filtersActive ? "sobre lo filtrado" : "todo lo comprado"}
        />
        <KpiCard
          icon={<Wallet className="h-4 w-4" />}
          tone="emerald"
          label="Pagado"
          value={fmt(kpiPaid)}
          hint="salida de caja real"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          tone="amber"
          label="Pendiente"
          value={fmt(kpiOutstanding)}
          hint="lo que aún se debe"
        />
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-zs-muted">
                <ChevronRight className="h-4 w-4" /> A pagar en el mes
              </p>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value || todayYmd.slice(0, 7))}
                className="rounded-md border border-zs-border bg-white px-2 py-1 text-xs"
                aria-label="Mes"
              />
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-zs-ink">{fmt(monthDebt)}</p>
            <p className="mt-1 text-xs capitalize text-zs-muted">{monthLabel}</p>
          </CardContent>
        </Card>
      </div>

      {/* Panel de filtros combinables */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-zs-ink">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-zs-blue-700 hover:underline"
              >
                <X className="h-3.5 w-3.5" /> Limpiar
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {/* Proveedor */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Proveedor</label>
              <Combobox
                options={supplierOptions}
                value={supplierFilter || null}
                onChange={(v) => setSupplierFilter(v ?? "")}
                placeholder="Todos"
                searchPlaceholder="Buscar proveedor…"
                emptyText="Sin proveedores"
                className="h-9"
              />
            </div>
            {/* Estado */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Estado</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | InvoiceStatus)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="empty">Sin vencimientos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Rango de fechas (fecha de factura) */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Fecha de factura</label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label="Desde"
                  className="h-9 w-full rounded-md border border-zs-border bg-white px-2 text-sm outline-none focus:ring-1 focus:ring-zs-blue-300"
                />
                <span className="text-zs-muted">—</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label="Hasta"
                  className="h-9 w-full rounded-md border border-zs-border bg-white px-2 text-sm outline-none focus:ring-1 focus:ring-zs-blue-300"
                />
              </div>
            </div>
            {/* Rango de importe (total de la factura) */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Importe total (€)</label>
              <div className="flex items-center gap-1">
                <Input
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="mín"
                  aria-label="Importe mínimo"
                  className="h-9"
                />
                <span className="text-zs-muted">—</span>
                <Input
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="máx"
                  aria-label="Importe máximo"
                  className="h-9"
                />
              </div>
            </div>
          </div>
          {/* Búsqueda de texto */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por proveedor, nº factura o concepto…"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Análisis — gasto por mes y por proveedor (sobre lo filtrado) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-zs-ink">Gasto por mes</h2>
            <MonthSpendBars data={byMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-zs-ink">Gasto por proveedor</h2>
            <SupplierSpendBars data={bySupplier} />
          </CardContent>
        </Card>
      </div>

      {/* Tabla tipo hoja — columnas personalizadas arrastrables */}
      <DndContext sensors={colSensors} collisionDetection={closestCenter} onDragEnd={onColumnDragEnd}>
        <SortableContext items={cols.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="overflow-x-auto rounded-xl border border-zs-border bg-white">
            <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead className="bg-zs-surface text-left text-xs uppercase text-zs-muted">
            <tr>
              <th className="px-2 py-2 font-medium">Fecha</th>
              <th className="px-2 py-2 font-medium">Proveedor</th>
              <th className="px-2 py-2 font-medium">Nº factura</th>
              <th className="px-2 py-2 font-medium">Concepto</th>
              {cols.map((col) => (
                <SortableColumnHeader
                  key={col.id}
                  col={col}
                  onRename={(n) => commitColumnName(col.id, n, col.name)}
                  onRemove={() => removeColumn(col.id)}
                  onResizeStart={(e) => startResize(e, col.id, col.width)}
                />
              ))}
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-right font-medium">Pendiente</th>
              <th className="px-2 py-2 font-medium">Estado</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8 + cols.length} className="px-4 py-10 text-center text-sm text-zs-muted">
                  {rows.length === 0
                    ? "Aún no hay facturas. Pulsa «Añadir factura» para empezar."
                    : "Ninguna factura coincide con el filtro."}
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const status = invoiceStatus(inv.dueDates, todayYmd);
                const meta = STATUS_META[status];
                return (
                  <React.Fragment key={inv.id}>
                  <tr className={`border-t border-zs-border align-top ${meta.row}`}>
                    <td className="px-1 py-1">
                      <EditableCell
                        type="date"
                        value={inv.issueDate}
                        onCommit={(v) => commitField(inv.id, "issueDate", v, inv.issueDate)}
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[170px]">
                      <Combobox
                        options={supplierOptions}
                        value={inv.supplier || null}
                        onChange={(v) => commitField(inv.id, "supplier", v ?? "", inv.supplier)}
                        placeholder="Proveedor…"
                        searchPlaceholder="Buscar o crear…"
                        emptyText="Escribe para crear"
                        allowCreate
                        onCreate={async (input) => {
                          const name = await createSupplier(input);
                          return name ? { value: name, label: name } : null;
                        }}
                        className="h-9 border-transparent bg-transparent hover:bg-white"
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[110px]">
                      <EditableCell
                        value={inv.invoiceNumber ?? ""}
                        placeholder="Nº…"
                        onCommit={(v) => commitField(inv.id, "invoiceNumber", v, inv.invoiceNumber ?? "")}
                      />
                    </td>
                    <td className="px-1 py-1 min-w-[150px]">
                      <EditableCell
                        value={inv.concept ?? ""}
                        placeholder="Concepto / productos…"
                        onCommit={(v) => commitField(inv.id, "concept", v, inv.concept ?? "")}
                      />
                    </td>
                    {cols.map((col) => (
                      <td
                        key={col.id}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                        className="px-1 py-1"
                      >
                        <EditableCell
                          value={inv.customValues[col.id] ?? ""}
                          placeholder="…"
                          onCommit={(v) =>
                            commitCustomValue(inv.id, col.id, v, inv.customValues[col.id] ?? "")
                          }
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(invoiceTotal(inv.dueDates))}</td>
                    <td className="px-2 py-2 text-right font-medium tabular-nums">{fmt(invoiceOutstanding(inv.dueDates))}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeInvoice(inv.id)}
                        aria-label="Borrar factura"
                        className="text-zs-muted hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  <tr className={meta.row}>
                    <td colSpan={8 + cols.length} className="border-b border-zs-border px-3 pb-3 pt-0.5">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-zs-muted">
                          Vencimientos
                        </span>
                        {inv.dueDates.length === 0 && (
                          <span className="text-xs text-zs-muted">sin vencimientos todavía</span>
                        )}
                        {inv.dueDates.map((d) => {
                          const overdue = !d.paid && d.dueDate < todayYmd;
                          return (
                            <div
                              key={d.id}
                              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${
                                d.paid
                                  ? "border-emerald-200 bg-emerald-50"
                                  : overdue
                                    ? "border-red-200 bg-red-50"
                                    : "border-amber-200 bg-amber-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={d.paid}
                                onChange={(e) => toggleDuePaid(inv.id, d.id, e.target.checked)}
                                aria-label="Pagado"
                                title={d.paid ? "Pagado" : "Marcar como pagado"}
                                className="h-4 w-4 shrink-0 accent-emerald-600"
                              />
                              <div className="w-[130px]">
                                <EditableCell
                                  type="date"
                                  value={d.dueDate}
                                  className="rounded border border-zs-border bg-white"
                                  onCommit={(v) => commitDue(inv.id, d.id, { dueDate: v }, { dueDate: d.dueDate })}
                                />
                              </div>
                              <EditableCell
                                value={d.amount === 0 ? "" : String(d.amount)}
                                placeholder="0"
                                align="right"
                                inputMode="decimal"
                                className="w-24 rounded border border-zs-border bg-white"
                                onCommit={(v) => commitDue(inv.id, d.id, { amount: v }, { amount: d.amount })}
                              />
                              <span className="text-xs text-zs-muted">€</span>
                              <button
                                type="button"
                                onClick={() => removeDue(inv.id, d.id)}
                                aria-label="Quitar vencimiento"
                                className="text-zs-muted hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => addDue(inv.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-zs-blue-300 px-2 py-1 text-xs font-medium text-zs-blue-700 hover:bg-zs-blue-50"
                        >
                          <Plus className="h-3.5 w-3.5" /> Añadir vencimiento
                        </button>
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
        </SortableContext>
      </DndContext>

      {/* Calendario de vencimientos + próximos pagos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zs-ink">Calendario de pagos</h2>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMonth(addMonthToYm(month, -1))}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[130px] text-center text-sm font-medium capitalize text-zs-ink">
                  {monthLabel}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setMonth(addMonthToYm(month, 1))}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-7"
                  onClick={() => setMonth(todayYmd.slice(0, 7))}
                >
                  Hoy
                </Button>
              </div>
            </div>
            <MonthCalendar month={month} rows={filtered} todayYmd={todayYmd} />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zs-muted">
              <Legend className="bg-emerald-200" label="Pagado" />
              <Legend className="bg-amber-200" label="Pendiente" />
              <Legend className="bg-red-200" label="Vencido" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-zs-ink">Próximos pagos</h2>
            <UpcomingPayments rows={filtered} todayYmd={todayYmd} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}

const KPI_TONE: Record<"blue" | "emerald" | "amber", string> = {
  blue: "bg-zs-blue-100 text-zs-blue-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
};

function KpiCard({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber";
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${KPI_TONE[tone]}`}>
            {icon}
          </span>
          <p className="text-xs uppercase tracking-wide text-zs-muted">{label}</p>
        </div>
        <p className="mt-2 font-display text-2xl font-bold text-zs-ink tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-zs-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

/** "2026-07" → "jul 2026". */
function formatYm(ym: string): string {
  return new Date(`${ym}-01T00:00:00Z`)
    .toLocaleDateString("es-ES", { month: "short", year: "numeric", timeZone: "UTC" })
    .replace(".", "");
}

function MonthSpendBars({
  data,
}: {
  data: { ym: string; facturado: number; pagado: number; pendiente: number }[];
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-zs-muted">Sin datos para el filtro actual.</p>;
  }
  const max = Math.max(...data.map((d) => d.facturado), 1);
  // Más recientes arriba; limitamos a 12 meses para que no crezca sin fin.
  const shown = [...data].reverse().slice(0, 12);
  return (
    <div className="space-y-2">
      {shown.map((d) => {
        const paidPct = d.facturado > 0 ? (d.pagado / d.facturado) * 100 : 0;
        return (
          <div key={d.ym} className="grid grid-cols-[64px_1fr_auto] items-center gap-2">
            <span className="text-xs capitalize text-zs-muted">{formatYm(d.ym)}</span>
            <div
              className="h-5 rounded bg-zs-surface"
              title={`Facturado ${fmt(d.facturado)} · Pagado ${fmt(d.pagado)} · Pendiente ${fmt(d.pendiente)}`}
            >
              <div
                className="h-full rounded bg-zs-blue-200"
                style={{ width: `${(d.facturado / max) * 100}%` }}
              >
                <div className="h-full rounded bg-emerald-400" style={{ width: `${paidPct}%` }} />
              </div>
            </div>
            <span className="text-right text-xs font-semibold tabular-nums text-zs-ink">{fmt(d.facturado)}</span>
          </div>
        );
      })}
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-zs-muted">
        <Legend className="bg-emerald-400" label="Pagado" />
        <Legend className="bg-zs-blue-200" label="Facturado" />
      </div>
    </div>
  );
}

function SupplierSpendBars({
  data,
}: {
  data: { supplier: string; facturado: number; pagado: number; pendiente: number; count: number }[];
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-zs-muted">Sin datos para el filtro actual.</p>;
  }
  const max = Math.max(...data.map((d) => d.facturado), 1);
  const shown = data.slice(0, 8);
  return (
    <div className="space-y-2.5">
      {shown.map((d) => (
        <div key={d.supplier}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate font-medium text-zs-ink" title={d.supplier}>
              {d.supplier}
              <span className="ml-1 text-zs-muted">· {d.count}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-zs-ink">{fmt(d.facturado)}</span>
          </div>
          <div
            className="mt-1 h-2.5 rounded-full bg-zs-surface"
            title={`Pendiente ${fmt(d.pendiente)}`}
          >
            <div
              className="h-full rounded-full bg-zs-blue-400"
              style={{ width: `${(d.facturado / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
      {data.length > shown.length && (
        <p className="pt-1 text-[11px] text-zs-muted">+{data.length - shown.length} proveedores más</p>
      )}
    </div>
  );
}

/** Gestor de la lista guardada de proveedores: renombrar (propaga a facturas),
 *  borrar (solo del listado) y añadir. */
function SupplierManagerDialog({
  suppliers,
  onCreate,
  onRename,
  onRemove,
}: {
  suppliers: SupplierDTO[];
  onCreate: (name: string) => Promise<string | null>;
  onRename: (id: string, name: string, prev: string) => void;
  onRemove: (id: string) => void;
  }) {
  const [newName, setNewName] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  async function add() {
    const n = newName.trim();
    if (!n) return;
    setAdding(true);
    try {
      const created = await onCreate(n);
      if (created) setNewName("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Users className="mr-1 h-4 w-4" /> Proveedores
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Proveedores guardados</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Nuevo proveedor…"
          />
          <Button type="button" onClick={add} disabled={adding || !newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Añadir
          </Button>
        </div>
        <div className="max-h-72 space-y-1 overflow-auto">
          {suppliers.length === 0 ? (
            <p className="py-6 text-center text-sm text-zs-muted">Aún no hay proveedores guardados.</p>
          ) : (
            suppliers.map((s) => (
              <SupplierRow key={s.id} supplier={s} onRename={onRename} onRemove={onRemove} />
            ))
          )}
        </div>
        <p className="text-xs text-zs-muted">
          Renombrar actualiza también las facturas de ese proveedor. Borrar solo lo quita del listado; las
          facturas conservan su texto.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SupplierRow({
  supplier,
  onRename,
  onRemove,
}: {
  supplier: SupplierDTO;
  onRename: (id: string, name: string, prev: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(supplier.name);
  React.useEffect(() => setName(supplier.name), [supplier.name]);

  function commit() {
    setEditing(false);
    if (name.trim() && name.trim() !== supplier.name) onRename(supplier.id, name.trim(), supplier.name);
    else setName(supplier.name);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zs-surface">
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setName(supplier.name);
              setEditing(false);
            }
          }}
          maxLength={120}
          className="flex-1 rounded border border-zs-border bg-white px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-zs-blue-300"
        />
      ) : (
        <span className="flex-1 truncate text-sm text-zs-ink">{supplier.name}</span>
      )}
      {editing ? (
        <button type="button" onClick={commit} aria-label="Guardar" className="text-emerald-600 hover:text-emerald-700">
          <Check className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Renombrar ${supplier.name}`}
          className="text-zs-muted hover:text-zs-ink"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onRemove(supplier.id)}
        aria-label={`Borrar ${supplier.name}`}
        className="text-zs-muted hover:text-red-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EditableCell({
  value,
  onCommit,
  type = "text",
  placeholder,
  className,
  align,
  inputMode,
}: {
  value: string;
  onCommit: (v: string) => void;
  type?: "text" | "date";
  placeholder?: string;
  className?: string;
  align?: "right";
  inputMode?: "decimal";
}) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <input
      type={type}
      value={v}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={`bg-transparent px-2 py-1.5 text-sm outline-none focus:rounded focus:bg-white focus:ring-1 focus:ring-zs-blue-300 ${align === "right" ? "text-right tabular-nums" : "w-full"} ${className ?? ""}`}
    />
  );
}

function SortableColumnHeader({
  col,
  onRename,
  onRemove,
  onResizeStart,
}: {
  col: ColumnDTO;
  onRename: (name: string) => void;
  onRemove: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
  });
  const style: React.CSSProperties = {
    width: col.width,
    minWidth: col.width,
    maxWidth: col.width,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <th ref={setNodeRef} style={style} className="relative px-1 py-1 font-medium">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para mover la columna"
          className="shrink-0 cursor-grab text-zs-muted hover:text-zs-ink active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <ColumnNameInput value={col.name} onCommit={onRename} />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Borrar columna ${col.name}`}
          className="shrink-0 text-zs-muted hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <span
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-zs-blue-300"
        aria-hidden
      />
    </th>
  );
}

function ColumnNameInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      maxLength={40}
      aria-label="Nombre de la columna"
      className="w-full min-w-0 rounded bg-transparent px-1 text-xs font-semibold uppercase text-zs-ink outline-none focus:bg-white focus:ring-1 focus:ring-zs-blue-300"
    />
  );
}

function MonthCalendar({ month, rows, todayYmd }: { month: string; rows: InvoiceDTO[]; todayYmd: string }) {
  const byDay = React.useMemo(() => {
    const m = new Map<string, { supplier: string; amount: number; paid: boolean; overdue: boolean }[]>();
    for (const inv of rows) {
      for (const d of inv.dueDates) {
        if (!d.dueDate.startsWith(month)) continue;
        const list = m.get(d.dueDate) ?? [];
        list.push({
          supplier: inv.supplier || "—",
          amount: d.amount,
          paid: d.paid,
          overdue: !d.paid && d.dueDate < todayYmd,
        });
        m.set(d.dueDate, list);
      }
    }
    return m;
  }, [rows, month, todayYmd]);

  const [yy, mm] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(yy ?? 2026, mm ?? 1, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(yy ?? 2026, (mm ?? 1) - 1, 1)).getUTCDay() + 6) % 7; // Lunes = 0
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zs-muted">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const ymd = `${month}-${String(d).padStart(2, "0")}`;
          const list = byDay.get(ymd);
          const isToday = ymd === todayYmd;
          let tone = "border-zs-border bg-white";
          if (list && list.length) {
            if (list.some((x) => x.overdue)) tone = "border-red-300 bg-red-50";
            else if (list.some((x) => !x.paid)) tone = "border-amber-300 bg-amber-50";
            else tone = "border-emerald-300 bg-emerald-50";
          }
          return (
            <div
              key={`d${i}`}
              className={`min-h-[68px] rounded-lg border p-1 ${tone} ${isToday ? "ring-2 ring-zs-blue-400" : ""}`}
            >
              <div className={`text-[11px] font-semibold ${isToday ? "text-zs-blue-700" : "text-zs-ink"}`}>
                {d}
              </div>
              <div className="mt-0.5 space-y-0.5">
                {(list ?? []).slice(0, 3).map((x, j) => (
                  <div
                    key={j}
                    className={`truncate rounded px-1 text-[9px] leading-tight ${
                      x.paid
                        ? "bg-emerald-100 text-emerald-800"
                        : x.overdue
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-900"
                    }`}
                    title={`${x.supplier} · ${fmt(x.amount)}${x.paid ? " (pagado)" : x.overdue ? " (vencido)" : ""}`}
                  >
                    {fmt(x.amount)} · {x.supplier}
                  </div>
                ))}
                {list && list.length > 3 && (
                  <div className="px-1 text-[9px] text-zs-muted">+{list.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UpcomingPayments({ rows, todayYmd }: { rows: InvoiceDTO[]; todayYmd: string }) {
  const items = React.useMemo(() => {
    const out: { supplier: string; amount: number; dueDate: string; overdue: boolean }[] = [];
    for (const inv of rows) {
      for (const d of inv.dueDates) {
        if (d.paid) continue;
        out.push({
          supplier: inv.supplier || "—",
          amount: d.amount,
          dueDate: d.dueDate,
          overdue: d.dueDate < todayYmd,
        });
      }
    }
    out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return out.slice(0, 10);
  }, [rows, todayYmd]);

  if (items.length === 0) {
    return <p className="text-sm text-zs-muted">No hay pagos pendientes.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-2 border-b border-zs-border/60 pb-2 text-sm last:border-0 last:pb-0"
        >
          <span className="min-w-0">
            <span className="block truncate font-medium text-zs-ink">{it.supplier}</span>
            <span className={`text-xs ${it.overdue ? "font-semibold text-red-600" : "text-zs-muted"}`}>
              {formatDueDate(it.dueDate)}
              {it.overdue ? " · vencido" : ""}
            </span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-zs-ink">{fmt(it.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
