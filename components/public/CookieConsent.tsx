"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getConsent,
  setConsent,
  CONSENT_VERSION,
} from "@/lib/cookies/consent";

type Categories = { analytics: boolean; marketing: boolean };

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [prefs, setPrefs] = useState<Categories>({ analytics: false, marketing: false });

  useEffect(() => {
    const existing = getConsent();
    if (!existing || existing.version !== CONSENT_VERSION) {
      // Pequeño retraso para no entorpecer LCP.
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    } else {
      setPrefs({
        analytics: existing.categories.analytics,
        marketing: existing.categories.marketing,
      });
    }
  }, []);

  // Permitir reabrir el banner desde la política de cookies.
  useEffect(() => {
    function reopen() {
      const existing = getConsent();
      if (existing) {
        setPrefs({
          analytics: existing.categories.analytics,
          marketing: existing.categories.marketing,
        });
      }
      setVisible(true);
      setShowPanel(true);
    }
    window.addEventListener("zs:consent-reopen", reopen);
    return () => window.removeEventListener("zs:consent-reopen", reopen);
  }, []);

  if (!visible) return null;

  function acceptAll() {
    setConsent({ analytics: true, marketing: true });
    setVisible(false);
  }
  function rejectAll() {
    setConsent({ analytics: false, marketing: false });
    setVisible(false);
  }
  function savePrefs() {
    setConsent(prefs);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="zs-cookie-title"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-2xl border border-zs-border bg-white p-5 shadow-2xl sm:right-6 sm:left-auto sm:bottom-6 sm:p-6"
    >
      <button
        type="button"
        onClick={rejectAll}
        aria-label="Cerrar y rechazar cookies opcionales"
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zs-muted hover:bg-zs-surface"
      >
        <X className="h-4 w-4" />
      </button>

      {!showPanel ? (
        <>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-zs-blue-50 p-2 text-zs-blue-700">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 id="zs-cookie-title" className="text-base font-semibold text-zs-blue-900">
                Cuidamos tu privacidad
              </h2>
              <p className="mt-1 text-sm text-zs-ink/85">
                Usamos cookies técnicas necesarias para el funcionamiento de la web. También
                queremos usar cookies analíticas para entender cómo navegas y mejorar la tienda.
                Puedes aceptarlas todas, rechazarlas o elegir qué categorías permites. Más
                información en nuestra{" "}
                <Link href="/politica-cookies" className="underline hover:text-zs-blue-700">
                  Política de cookies
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowPanel(true)}>
              <Settings2 className="h-4 w-4" /> Configurar
            </Button>
            <Button variant="outline" size="sm" onClick={rejectAll}>
              Rechazar
            </Button>
            <Button size="sm" onClick={acceptAll}>
              Aceptar todo
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 id="zs-cookie-title" className="text-base font-semibold text-zs-blue-900">
            Preferencias de cookies
          </h2>
          <p className="mt-1 text-sm text-zs-ink/80">
            Activa o desactiva las categorías. Las técnicas son imprescindibles y no se pueden
            desactivar.
          </p>

          <div className="mt-5 space-y-4">
            <CategoryRow
              title="Necesarias"
              description="Cookies imprescindibles para que la web funcione: sesión, carrito, preferencia de consentimiento."
              checked
              disabled
            />
            <CategoryRow
              title="Analíticas"
              description="Vercel Analytics y Speed Insights. Nos ayudan a entender qué páginas funcionan y dónde hay errores. Datos agregados y anónimos."
              checked={prefs.analytics}
              onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
            />
            <CategoryRow
              title="Marketing"
              description="Reservadas para futuras campañas de retargeting. Actualmente no las usamos."
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowPanel(false)}>
              Volver
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={rejectAll}>
                Rechazar todo
              </Button>
              <Button size="sm" onClick={savePrefs}>
                Guardar preferencias
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-zs-border bg-zs-surface/50 p-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-zs-blue-900">{title}</p>
        <p className="mt-1 text-xs text-zs-ink/75">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={`Activar categoría ${title}`}
      />
    </div>
  );
}
