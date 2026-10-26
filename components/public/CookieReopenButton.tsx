"use client";
import { useState } from "react";
import { useTranslations } from "@/components/public/LocaleProvider";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/lib/cookies/consent";
export function CookieReopenButton() {
  const t = useTranslations();
  const { update } = useConsent();
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <Button
        onClick={() => {
          update({ analytics: false, marketing: false });
          setSaved(true);
        }}
        variant="outline"
        size="sm"
      >
        <Settings2 className="h-4 w-4" />
        {t("Desactivar cookies opcionales")}
      </Button>
      <p role="status" aria-live="polite" className="text-zs-muted mt-2 text-xs">
        {saved ? t("Cookies opcionales desactivadas.") : null}
      </p>
    </div>
  );
}
