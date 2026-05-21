"use client";

import { usePathname } from "next/navigation";

/**
 * Patrón de puntos sutil de fondo (Bloque 7 paso 7.2). Fijo a viewport, detrás
 * de todo (`-z-10`), no interactivo. Animación de opacidad (shimmer) barata;
 * respeta prefers-reduced-motion.
 *
 * Se monta una vez en el layout público y decide por `usePathname` dónde
 * mostrarse: en listados (/catalogo, /[categoria], /[seccion]/textil|calzado),
 * ficha (/producto/*) y marca (/marca/*). NO en la home, los hubs de género
 * (/hombre, /mujer, /nino, /nina) ni páginas informativas (tienen su diseño).
 */
const DENY_EXACT = new Set([
  "/",
  "/hombre",
  "/mujer",
  "/nino",
  "/nina",
  "/contacto",
  "/marcas",
  "/sobre-nosotros",
]);
const DENY_PREFIX = ["/blog", "/tienda-en", "/politica"];

export function DotsBackground() {
  const pathname = usePathname() ?? "/";
  const denied = DENY_EXACT.has(pathname) || DENY_PREFIX.some((p) => pathname.startsWith(p));
  if (denied) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="dots-pattern absolute inset-0" />
    </div>
  );
}
