"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/lib/cookies/consent";

/**
 * Registra una visita (POST /api/track) en cada cambio de ruta, SOLO si el
 * usuario consintió la categoría "analytics" (igual gate que Vercel Analytics).
 * Best-effort con sendBeacon: no bloquea la navegación ni rompe nada.
 */
export function TrackPageView() {
  const pathname = usePathname();
  const { consent, isLoaded } = useConsent();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!consent?.categories.analytics) return;
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastSent.current === pathname) return; // evita duplicar el mismo path
    lastSent.current = pathname;

    const body = JSON.stringify({ path: pathname });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      } else {
        void fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    } catch {
      /* noop — la analítica nunca debe afectar a la navegación */
    }
  }, [pathname, consent, isLoaded]);

  return null;
}
