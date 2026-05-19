"use client";

import { useEffect } from "react";

/**
 * Registra el service worker /sw.js cuando se cumplen las condiciones:
 *  - existe `serviceWorker` en navigator
 *  - el contexto es seguro (https) o localhost
 * El SW hace cache-first de assets estáticos y network-first para HTML.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]";
    const isHttps = window.location.protocol === "https:";
    if (!isHttps && !isLocalhost) return;

    // Pequeño retraso para no competir con LCP.
    const t = window.setTimeout(() => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // No bloqueamos UX si falla.
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn("[zs] SW registration failed", err);
          }
        });
    }, 2000);

    return () => window.clearTimeout(t);
  }, []);

  return null;
}
