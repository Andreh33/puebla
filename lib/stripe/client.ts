/**
 * Stripe client singleton (lazy, server-only).
 *
 * Filosofía: el cliente NO se construye en import-time. Todas las funciones
 * que necesitan Stripe llaman a `getStripe()` y reciben `null` si las env
 * vars `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` no están definidas.
 *
 * Esto permite:
 *   - El build de Vercel no falla por ausencia de env vars Stripe.
 *   - Los endpoints `/api/stripe/*` devuelven 503 con mensaje útil.
 *   - La UI `/admin/pedidos` detecta el estado "no configurado" y muestra
 *     instrucciones de activación.
 *
 * Cuando el cliente añada las claves a Vercel, el sistema se autoactiva en el
 * siguiente cold start — no hace falta tocar código.
 */

import "server-only";
import Stripe from "stripe";
import { STRIPE_ENV_VARS, type StripeEnvVar } from "./types";

let _stripe: Stripe | null = null;
let _checkedEnv = false;

/**
 * Devuelve un singleton de Stripe o `null` si no hay `STRIPE_SECRET_KEY`.
 *
 * No lanza nunca. Cachea el cliente entre invocaciones para reusar el pool de
 * conexiones HTTP en cold starts compartidos.
 */
export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env[STRIPE_ENV_VARS.secret];
  if (!key) return null;

  _stripe = new Stripe(key, {
    // Pin de versión: usamos la última soportada por el SDK instalado
    // (`stripe@22.x` → `2026-04-22.dahlia`). El typings de `LatestApiVersion`
    // se actualiza con el paquete; un cliente sin pin usa por defecto la
    // misma. Definimos el valor explícitamente para que cualquier dev pueda
    // ver de un vistazo contra qué API hablamos.
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    // En serverless (Vercel Fluid Compute) el cliente HTTP por defecto del SDK
    // (Node `https` con keep-alive) reutiliza sockets entre invocaciones que
    // pueden estar muertos → "An error occurred with our connection to Stripe.
    // Request was retried N times". El cliente basado en `fetch` (global de
    // Node 24) crea conexiones limpias y evita ese fallo de conexión.
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 3,
    appInfo: {
      name: "Zona Sport",
      url: "https://zonasport.es",
    },
  });
  return _stripe;
}

/**
 * Indica si el módulo Stripe está completamente configurado (clave secreta +
 * webhook secret). La publishable es opcional para los endpoints server, pero
 * obligatoria si quieres montar Elements en el cliente.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env[STRIPE_ENV_VARS.secret]);
}

/** Lista de variables Stripe que faltan ahora mismo. */
export function missingStripeEnv(): StripeEnvVar[] {
  const missing: StripeEnvVar[] = [];
  if (!process.env[STRIPE_ENV_VARS.secret]) missing.push(STRIPE_ENV_VARS.secret);
  if (!process.env[STRIPE_ENV_VARS.webhook]) missing.push(STRIPE_ENV_VARS.webhook);
  if (!process.env[STRIPE_ENV_VARS.publishable]) {
    missing.push(STRIPE_ENV_VARS.publishable);
  }
  return missing;
}

/**
 * Loggea una sola vez por proceso si las claves faltan, para no inundar logs
 * en cold starts repetidos. Útil al arrancar webhooks que no se pueden ejercer.
 */
export function warnIfStripeMissing(context: string): void {
  if (_checkedEnv) return;
  _checkedEnv = true;
  const missing = missingStripeEnv();
  if (missing.length > 0) {
    console.warn(
      `[stripe:${context}] Variables de entorno ausentes: ${missing.join(", ")}. ` +
        "El TPV permanece inactivo hasta que se configuren en Vercel.",
    );
  }
}
