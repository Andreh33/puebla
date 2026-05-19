/**
 * Helpers puros para Amazon (sin "server-only" para que sean testables).
 */

const ASIN_REGEX = /^[A-Z0-9]{10}$/;

/**
 * Extrae ASIN de un input que puede ser:
 *   - Un ASIN puro ("B0CXYZ1234")
 *   - Una URL de producto Amazon (/dp/ASIN, /gp/product/ASIN, etc.)
 * Devuelve null si no se reconoce.
 */
export function extractAsin(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  if (ASIN_REGEX.test(trimmed)) return trimmed;
  const m =
    input.match(/\/dp\/([A-Z0-9]{10})/i) ||
    input.match(/\/gp\/product\/([A-Z0-9]{10})/i) ||
    input.match(/\/gp\/aw\/d\/([A-Z0-9]{10})/i) ||
    input.match(/[?&]ASIN=([A-Z0-9]{10})/i);
  if (m && m[1]) return m[1].toUpperCase();
  return null;
}

export function buildAffiliateUrl(asin: string): string {
  const associateTag = process.env.AMAZON_ASSOCIATE_TAG || "zonasport-21";
  const marketplace = process.env.AMAZON_MARKETPLACE || "www.amazon.es";
  return `https://${marketplace}/dp/${asin}?tag=${encodeURIComponent(associateTag)}`;
}
