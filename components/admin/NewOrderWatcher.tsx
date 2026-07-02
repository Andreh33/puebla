"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { broadcastNewOrders, playAlertBell, unlockAudio } from "./order-alert";

const POLL_MS = 20_000;

/**
 * Vigía de pedidos nuevos para el panel. Sondea /api/admin/orders/pending-count
 * cada 20 s con `since` = momento de montaje: así solo avisa de los pedidos ONLINE
 * que entran mientras el admin tiene el panel abierto. Al detectar uno:
 *   - suena una campana (WebAudio, si el permiso está activo), y
 *   - aparece una alerta roja parpadeante fija, muy visible, con acceso directo
 *     a /admin/pedidos, y
 *   - difunde el contador para que el menú "Pedidos" muestre el punto rojo.
 *
 * El sonido necesita un gesto previo del usuario (autoplay): desbloqueamos el
 * AudioContext en la primera interacción.
 */
export function NewOrderWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  // `since` se SIEMBRA con el reloj del SERVIDOR en el primer sondeo (null =
  // pendiente de sembrar). Evita que un reloj del PC adelantado/atrasado haga
  // perder avisos (createdAt es hora de servidor).
  const [since, setSince] = React.useState<string | null>(null);
  const [count, setCount] = React.useState(0);
  const lastCount = React.useRef(0);

  // Desbloqueo del audio en el primer gesto (una sola vez).
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
    broadcastNewOrders(0);
    setSince(null); // se vuelve a sembrar desde el servidor
  }, []);

  // Al abrir la propia página de pedidos, damos por vistos los nuevos.
  React.useEffect(() => {
    if (pathname === "/admin/pedidos") reset();
  }, [pathname, reset]);

  React.useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const url = since
          ? `/api/admin/orders/pending-count?since=${encodeURIComponent(since)}`
          : `/api/admin/orders/pending-count`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || !alive) return;
        const data = (await res.json()) as { count?: number; now?: string };
        // Semilla: fijamos la ventana desde el reloj del servidor; sin avisar.
        if (since === null) {
          lastCount.current = 0;
          if (data.now) setSince(data.now);
          return;
        }
        const c = typeof data.count === "number" ? data.count : 0;
        if (c > lastCount.current) {
          playAlertBell();
          // Refresca el listado SOLO si lo estás mirando (no en otras páginas).
          if (window.location.pathname === "/admin/pedidos") router.refresh();
        }
        lastCount.current = c;
        if (alive) {
          setCount(c);
          broadcastNewOrders(c);
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
          onClick={() => router.push("/admin/pedidos")}
          className="ml-1 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-red-700 shadow hover:bg-red-50"
        >
          Ver pedidos
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Silenciar aviso"
          className="rounded-md p-1 text-red-100 hover:bg-red-500 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
