"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Gestión de consentimiento de cookies según RGPD / LSSI-CE.
 * Persiste en cookie `zs_consent` (no en localStorage para que el banner se
 * comporte igual en SSR y entre dispositivos del mismo navegador).
 */

export type ConsentCategories = {
  necessary: true; // siempre activa, no es opcional
  analytics: boolean;
  marketing: boolean;
};

export type ConsentState = {
  categories: ConsentCategories;
  /** Timestamp ISO de la última decisión. */
  updatedAt: string;
  /** Versión del banner / política — para invalidar consentimientos antiguos. */
  version: number;
};

export const CONSENT_COOKIE = "zs_consent";
export const CONSENT_VERSION = 1;
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

export const DEFAULT_CONSENT: ConsentState = {
  categories: { necessary: true, analytics: false, marketing: false },
  updatedAt: new Date(0).toISOString(),
  version: CONSENT_VERSION,
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

export function getConsent(): ConsentState | null {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentState;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setConsent(categories: Omit<ConsentCategories, "necessary"> & { necessary?: true }): ConsentState {
  const next: ConsentState = {
    categories: {
      necessary: true,
      analytics: !!categories.analytics,
      marketing: !!categories.marketing,
    },
    updatedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  writeCookie(CONSENT_COOKIE, JSON.stringify(next), CONSENT_MAX_AGE);
  // Notifica a otros componentes (p. ej. banner) en la misma pestaña.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zs:consent-change", { detail: next }));
  }
  return next;
}

export function clearConsent(): void {
  writeCookie(CONSENT_COOKIE, "", 0);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zs:consent-change", { detail: null }));
  }
}

/** Hook React para leer el consentimiento actual y reaccionar a cambios. */
export function useConsent(): {
  consent: ConsentState | null;
  isLoaded: boolean;
  update: (cats: Omit<ConsentCategories, "necessary"> & { necessary?: true }) => void;
  reopen: () => void;
} {
  const [consent, setConsentState] = useState<ConsentState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setConsentState(getConsent());
    setIsLoaded(true);

    function onChange(e: Event) {
      const detail = (e as CustomEvent<ConsentState | null>).detail;
      setConsentState(detail);
    }

    window.addEventListener("zs:consent-change", onChange);
    return () => window.removeEventListener("zs:consent-change", onChange);
  }, []);

  const update = useCallback(
    (cats: Omit<ConsentCategories, "necessary"> & { necessary?: true }) => {
      const next = setConsent(cats);
      setConsentState(next);
    },
    [],
  );

  const reopen = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("zs:consent-reopen"));
    }
  }, []);

  return { consent, isLoaded, update, reopen };
}
