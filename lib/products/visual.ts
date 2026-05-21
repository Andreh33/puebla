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

/**
 * Selecciona qué productos de un LISTADO concreto llevan el borde animado:
 * ~20% de los productos visibles (no del catálogo total), distribuidos de forma
 * uniforme por posición para que no se aglomeren. Estable por listado (no usa
 * azar) → sin re-renders ni mismatch SSR/cliente. Devuelve un Set para lookup
 * O(1). Lista vacía → Set vacío.
 *
 * Motivo (hotfix Bloque 7.5): `hasAnimatedBorder(slug)` daba 20% del catálogo
 * total y, por reparto de hashes, en listados pequeños podían tocar 0-2 cards;
 * el cliente apenas las veía. Esto garantiza ~1 de cada 5 EN PANTALLA.
 */
export function selectAnimatedBorderIds<T extends { id: string }>(products: T[]): Set<string> {
  const selected = new Set<string>();
  if (products.length === 0) return selected;
  const count = Math.max(1, Math.round(products.length * 0.2));
  const step = products.length / count;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(i * step + step / 2);
    const picked = products[idx];
    if (picked) selected.add(picked.id);
  }
  return selected;
}
