/**
 * Utilidades de fecha en la zona de la tienda (Europe/Madrid). El servidor
 * (Vercel) corre en UTC, así que para filtrar pedidos/contabilidad "por día" o
 * "por mes" hay que convertir la pared-horaria de Madrid al instante UTC real
 * (con DST). Sin esto, los pedidos de la franja de medianoche caen en el
 * día/mes equivocado.
 */

export const SHOP_TZ = "Europe/Madrid";

/** Offset (ms) de `timeZone` respecto a UTC en el instante `instant` (DST-aware). */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  // Hora "24" de medianoche que algunos motores devuelven → 0.
  const hour = p.hour === 24 ? 0 : p.hour;
  const asUTC = Date.UTC(p.year!, (p.month ?? 1) - 1, p.day ?? 1, hour ?? 0, p.minute ?? 0, p.second ?? 0);
  return asUTC - instant.getTime();
}

/** Instante UTC de una pared-horaria (fecha+hora) de Madrid. El offset se toma a
 *  MEDIODÍA de ese día: estable (sin sub-segundos ni el borde DST de la
 *  madrugada) y válido para todo el día salvo el propio día de cambio de hora. */
function madridWallToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, ms: number): Date {
  const off = tzOffsetMs(new Date(Date.UTC(y, mo - 1, d, 12, 0, 0, 0)), SHOP_TZ);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms) - off);
}

/** Instante UTC del inicio (00:00:00.000 Madrid) de un "YYYY-MM-DD". */
export function madridDayStart(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return madridWallToUtc(y ?? 1970, m ?? 1, d ?? 1, 0, 0, 0, 0);
}

/** Instante UTC del final (23:59:59.999 Madrid) de un "YYYY-MM-DD". */
export function madridDayEnd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return madridWallToUtc(y ?? 1970, m ?? 1, d ?? 1, 23, 59, 59, 999);
}

/** "YYYY-MM-DD" de HOY en Madrid. */
export function madridTodayYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SHOP_TZ });
}

/** "YYYY-MM-DD" del día 1 del mes actual en Madrid. */
export function madridMonthStartYmd(): string {
  return `${madridTodayYmd().slice(0, 7)}-01`;
}
