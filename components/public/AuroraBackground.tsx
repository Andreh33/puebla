"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Aurora de fondo (Bloque 7.5, revisada tras feedback "no se ve").
 *
 * Por qué NO una capa con z-index negativo: el navegador propaga el fondo
 * blanco del <body> al lienzo del viewport, y un elemento `fixed` con z-index
 * 0/negativo se pinta DETRÁS de ese lienzo → invisible (verificado con
 * Playwright). En su lugar pintamos la aurora como FONDO del propio <body>
 * (vía la clase `aurora-active`): es el lienzo, siempre visible tras el
 * contenido transparente y sin teñir las fotos (las cards van opacas encima).
 *
 * Gate por pathname: solo en listados/ficha/marca. NO en home, hubs de género
 * ni páginas informativas. El componente no pinta nada — solo conmuta la clase.
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

  useEffect(() => {
    document.body.classList.toggle("aurora-active", !denied);
    return () => document.body.classList.remove("aurora-active");
  }, [denied]);

  return null;
}
