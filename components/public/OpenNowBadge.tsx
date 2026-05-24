"use client";

import { useEffect, useState } from "react";

type Range = { open: number; close: number }; // minutos desde 00:00

// Lunes=1 ... Domingo=0 (compatible con Date#getDay)
const SCHEDULE: Record<number, Range[]> = {
  1: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60 + 30, close: 20 * 60 + 30 },
  ],
  2: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60 + 30, close: 20 * 60 + 30 },
  ],
  3: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60 + 30, close: 20 * 60 + 30 },
  ],
  4: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60 + 30, close: 20 * 60 + 30 },
  ],
  5: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60 + 30, close: 20 * 60 + 30 },
  ],
  6: [{ open: 10 * 60, close: 14 * 60 }],
  0: [],
};

const DAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function fmtClock(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtDuration(min: number) {
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24 && m === 0) return `${h} h`;
  if (h < 24) return `${h} h ${m} min`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d} d ${rh} h` : `${d} d`;
}

/**
 * Devuelve "ahora" en zona horaria Europe/Madrid (con DST automático),
 * convertido a una fecha local equivalente (los métodos getDay/getHours/etc
 * leen como si estuviéramos en Madrid).
 */
function nowInMadrid(): Date {
  // Intl convierte una fecha a partes en una TZ. Reconstruimos un Date
  // con esas partes para que getHours()/getDay() respondan en Madrid.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const v: Record<string, string> = {};
  for (const p of parts) if (p.type !== "literal") v[p.type] = p.value;
  const hour = v.hour === "24" ? "00" : v.hour;
  // Construimos como Date local (no UTC). Lo único que necesitamos son los
  // getters locales y getDay() coherente.
  return new Date(`${v.year}-${v.month}-${v.day}T${hour}:${v.minute}:${v.second}`);
}

type State = {
  open: boolean;
  /** Texto secundario con info concreta del próximo evento. */
  detail: string;
};

function compute(): State {
  const now = nowInMadrid();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const ranges = SCHEDULE[day] ?? [];
  const inside = ranges.find((r) => minutes >= r.open && minutes < r.close);
  if (inside) {
    const diff = inside.close - minutes;
    return { open: true, detail: `cierra en ${fmtDuration(diff)}` };
  }
  // ¿Hay próximo tramo hoy?
  const nextToday = ranges.find((r) => minutes < r.open);
  if (nextToday) {
    const diff = nextToday.open - minutes;
    return {
      open: false,
      detail:
        diff <= 90
          ? `abre en ${fmtDuration(diff)}`
          : `abre hoy a las ${fmtClock(nextToday.open)}`,
    };
  }
  // Buscar próximo día con tramos
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    const r = SCHEDULE[d]?.[0];
    if (r) {
      const label = i === 1 ? "mañana" : `el ${DAY_LABELS[d]}`;
      return { open: false, detail: `abre ${label} a las ${fmtClock(r.open)}` };
    }
  }
  return { open: false, detail: "horarios disponibles en tienda" };
}

type Props = {
  className?: string;
  /**
   * "light" (default) → fondos claros. "dark" → fondos oscuros (hero/footer).
   */
  tone?: "light" | "dark";
};

/**
 * OpenNowBadge — calcula en cliente si la tienda está abierta AHORA en
 * Europe/Madrid. Pill verde si abierto + tiempo a cerrar; pill ámbar si
 * cerrado + tiempo o día/hora de apertura. Se refresca cada 60 s.
 *
 * Hidratación segura: el primer render devuelve null (evita mismatch).
 */
export function OpenNowBadge({ className, tone = "light" }: Props) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    setState(compute());
    const id = window.setInterval(() => setState(compute()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return null;

  const darkBg = tone === "dark";
  const openClasses = state.open
    ? darkBg
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-300/40"
      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
    : darkBg
      ? "bg-amber-400/15 text-amber-100 ring-1 ring-amber-300/40"
      : "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  const dotClasses = state.open
    ? "bg-emerald-400"
    : "bg-amber-400";
  const detailClasses = darkBg ? "text-white/80" : "text-zs-muted";

  return (
    <span className={["inline-flex flex-wrap items-center gap-2", className ?? ""].join(" ")}>
      <span
        className={[
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
          openClasses,
        ].join(" ")}
      >
        <span
          aria-hidden
          className={[
            "block h-2 w-2 rounded-full",
            dotClasses,
            state.open ? "zs-open-pulse" : "",
          ].join(" ")}
        />
        {state.open ? "Abierto ahora" : "Cerrado"}
      </span>
      {state.detail && (
        <span className={["text-xs", detailClasses].join(" ")}>· {state.detail}</span>
      )}
      <style>{`
        @keyframes zs-open-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.78); } }
        .zs-open-pulse { animation: zs-open-pulse 1.6s ease-in-out infinite; }
              `}</style>
    </span>
  );
}
