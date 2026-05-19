"use client";

import { useEffect, useState } from "react";

type Range = { open: number; close: number }; // minutos desde 00:00

// Lunes=1 ... Domingo=0 (compatible con Date#getDay)
const SCHEDULE: Record<number, Range[]> = {
  1: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60, close: 20 * 60 },
  ],
  2: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60, close: 20 * 60 },
  ],
  3: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60, close: 20 * 60 },
  ],
  4: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60, close: 20 * 60 },
  ],
  5: [
    { open: 10 * 60, close: 14 * 60 },
    { open: 17 * 60, close: 20 * 60 },
  ],
  6: [{ open: 10 * 60, close: 14 * 60 }],
  0: [],
};

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * OpenNowBadge — calcula en cliente si la tienda está abierta.
 * Hidratación segura: el primer render no muestra texto (evita mismatch).
 */
export function OpenNowBadge({ className }: { className?: string }) {
  const [state, setState] = useState<{
    open: boolean;
    next: string;
  } | null>(null);

  useEffect(() => {
    function compute() {
      const now = new Date();
      const day = now.getDay();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const ranges = SCHEDULE[day] ?? [];
      const inside = ranges.find((r) => minutes >= r.open && minutes < r.close);
      if (inside) {
        setState({ open: true, next: `Cierra a las ${fmt(inside.close)}` });
        return;
      }
      // Próximo open hoy
      const nextToday = ranges.find((r) => minutes < r.open);
      if (nextToday) {
        setState({ open: false, next: `Abre hoy a las ${fmt(nextToday.open)}` });
        return;
      }
      // Próximo día
      for (let i = 1; i <= 7; i++) {
        const d = (day + i) % 7;
        const r = SCHEDULE[d]?.[0];
        if (r) {
          const labels = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
          setState({ open: false, next: `Abre el ${labels[d]} a las ${fmt(r.open)}` });
          return;
        }
      }
      setState({ open: false, next: "" });
    }
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return null;

  return (
    <span className={className}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
          state.open ? "bg-emerald-100 text-emerald-800" : "bg-zs-red-100 text-zs-red-800"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${state.open ? "bg-emerald-500" : "bg-zs-red-600"}`}
          style={state.open ? { animation: "zs-pulse 1.6s ease-in-out infinite" } : undefined}
        />
        {state.open ? "Abierto ahora" : "Cerrado"}
      </span>
      {state.next && (
        <span className="ml-2 text-xs text-zs-muted">{state.next}</span>
      )}
      <style>{`@keyframes zs-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.35 } }`}</style>
    </span>
  );
}
