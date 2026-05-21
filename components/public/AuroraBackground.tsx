"use client";

import { usePathname } from "next/navigation";

/**
 * Aurora animada de fondo (Bloque 7.5). 3 blobs de gradiente radial muy difuso
 * (azul cielo + morado lavanda + rosa polvo) que derivan lentamente. Premium y
 * no invasivo, estilo landing de Apple. Solo anima translate3d + scale (blur
 * fijo, no por frame) → barato. Respeta prefers-reduced-motion.
 *
 * Misma gate de path que el antiguo DotsBackground: no en home, ni hubs de
 * género, ni páginas informativas. Reemplaza a DotsBackground en el layout.
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

export function AuroraBackground() {
  const pathname = usePathname() ?? "/";
  const denied = DENY_EXACT.has(pathname) || DENY_PREFIX.some((p) => pathname.startsWith(p));
  if (denied) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
    </div>
  );
}
