"use client";
import { useTranslations } from "@/components/public/LocaleProvider";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/lib/cookies/consent";
export function CookieReopenButton() {
  const t = useTranslations();
  const { consent, isLoaded, update } = useConsent();
  return (
    <div>
      <p className="text-zs-muted mb-3 text-sm">
        {t(
          "La analítica opcional mide las visitas y el rendimiento con Vercel Analytics, Speed Insights y nuestro contador de páginas. Puedes cambiar tu elección en cualquier momento.",
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => update({ analytics: true, marketing: false })}
          disabled={!isLoaded}
          variant="outline"
          size="sm"
        >
          {t("Permitir analítica opcional")}
        </Button>
        <Button
          type="button"
          onClick={() => update({ analytics: false, marketing: false })}
          disabled={!isLoaded}
          variant="outline"
          size="sm"
        >
          <Settings2 className="h-4 w-4" />
          {t("Desactivar cookies opcionales")}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-zs-muted mt-2 text-xs">
        {isLoaded
          ? consent?.categories.analytics
            ? t("Analítica opcional activada.")
            : t("Cookies opcionales desactivadas.")
          : null}
      </p>
    </div>
  );
}
