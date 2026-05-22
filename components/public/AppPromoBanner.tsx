"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Smartphone } from "lucide-react";

/**
 * Banner promocional "Descárgate la app" (Bloque 7 paso 7.3). Sticky inferior
 * derecho, SOLO móvil/tablet (< lg) y SOLO en la home ("/"). Aparece tras 3s,
 * como mucho 1 vez cada 2 semanas: al mostrarse (y al cerrarse con la X) guarda
 * un timestamp en localStorage y no reaparece hasta pasado ese periodo. El CTA
 * dispara el flujo de instalación PWA existente (`zs:show-pwa-install`), no una
 * ruta /app inexistente.
 */
const STORAGE_KEY = "zs:app-banner-dismissed-at";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 2 semanas

export function AppPromoBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname !== "/") {
      setVisible(false); // solo en la home
      return;
    }
    if (window.innerWidth >= 1024) return; // solo móvil/tablet
    const lastAt = localStorage.getItem(STORAGE_KEY);
    if (lastAt) {
      const elapsed = Date.now() - parseInt(lastAt, 10);
      if (Number.isFinite(elapsed) && elapsed < DISMISS_DURATION_MS) return;
      localStorage.removeItem(STORAGE_KEY); // pasaron 2 semanas → mostrar de nuevo
    }
    const timer = setTimeout(() => {
      // Registra que se mostró: no reaparece en 2 semanas aunque no se cierre.
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch {
        // localStorage no disponible: se mostrará igualmente esta sesión.
      }
      setVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [pathname]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // localStorage no disponible: ocultamos esta sesión igualmente.
    }
    setVisible(false);
  };

  const openInstall = () => {
    window.dispatchEvent(new CustomEvent("zs:show-pwa-install"));
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Descárgate nuestra app"
      className="animate-fade-in-up fixed bottom-4 right-4 z-50 max-w-[320px] rounded-2xl border border-zs-border bg-white p-4 shadow-xl lg:hidden"
    >
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-zs-border bg-white shadow-sm hover:bg-zs-surface"
      >
        <X className="h-3.5 w-3.5 text-zs-ink" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zs-blue-900 text-white">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-zs-ink">Llévate Zona Sport contigo</p>
          <p className="mt-1 text-xs text-zs-muted">
            Descárgate nuestra app para una experiencia más rápida.
          </p>
          <button
            onClick={openInstall}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zs-blue-900 hover:underline"
          >
            Descargar →
          </button>
        </div>
      </div>
    </div>
  );
}
