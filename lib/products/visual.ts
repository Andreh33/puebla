/**
 * lib/products/visual.ts — Realces visuales deterministas por producto (Bloque 7 §7.5).
 */

/**
 * ¿Esta card lleva borde pastel animado? Determinista por una clave estable del
 * producto (su slug): el mismo producto da SIEMPRE el mismo resultado en SSR y
 * en cliente (sin hydration mismatch — nada de Math.random/Date) y entre
 * recargas. Hash polinómico simple → ~20% de los productos (1 de cada 5).
 */
export function hasAnimatedBorder(key: string): boolean {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 5 === 0;
}
