"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { X, Share, Plus, Smartphone, Check } from "lucide-react";
import {
  detectPlatform,
  shouldShowPrompt,
  markDismissed,
  markInstalled,
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

export function PwaInstallPrompt() {
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [visible, setVisible] = useState(false);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusRef = useRef<HTMLButtonElement | null>(null);

  // Mount + detección + evaluación inmediata (sin delay).
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as SafariNavigator).standalone);

    const isMobileWidth = window.matchMedia("(max-width: 768px)").matches;
    const detected = detectPlatform(window.navigator.userAgent, isMobileWidth);
    setPlatform(detected);

    // Política always-on: evaluamos inmediatamente, sin esperar pageviews ni delays.
    const show = shouldShowPrompt({
      now: Date.now(),
      platform: detected,
      isStandalone,
    });
    if (show) setVisible(true);

    // Captura beforeinstallprompt (Android Chrome, Edge desktop, etc.).
    // Si llega DESPUÉS del primer render, marcamos hasNativePrompt para cambiar
    // el botón a "Instalar app" nativo.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setHasNativePrompt(true);
      // Por si el banner se ocultó previamente sin razón (no debería), revalúa.
      if (!isStandalone) setVisible((v) => v || true);
    };
    const onAppInstalled = () => {
      markInstalled();
      setVisible(false);
      setHasNativePrompt(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    // Permitir mostrar el prompt desde otros componentes del sitio (p. ej.
    // el botón "App" del Header). Ignora `shouldShowPrompt` para que el
    // usuario pueda invocarlo manualmente aunque haya sido descartado.
    const onForceShow = () => {
      if (isStandalone) return; // ya está instalada, nada que hacer
      setVisible(true);
    };
    window.addEventListener("zs:show-pwa-install", onForceShow);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("zs:show-pwa-install", onForceShow);
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
      // Sin prompt nativo capturado (p. ej. Safari/Firefox desktop) — abre el
      // modal de instrucciones manuales reutilizando la UI del flujo iOS.
      setIosModalOpen(true);
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
      setHasNativePrompt(false);
      setVisible(false);
    }
  }, [platform]);

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

  const installLabel =
    platform === "ios" ? "Cómo instalar" : hasNativePrompt ? "Instalar app" : "Cómo instalar";

  return (
    <>
      <div
        role="dialog"
        aria-live="polite"
        aria-label="Instalar aplicación Zona Sport"
        className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-w-sm md:max-w-md md:bottom-8"
        style={{
          animation: "zs-pwa-slide-up 350ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="relative overflow-hidden rounded-2xl border border-zs-border bg-white"
          style={{ boxShadow: "var(--shadow-zs-blue-glow-lg)" }}
        >
          {/* Sutil banda decorativa con marca */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-zs-blue-900 via-zs-tennis-300 to-zs-red-600"
          />

          <button
            ref={closeBtnRef}
            type="button"
            aria-label="Cerrar"
            onClick={dismiss}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-900"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4 p-4 pr-12 pt-5 sm:p-5 sm:pr-12 sm:pt-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zs-blue-900/5 ring-1 ring-zs-blue-900/10">
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
              <p className="text-sm font-semibold text-zs-blue-900">
                Instala Zona Sport en tu dispositivo
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
                Acceso rápido al catálogo, reservas y novedades. Sin app store.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-zs-blue-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-zs-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-900 focus-visible:ring-offset-2"
                >
                  {installLabel}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  Más tarde
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {iosModalOpen && (
        <InstallInstructionsModal
          platform={platform}
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
              `}</style>
    </>
  );
}

interface InstallInstructionsModalProps {
  platform: Platform;
  onClose: () => void;
  onComplete: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
  lastRef: React.RefObject<HTMLButtonElement | null>;
}

function InstallInstructionsModal({
  platform,
  onClose,
  onComplete,
  firstRef,
  lastRef,
}: InstallInstructionsModalProps) {
  const isIos = platform === "ios";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="zs-pwa-ios-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white"
        style={{ boxShadow: "var(--shadow-zs-blue-glow-lg)" }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-zs-blue-900 via-zs-tennis-300 to-zs-red-600"
        />
        <button
          ref={firstRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar instrucciones"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-900"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="px-5 pb-5 pt-7 sm:px-6 sm:pb-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-zs-blue-900/5 ring-1 ring-zs-blue-900/10">
              <Image
                src="/icons/icon-192.png"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </div>
            <div>
              <h2 id="zs-pwa-ios-title" className="text-base font-semibold text-zs-blue-900">
                {isIos ? "Añadir Zona Sport a inicio" : "Cómo instalar Zona Sport"}
              </h2>
              <p className="text-xs text-gray-600">
                {isIos
                  ? "Solo 4 pasos en Safari"
                  : "Desde el menú de tu navegador"}
              </p>
            </div>
          </div>

          {isIos ? (
            <ol className="space-y-3">
              <Step
                n={1}
                title="Pulsa el icono de compartir"
                desc="Encuéntralo en la barra inferior de Safari."
                icon={<Share className="h-5 w-5 text-zs-blue-900" aria-hidden="true" />}
              />
              <Step
                n={2}
                title="Desliza y pulsa “Añadir a inicio”"
                desc="Aparece en la fila de acciones del menú compartir."
                icon={<Plus className="h-5 w-5 text-zs-blue-900" aria-hidden="true" />}
              />
              <Step
                n={3}
                title="Confirma con “Añadir”"
                desc="Arriba a la derecha del diálogo."
                icon={<Smartphone className="h-5 w-5 text-zs-blue-900" aria-hidden="true" />}
              />
              <Step
                n={4}
                title="¡Listo!"
                desc="Encuéntranos en tu pantalla de inicio."
                icon={<Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
              />
            </ol>
          ) : (
            <ol className="space-y-3">
              <Step
                n={1}
                title="Abre el menú del navegador"
                desc="En Chrome y Edge: los tres puntos arriba a la derecha."
                icon={<Plus className="h-5 w-5 text-zs-blue-900" aria-hidden="true" />}
              />
              <Step
                n={2}
                title="Selecciona “Instalar aplicación”"
                desc="También puede aparecer como “Añadir a pantalla de inicio”."
                icon={<Smartphone className="h-5 w-5 text-zs-blue-900" aria-hidden="true" />}
              />
              <Step
                n={3}
                title="Confirma la instalación"
                desc="Se abrirá como una app independiente, sin barras del navegador."
                icon={<Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />}
              />
            </ol>
          )}

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
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zs-blue-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-900 focus-visible:ring-offset-2"
            >
              Lo he hecho
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
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zs-blue-900 px-1.5 text-[10px] font-bold text-white">
            {n}
          </span>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{desc}</p>
      </div>
    </li>
  );
}
