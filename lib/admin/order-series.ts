/**
 * Agregación de pedidos en una serie temporal para la gráfica de /admin/pedidos.
 * Puro y testeable: recibe los pedidos ya reducidos a `{ day, total }` y el rango
 * [start, end] (YYYY-MM-DD), y devuelve una serie continua (rellena los periodos
 * sin pedidos a 0) compatible con SalesChart.
 *
 * El tamaño del "cubo" se adapta al rango para que la gráfica se lea bien en
 * cualquier periodo: por día (hasta ~3 meses, cubre los presets 30/60/90), por
 * semana (hasta ~1 año) o por mes (más). Todas las fechas en UTC para que el
 * resultado sea determinista.
 */

export type OrderPoint = { day: string; total: number }; // day = YYYY-MM-DD
export type SeriesPoint = { date: string; ingresos: number; pedidos: number };
export type Bucket = "day" | "week" | "month";

function parseUTC(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDaysUTC(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function addMonthsUTC(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}
function daysBetween(a: string, b: string): number {
  return Math.round((parseUTC(b).getTime() - parseUTC(a).getTime()) / 86_400_000);
}
/** Lunes (inicio de semana) del día dado, como YYYY-MM-DD. */
function mondayOf(ymd: string): string {
  const d = parseUTC(ymd);
  const offset = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return fmt(addDaysUTC(d, -offset));
}
function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function pickBucket(start: string, end: string): Bucket {
  const days = daysBetween(start, end);
  if (days <= 92) return "day";
  if (days <= 372) return "week";
  return "month";
}

function bucketKey(day: string, bucket: Bucket): string {
  if (bucket === "day") return day;
  if (bucket === "week") return mondayOf(day);
  return monthStart(day);
}

function bucketStarts(start: string, end: string, bucket: Bucket): string[] {
  const out: string[] = [];
  const endT = parseUTC(end).getTime();
  if (bucket === "day") {
    for (let d = parseUTC(start); d.getTime() <= endT; d = addDaysUTC(d, 1)) out.push(fmt(d));
  } else if (bucket === "week") {
    for (let d = parseUTC(mondayOf(start)); d.getTime() <= endT; d = addDaysUTC(d, 7)) out.push(fmt(d));
  } else {
    for (let d = parseUTC(monthStart(start)); d.getTime() <= endT; d = addMonthsUTC(d, 1)) out.push(fmt(d));
  }
  return out;
}

export function buildOrderSeries(items: OrderPoint[], start: string, end: string): SeriesPoint[] {
  const bucket = pickBucket(start, end);
  const map = new Map<string, { ingresos: number; pedidos: number }>();
  for (const key of bucketStarts(start, end, bucket)) map.set(key, { ingresos: 0, pedidos: 0 });
  for (const it of items) {
    const cur = map.get(bucketKey(it.day, bucket));
    if (cur) {
      cur.ingresos = Math.round((cur.ingresos + it.total) * 100) / 100;
      cur.pedidos += 1;
    }
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ingresos: v.ingresos, pedidos: v.pedidos }));
}
