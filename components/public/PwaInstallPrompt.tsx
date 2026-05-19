"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X, Share, Plus, Smartphone, Check } from "lucide-react";
import {
  detectPlatform,
  shouldShowPrompt,
  markDismissed,
  markInstalled,
  incrementPageviews,
  type Platform,
} from "@/lib/pwa/install-state";

// Tipo del evento beforeinstallprompt (no está en lib.dom estándar).
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

interface SafariNavigator extends Navigator {
  standalone?: boolean;
}

const MIN_DELAY_MS = 30_000;

export function PwaInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [visible, setVisible] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusRef = useRef<HTMLButtonElement | null>(null);

  // Mount + detección.
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as SafariNavigator).standalone);

    const isMobileWidth = window.matchMedia("(max-width: 768px)").matches;
    const detected = detectPlatform(window.navigator.userAgent, isMobileWidth);
    setPlatform(detected);

    // Incrementa pageviews para esta sesión (1 por mount).
    const pageviews = incrementPageviews();

    const evaluate = () => {
      const show = shouldShowPrompt({
        pageviews,
        now: Date.now(),
        platform: detected,
        isStandalone,
      });
      if (show) setVisible(true);
    };

    // Para iOS no hay beforeinstallprompt → mostramos con delay.
    if (detected === "ios") {
      const t = window.setTimeout(evaluate, MIN_DELAY_MS);
      return () => window.clearTimeout(t);
    }

    // Para Android: escucha beforeinstallprompt.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      evaluate();
    };
    const onAppInstalled = () => {
      markInstalled();
      setVisible(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    // Fallback: si tras 30s no llegó beforeinstallprompt y plataforma móvil, no mostramos
    // (sin prompt no podemos instalar de forma nativa; iOS ya cubierto arriba).
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    markDismissed();
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (platform === "ios") {
      setIosModalOpen(true);
      return;
    }
    const evt = deferredPromptRef.current;
    if (!evt) {
      // Sin prompt nativo capturado — descartamos para no insistir.
      dismiss();
      return;
    }
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        markInstalled();
      } else {
        markDismissed();
      }
    } catch {
      markDismissed();
    } finally {
      deferredPromptRef.current = null;
      setVisible(false);
    }
  }, [platform, dismiss]);

  // Focus trap + ESC en el modal iOS.
  useEffect(() => {
    if (!iosModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIosModalOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const first = firstFocusRef.current;
      const last = lastFocusRef.current;
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    // Foco inicial al primer elemento.
    const t = window.setTimeout(() => firstFocusRef.current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [iosModalOpen]);

  if (!mounted || !visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Instalar aplicación Zona Sport"
        className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-md md:bottom-8"
        style={{
          animation: "zs-pwa-slide-up 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-zs-border bg-white shadow-2xl">
          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Cerrar"
            onClick={dismiss}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14225B]"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4 p-4 pr-12 sm:p-5 sm:pr-12">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#14225B]/5">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                priority={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                Instala Zona Sport en tu móvil
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                Acceso rápido al catálogo y a tus reservas.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-[#C8102E] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#a40d26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] focus-visible:ring-offset-2"
                >
                  Instalar
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {iosModalOpen && (
        <IosInstructionsModal
          onClose={() => setIosModalOpen(false)}
          onComplete={() => {
            markDismissed();
            setIosModalOpen(false);
            setVisible(false);
          }}
          firstRef={firstFocusRef}
          lastRef={lastFocusRef}
        />
      )}

      <style jsx global>{`
        @keyframes zs-pwa-slide-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (min-width: 768px) {
          @keyframes zs-pwa-slide-up {
            from {
              opacity: 0;
              transform: translate(-50%, 24px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes zs-pwa-slide-up {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        }
      `}</style>
    </>
  );
}

interface IosInstructionsModalProps {
  onClose: () => void;
  onComplete: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
  lastRef: React.RefObject<HTMLButtonElement | null>;
}

function IosInstructionsModal({
  onClose,
  onComplete,
  firstRef,
  lastRef,
}: IosInstructionsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zs-pwa-ios-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          ref={firstRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar instrucciones"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14225B]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#14225B]/5">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </div>
            <div>
              <h2 id="zs-pwa-ios-title" className="text-base font-semibold text-gray-900">
                Añadir Zona Sport a inicio
              </h2>
              <p className="text-xs text-gray-600">Solo 4 pasos en Safari</p>
            </div>
          </div>

          <ol className="space-y-3">
            <Step
              n={1}
              title="Pulsa el icono de compartir"
              desc="Encuéntralo en la barra inferior de Safari."
              icon={<Share className="h-5 w-5 text-[#14225B]" aria-hidden="true" />}
            />
            <Step
              n={2}
              title="Desliza y pulsa “Añadir a inicio”"
              desc="Aparece en la fila de acciones del menú compartir."
              icon={<Plus className="h-5 w-5 text-[#14225B]" aria-hidden="true" />}
            />
            <Step
              n={3}
              title="Confirma con “Añadir”"
              desc="Arriba a la derecha del diálogo."
              icon={<Smartphone className="h-5 w-5 text-[#14225B]" aria-hidden="true" />}
            />
            <Step
              n={4}
              title="¡Listo!"
              desc="Encuéntranos en tu pantalla de inicio."
              icon={<Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
            />
          </ol>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              Cerrar
            </button>
            <button
              ref={lastRef}
              type="button"
              onClick={onComplete}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#14225B] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f1a47] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14225B] focus-visible:ring-offset-2"
            >
              Lo he añadido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
  icon,
}: {
  n: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-zs-border bg-gray-50/60 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#14225B] px-1.5 text-[10px] font-bold text-white">
            {n}
          </span>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{desc}</p>
      </div>
    </li>
  );
}
