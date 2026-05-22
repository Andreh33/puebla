import { describe, expect, it, beforeEach } from "vitest";
import {
  markDismissed,
  markInstalled,
  markShown,
  clearPwaState,
  getDismissedAt,
  getInstalledAt,
  getShownAt,
  shouldShowPrompt,
  detectPlatform,
  PWA_DISMISS_DAYS,
  type StorageLike,
} from "@/lib/pwa/install-state";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("PWA install state helpers", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("persiste dismissedAt y lo recupera", () => {
    expect(getDismissedAt(storage)).toBeNull();
    markDismissed(1700000000000, storage);
    expect(getDismissedAt(storage)).toBe(1700000000000);
  });

  it("persiste installedAt y lo recupera", () => {
    markInstalled(1700000000000, storage);
    expect(getInstalledAt(storage)).toBe(1700000000000);
  });

  it("persiste shownAt y lo recupera", () => {
    expect(getShownAt(storage)).toBeNull();
    markShown(1700000000000, storage);
    expect(getShownAt(storage)).toBe(1700000000000);
  });

  it("clearPwaState borra todas las marcas", () => {
    markDismissed(1, storage);
    markInstalled(2, storage);
    markShown(3, storage);
    clearPwaState(storage);
    expect(getDismissedAt(storage)).toBeNull();
    expect(getInstalledAt(storage)).toBeNull();
    expect(getShownAt(storage)).toBeNull();
  });

  it("ignora valores no numéricos", () => {
    storage.setItem("zs_pwa_dismissed_at", "no-es-un-numero");
    expect(getDismissedAt(storage)).toBeNull();
  });
});

describe("shouldShowPrompt (cadencia 1×/2 semanas)", () => {
  let storage: StorageLike;
  const now = 1_700_000_000_000;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("muestra en desktop si no hay dismiss/install", () => {
    expect(
      shouldShowPrompt({
        now,
        platform: "desktop",
        isStandalone: false,
        storage,
      }),
    ).toBe(true);
  });

  it("no muestra si ya está instalada (standalone)", () => {
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: true,
        storage,
      }),
    ).toBe(false);
  });

  it("muestra en Android sin dismiss previo", () => {
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: false,
        storage,
      }),
    ).toBe(true);
  });

  it("muestra en iOS sin dismiss previo", () => {
    expect(
      shouldShowPrompt({
        now,
        platform: "ios",
        isStandalone: false,
        storage,
      }),
    ).toBe(true);
  });

  it("no muestra si fue descartado dentro del periodo de gracia (2 semanas)", () => {
    markDismissed(now - 3 * DAY_MS, storage);
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: false,
        storage,
      }),
    ).toBe(false);
  });

  it("vuelve a mostrar pasados PWA_DISMISS_DAYS desde el dismiss", () => {
    markDismissed(now - (PWA_DISMISS_DAYS + 1) * DAY_MS, storage);
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: false,
        storage,
      }),
    ).toBe(true);
  });

  it("no muestra si se MOSTRÓ hace menos de 2 semanas (cadencia 1×/2sem)", () => {
    markShown(now - 5 * DAY_MS, storage);
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: false,
        storage,
      }),
    ).toBe(false);
  });

  it("vuelve a mostrar pasados PWA_DISMISS_DAYS desde que se mostró", () => {
    markShown(now - (PWA_DISMISS_DAYS + 1) * DAY_MS, storage);
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: false,
        storage,
      }),
    ).toBe(true);
  });

  it("PWA_DISMISS_DAYS está fijado a 14 (2 semanas)", () => {
    expect(PWA_DISMISS_DAYS).toBe(14);
  });

  it("nunca muestra si ya se instaló", () => {
    markInstalled(now - 365 * DAY_MS, storage);
    expect(
      shouldShowPrompt({
        now,
        platform: "android",
        isStandalone: false,
        storage,
      }),
    ).toBe(false);
  });
});

describe("detectPlatform", () => {
  it("detecta iOS por UA", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        true,
      ),
    ).toBe("ios");
  });

  it("detecta Android por UA", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120",
        true,
      ),
    ).toBe("android");
  });

  it("detecta desktop con ancho > 768", () => {
    expect(
      detectPlatform(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
        false,
      ),
    ).toBe("desktop");
  });

  it("devuelve 'other' para móvil no Android/iOS", () => {
    expect(
      detectPlatform("Mozilla/5.0 (Linux; KaiOS) AppleWebKit/537.36", true),
    ).toBe("other");
  });
});
