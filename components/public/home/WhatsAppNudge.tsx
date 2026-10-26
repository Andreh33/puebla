"use client";

import {
  useTranslations,
  useTranslatedValue,
  useTranslatedTemplate,
} from "@/components/public/LocaleProvider";
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
  const _translateUi = useTranslations();
  const _translateValue = useTranslatedValue();
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
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="bg-zs-blue-950 pointer-events-auto relative inline-flex max-w-[260px] items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
          <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold tracking-[0.18em] text-white/70 uppercase">
            {_translateUi("Estamos online")}
          </p>
          <p className="text-sm leading-tight font-semibold">
            {_translateUi("Respondemos en <5min")}
            {_translateValue(" ")}
            <ArrowUpRight className="inline h-3.5 w-3.5" strokeWidth={2.5} />
          </p>
        </div>
        <button
          type="button"
          aria-label={_translateUi("Cerrar aviso")}
          onClick={() => {
            setVisible(false);
            setDismissed(true);
            if (typeof window !== "undefined") {
              window.sessionStorage.setItem("zs-wa-nudge-dismissed", "1");
            }
          }}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <span aria-hidden>{_translateUi("×")}</span>
        </button>
        {/* Triángulo apuntando al botón */}
        <div
          aria-hidden
          className="bg-zs-blue-950 absolute right-7 -bottom-1.5 h-3 w-3 rotate-45 rounded-sm"
        />
      </div>
    </div>
  );
}
