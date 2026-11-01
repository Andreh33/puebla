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
          "Nuestro contador de páginas es opcional y permanece desactivado hasta que lo permitas. Puedes cambiar tu elección en cualquier momento.",
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
          {t("Permitir contador de páginas")}
        </Button>
        <Button
          type="button"
          onClick={() => update({ analytics: false, marketing: false })}
          disabled={!isLoaded}
          variant="outline"
          size="sm"
        >
          <Settings2 className="h-4 w-4" />
          {t("Desactivar contador de páginas")}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-zs-muted mt-2 text-xs">
        {isLoaded
          ? consent?.categories.analytics
            ? t("Contador de páginas activado.")
            : t("Contador de páginas desactivado.")
          : null}
      </p>
    </div>
  );
}
