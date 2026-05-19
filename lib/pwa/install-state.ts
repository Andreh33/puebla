/**
 * Estado de instalación PWA — helpers puros sobre localStorage.
 * Separado del componente para poder testear sin DOM completo.
 */

export const PWA_DISMISSED_KEY = "zs_pwa_dismissed_at";
export const PWA_INSTALLED_KEY = "zs_pwa_installed_at";
export const PWA_PAGEVIEWS_KEY = "zs_pwa_pageviews";

/** Días que silencia el banner tras un "Ahora no". */
export const PWA_DISMISS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Storage mínimo — permite inyectar mock en tests. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function safeStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function markDismissed(now: number = Date.now(), storage?: StorageLike): void {
  const s = storage ?? safeStorage();
  if (!s) return;
  s.setItem(PWA_DISMISSED_KEY, String(now));
}

export function markInstalled(now: number = Date.now(), storage?: StorageLike): void {
  const s = storage ?? safeStorage();
  if (!s) return;
  s.setItem(PWA_INSTALLED_KEY, String(now));
}

export function clearPwaState(storage?: StorageLike): void {
  const s = storage ?? safeStorage();
  if (!s) return;
  s.removeItem(PWA_DISMISSED_KEY);
  s.removeItem(PWA_INSTALLED_KEY);
  s.removeItem(PWA_PAGEVIEWS_KEY);
}

export function getDismissedAt(storage?: StorageLike): number | null {
  const s = storage ?? safeStorage();
  if (!s) return null;
  const raw = s.getItem(PWA_DISMISSED_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getInstalledAt(storage?: StorageLike): number | null {
  const s = storage ?? safeStorage();
  if (!s) return null;
  const raw = s.getItem(PWA_INSTALLED_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface ShouldShowInput {
  /** Pageviews acumuladas (sessionStorage). */
  pageviews: number;
  /** Tiempo ahora (ms). */
  now: number;
  /** Plataforma detectada. */
  platform: "android" | "ios" | "desktop" | "other";
  /** ¿La app ya corre en modo standalone? */
  isStandalone: boolean;
  /** Inyectable para test. */
  storage?: StorageLike;
}

/**
 * Decide si el banner debe mostrarse:
 *  - nunca en desktop
 *  - nunca si ya está instalada
 *  - nunca si se descartó en los últimos 30 días
 *  - nunca si ya se instaló alguna vez
 *  - solo tras 2+ pageviews
 */
export function shouldShowPrompt(input: ShouldShowInput): boolean {
  if (input.isStandalone) return false;
  if (input.platform === "desktop" || input.platform === "other") return false;
  if (input.pageviews < 2) return false;

  if (getInstalledAt(input.storage) !== null) return false;

  const dismissedAt = getDismissedAt(input.storage);
  if (dismissedAt !== null) {
    const elapsed = input.now - dismissedAt;
    if (elapsed < PWA_DISMISS_DAYS * DAY_MS) return false;
  }

  return true;
}

export function incrementPageviews(storage?: Storage): number {
  if (typeof window === "undefined") return 0;
  const s = storage ?? window.sessionStorage;
  try {
    const raw = s.getItem(PWA_PAGEVIEWS_KEY);
    const current = raw ? Number(raw) : 0;
    const next = (Number.isFinite(current) ? current : 0) + 1;
    s.setItem(PWA_PAGEVIEWS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function getPageviews(storage?: Storage): number {
  if (typeof window === "undefined") return 0;
  const s = storage ?? window.sessionStorage;
  try {
    const raw = s.getItem(PWA_PAGEVIEWS_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export type Platform = "android" | "ios" | "desktop" | "other";

/** Detecta plataforma a partir de UA + matchMedia. */
export function detectPlatform(ua: string, isMobileWidth: boolean): Platform {
  const lower = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(lower)) return "ios";
  // iPadOS 13+ se reporta como Mac — heurística:
  if (/macintosh/.test(lower) && typeof navigator !== "undefined" && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1) {
    return "ios";
  }
  if (/android/.test(lower)) return "android";
  if (!isMobileWidth) return "desktop";
  return "other";
}
