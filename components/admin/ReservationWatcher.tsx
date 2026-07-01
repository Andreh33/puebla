"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { broadcastNewReservations, playReservationBell, unlockAudio } from "./order-alert";

const POLL_MS = 20_000;

/**
 * Vigía de reservas nuevas por WhatsApp. Igual que NewOrderWatcher pero en VERDE
 * y con su propio sonido: sondea /api/admin/reservations/pending-count cada 20 s
 * desde el montaje; al entrar una reserva suena y muestra una alerta verde fija,
 * y difunde el contador para el punto verde del menú "Reservas".
 */
export function ReservationWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [since, setSince] = React.useState(() => new Date().toISOString());
  const [count, setCount] = React.useState(0);
  const lastCount = React.useRef(0);

  React.useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const reset = React.useCallback(() => {
    lastCount.current = 0;
    setCount(0);
    broadcastNewReservations(0);
    setSince(new Date().toISOString());
  }, []);

  React.useEffect(() => {
    if (pathname === "/admin/reservas") reset();
  }, [pathname, reset]);

  React.useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(
          `/api/admin/reservations/pending-count?since=${encodeURIComponent(since)}`,
          { cache: "no-store" },
        );
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { count?: number };
        const c = typeof data.count === "number" ? data.count : 0;
        if (c > lastCount.current) {
          playReservationBell();
          router.refresh();
        }
        lastCount.current = c;
        if (alive) {
          setCount(c);
          broadcastNewReservations(c);
        }
      } catch {
        /* red intermitente: reintentamos en el siguiente tick */
      }
    }
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [since, router]);

  if (count <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-[190] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-600 px-4 py-3 text-white shadow-2xl motion-safe:animate-pulse">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 motion-safe:animate-ping" />
          <MessageCircle className="relative h-6 w-6" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold uppercase tracking-wide">
            {count === 1 ? "¡Reserva nueva!" : `¡${count} reservas nuevas!`}
          </p>
          <p className="text-xs text-emerald-50">Han reservado por WhatsApp.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin/reservas")}
          className="ml-1 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 shadow hover:bg-emerald-50"
        >
          Ver reservas
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Silenciar aviso"
          className="rounded-md p-1 text-emerald-100 hover:bg-emerald-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
