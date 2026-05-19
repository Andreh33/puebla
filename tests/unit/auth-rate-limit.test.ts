import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests para el limitador de ratio en memoria.
 * Cubrimos: pico (limit + 1), expiración por ventana, y barrido (sweep) cuando
 * el módulo lleva tiempo sin tocar buckets.
 *
 * Importante: el módulo guarda los buckets en memoria a nivel de módulo, por lo
 * que usamos `vi.resetModules()` entre tests para empezar con estado limpio.
 */

describe("rateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite hasta el límite configurado y rechaza el siguiente intento", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const opts = { limit: 3, windowMs: 60_000 };

    const r1 = rateLimit("k1", opts);
    const r2 = rateLimit("k1", opts);
    const r3 = rateLimit("k1", opts);
    const r4 = rateLimit("k1", opts);

    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.ok).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r4.ok).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetAt).toBeGreaterThan(Date.now());
  });

  it("reinicia el contador cuando la ventana expira", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const opts = { limit: 2, windowMs: 1_000 };

    expect(rateLimit("k2", opts).ok).toBe(true);
    expect(rateLimit("k2", opts).ok).toBe(true);
    expect(rateLimit("k2", opts).ok).toBe(false);

    // Avanza más allá de la ventana
    vi.advanceTimersByTime(1_500);

    const fresh = rateLimit("k2", opts);
    expect(fresh.ok).toBe(true);
    expect(fresh.remaining).toBe(1);
  });

  it("aísla buckets por clave distinta", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const opts = { limit: 1, windowMs: 60_000 };
    expect(rateLimit("a", opts).ok).toBe(true);
    expect(rateLimit("a", opts).ok).toBe(false);
    expect(rateLimit("b", opts).ok).toBe(true);
  });

  it("el sweep elimina buckets caducados tras el intervalo de barrido", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const opts = { limit: 1, windowMs: 1_000 };
    // Llena 50 buckets distintos
    for (let i = 0; i < 50; i++) {
      expect(rateLimit(`ip-${i}`, opts).ok).toBe(true);
    }
    // Avanza más allá del SWEEP_INTERVAL (5 min) y la ventana
    vi.advanceTimersByTime(6 * 60_000);

    // Cualquier llamada debería ser ok porque los buckets viejos quedaron
    // marcados como caducados y el sweep los limpia
    const r = rateLimit("ip-0", opts);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it("incluye resetAt coherente con el inicio de la ventana", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");
    const opts = { limit: 5, windowMs: 10_000 };
    const start = Date.now();
    const r = rateLimit("k3", opts);
    expect(r.resetAt).toBe(start + 10_000);
  });
});
