"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useConsent } from "@/lib/cookies/consent";

/**
 * Carga Vercel Analytics y SpeedInsights únicamente si el usuario ha dado su
 * consentimiento explícito a la categoría "analytics".
 */
export function AnalyticsGate() {
  const { consent, isLoaded } = useConsent();
  if (!isLoaded) return null;
  if (!consent?.categories.analytics) return null;
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
