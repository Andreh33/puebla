"use client";



import { useTranslatedValue, useTranslatedTemplate } from "@/components/public/LocaleProvider";
import { useTranslations } from "@/components/public/LocaleProvider";
import { useEffect, useState } from "react";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
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
  const tx = useTranslatedValue();
  const t = useTranslations();
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
        aria-label={t("Cerrar y rechazar cookies opcionales")}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zs-muted hover:bg-zs-surface"
      >
        <X className="h-4 w-4" />
      </button>

      {tx(!showPanel ? (
        <>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-zs-blue-50 p-2 text-zs-blue-700">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 id="zs-cookie-title" className="text-base font-semibold text-zs-blue-900">
                {t("Cuidamos tu privacidad")}</h2>
              <p className="mt-1 text-sm text-zs-ink/85">
                {t("Usamos cookies técnicas necesarias para el funcionamiento de la web. También queremos usar cookies analíticas para entender cómo navegas y mejorar la tienda. Puedes aceptarlas todas, rechazarlas o elegir qué categorías permites. Más información en nuestra")}{" "}
                <Link href="/politica-cookies" className="underline hover:text-zs-blue-700">
                  {t("Política de cookies")}</Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowPanel(true)}>
              <Settings2 className="h-4 w-4" /> {t("Configurar")}</Button>
            <Button variant="outline" size="sm" onClick={rejectAll}>
              {t("Rechazar")}</Button>
            <Button size="sm" onClick={acceptAll}>
              {t("Aceptar todo")}</Button>
          </div>
        </>
      ) : (
        <>
          <h2 id="zs-cookie-title" className="text-base font-semibold text-zs-blue-900">
            {t("Preferencias de cookies")}</h2>
          <p className="mt-1 text-sm text-zs-ink/80">
            {t("Activa o desactiva las categorías. Las técnicas son imprescindibles y no se pueden desactivar.")}</p>

          <div className="mt-5 space-y-4">
            <CategoryRow
              title={t("Necesarias")}
              description={t("Cookies imprescindibles para que la web funcione: sesión, carrito, preferencia de consentimiento.")}
              checked
              disabled
            />
            <CategoryRow
              title={t("Analíticas")}
              description={t("Vercel Analytics y Speed Insights. Nos ayudan a entender qué páginas funcionan y dónde hay errores. Datos agregados y anónimos.")}
              checked={prefs.analytics}
              onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
            />
            <CategoryRow
              title={t("Marketing")}
              description={t("Reservadas para futuras campañas de retargeting. Actualmente no las usamos.")}
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setShowPanel(false)}>
              {t("Volver")}</Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" onClick={rejectAll}>
                {t("Rechazar todo")}</Button>
              <Button size="sm" onClick={savePrefs}>
                {t("Guardar preferencias")}</Button>
            </div>
          </div>
        </>
      ))}
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
  const tx = useTranslatedValue();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-zs-border bg-zs-surface/50 p-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-zs-blue-900">{tx(title)}</p>
        <p className="mt-1 text-xs text-zs-ink/75">{tx(description)}</p>
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
