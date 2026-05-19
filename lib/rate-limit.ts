/**
 * Rate limiter en memoria (compatible con Vercel siempre que el handler corra en
 * un mismo container). Para producción seria, sustituir por Upstash Redis.
 *
 * Uso:
 *   const ok = rateLimit(`login:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
 *   if (!ok) return new Response("Too many requests", { status: 429 });
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

const SWEEP_INTERVAL = 5 * 60_000;
let lastSweep = Date.now();

function sweep() {
  if (Date.now() - lastSweep < SWEEP_INTERVAL) return;
  lastSweep = Date.now();
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: boolean; remaining: number; resetAt: number } {
  sweep();
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt < now) {
    const fresh = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: opts.limit - 1, resetAt: fresh.resetAt };
  }

  if (b.count >= opts.limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  return { ok: true, remaining: opts.limit - b.count, resetAt: b.resetAt };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
