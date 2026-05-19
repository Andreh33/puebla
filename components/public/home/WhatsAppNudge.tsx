"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

/**
 * WhatsAppNudge — mini-tooltip que aparece sobre el botón flotante de
 * WhatsApp (visible solo en mobile) tras 3 segundos en la home.
 *
 * NO toca el componente WhatsAppButton existente: se posiciona en absoluto
 * sobre la misma esquina inferior derecha y desaparece al cerrar o tras 10s.
 *
 * Solo se renderiza en pantallas < 768px para no estorbar en desktop.
 */
export function WhatsAppNudge() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Solo en mobile
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;
    // Si ya lo cerró antes en esta sesión, no reaparecer
    if (window.sessionStorage.getItem("zs-wa-nudge-dismissed") === "1") {
      setDismissed(true);
      return;
    }
    const showT = window.setTimeout(() => setVisible(true), 3000);
    const hideT = window.setTimeout(() => setVisible(false), 13000);
    return () => {
      window.clearTimeout(showT);
      window.clearTimeout(hideT);
    };
  }, []);

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-none fixed right-4 z-30 md:hidden",
        "bottom-[calc(4rem+env(safe-area-inset-bottom)+12px+3.75rem)]",
        "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="pointer-events-auto relative inline-flex max-w-[260px] items-center gap-3 rounded-2xl bg-zs-blue-950 px-4 py-3 text-white shadow-2xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
          <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            Estamos online
          </p>
          <p className="text-sm font-semibold leading-tight">
            Respondemos en &lt;5min{" "}
            <ArrowUpRight className="inline h-3.5 w-3.5" strokeWidth={2.5} />
          </p>
        </div>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => {
            setVisible(false);
            setDismissed(true);
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("zs-wa-nudge-dismissed", "1");
            }
          }}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <span aria-hidden>×</span>
        </button>
        {/* Triángulo apuntando al botón */}
        <div
          aria-hidden
          className="absolute -bottom-1.5 right-7 h-3 w-3 rotate-45 rounded-sm bg-zs-blue-950"
        />
      </div>
    </div>
  );
}
