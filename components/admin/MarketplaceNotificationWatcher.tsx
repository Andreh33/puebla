"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { broadcastMarketplaceNotificationCount } from "./marketplace-alert";

const POLL_MS = 20_000;

/** Mantiene actualizado el contador persistente de Notificaciones del menú. */
export function MarketplaceNotificationWatcher() {
  const pathname = usePathname();
  const router = useRouter();
  const lastSnapshot = React.useRef<string | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function poll() {
      try {
        const response = await fetch("/api/admin/notifications/pending-count", {
          cache: "no-store",
        });
        if (!response.ok || !alive) return;
        const data = (await response.json()) as { count?: number; lastSoldAt?: string | null };
        const count = typeof data.count === "number" ? data.count : 0;
        const snapshot = `${count}:${data.lastSoldAt ?? ""}`;
        const changed = lastSnapshot.current !== null && lastSnapshot.current !== snapshot;
        lastSnapshot.current = snapshot;
        broadcastMarketplaceNotificationCount(count);
        if (changed && pathname === "/admin/notificaciones") router.refresh();
      } catch {
        /* Red intermitente: el aviso almacenado no se pierde; se reintenta. */
      }
    }

    void poll();
    const interval = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [pathname, router]);

  return null;
}
