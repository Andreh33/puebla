"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/lib/cookies/consent";

export function CookieReopenButton() {
  const { reopen } = useConsent();
  return (
    <Button onClick={reopen} variant="outline" size="sm">
      <Settings2 className="h-4 w-4" />
      Configurar cookies
    </Button>
  );
}
