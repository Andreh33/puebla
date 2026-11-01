"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getConsent, useConsent } from "@/lib/cookies/consent";

// Los SDK conservan sus scripts tras desmontarse. Consultar la cookie en cada
// envío bloquea también sus eventos pendientes después de retirar el permiso.
function withAnalyticsConsent<T>(event: T): T | null {
  return getConsent()?.categories.analytics === true ? event : null;
}

/**
 * Carga Vercel Analytics y SpeedInsights únicamente si el usuario ha dado su
 * consentimiento explícito a la categoría "analytics".
 */
export function AnalyticsGate() {
  const { consent, isLoaded } = useConsent();
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    if (isLoaded && consent?.categories.analytics === true) setHasConsented(true);
  }, [isLoaded, consent?.categories.analytics]);

  if (!hasConsented) return null;
  // Mantener la instancia conserva el seguimiento de ruta de Speed Insights si
  // se vuelve a aceptar. beforeSend bloquea los envíos mientras no haya permiso.
  return (
    <>
      <Analytics beforeSend={withAnalyticsConsent} />
      <SpeedInsights beforeSend={withAnalyticsConsent} />
    </>
  );
}
