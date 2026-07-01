"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";

const POLL_MS = 20_000;

/**
 * Vigía de pedidos nuevos para el panel. Sondea /api/admin/orders/pending-count
 * cada 20 s con `since` = momento de montaje: así solo avisa de los pedidos ONLINE
 * que entran mientras el admin tiene el panel abierto. Al detectar uno:
 *   - suena una campana (WebAudio, a todo volumen del sistema), y
 *   - aparece una alerta roja parpadeante fija, muy visible, con acceso directo
 *     a /admin/pedidos.
 *
 * El sonido necesita un gesto previo del usuario (política de autoplay de los
 * navegadores): desbloqueamos el AudioContext en la primera interacción.
 */
export function NewOrderWatcher() {
  const router = useRouter();
  const [since, setSince] = React.useState(() => new Date().toISOString());
  const [count, setCount] = React.useState(0);
  const lastCount = React.useRef(0);
  const audioRef = React.useRef<AudioContext | null>(null);

  // Desbloqueo del audio en el primer gesto (una sola vez).
  React.useEffect(() => {
    const unlock = () => {
      try {
        if (!audioRef.current) {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctor) audioRef.current = new Ctor();
        }
        void audioRef.current?.resume();
      } catch {
        /* sin audio disponible: la alerta visual sigue funcionando */
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playBell = React.useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    void ctx.resume();
    const t0 = ctx.currentTime;
    // Tres "din" con dos armónicos cada uno y caída exponencial (campana).
    [0, 0.38, 0.76].forEach((offset) => {
      const t = t0 + offset;
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(i === 0 ? 1 : 0.45, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
    });
  }, []);

  React.useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/admin/orders/pending-count?since=${encodeURIComponent(since)}`, {
          cache: "no-store",
        });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { count?: number };
        const c = typeof data.count === "number" ? data.count : 0;
        if (c > lastCount.current) {
          playBell();
          // Refresca en segundo plano el listado (por si está abierto en pedidos).
          router.refresh();
        }
        lastCount.current = c;
        if (alive) setCount(c);
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
  }, [since, playBell, router]);

  function acknowledge(navigate: boolean) {
    // Reiniciamos la ventana de detección a "ahora" y limpiamos el contador.
    lastCount.current = 0;
    setCount(0);
    setSince(new Date().toISOString());
    if (navigate) router.push("/admin/pedidos");
  }

  if (count <= 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 border-red-500 bg-red-600 px-4 py-3 text-white shadow-2xl motion-safe:animate-pulse">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75 motion-safe:animate-ping" />
          <Bell className="relative h-6 w-6" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold uppercase tracking-wide">
            {count === 1 ? "¡Pedido nuevo!" : `¡${count} pedidos nuevos!`}
          </p>
          <p className="text-xs text-red-50">Ha entrado un pedido por la web.</p>
        </div>
        <button
          type="button"
          onClick={() => acknowledge(true)}
          className="ml-1 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-red-700 shadow hover:bg-red-50"
        >
          Ver pedidos
        </button>
        <button
          type="button"
          onClick={() => acknowledge(false)}
          aria-label="Silenciar aviso"
          className="rounded-md p-1 text-red-100 hover:bg-red-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
