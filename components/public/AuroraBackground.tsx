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
 * Gate por pathname: aparece en (casi) todas las páginas públicas. Solo se
 * EXCLUYE la home `/`, que tiene su propio vídeo hero a pantalla completa
 * (la aurora quedaría tapada). El componente no pinta nada — solo conmuta la
 * clase en <body>.
 */
const DENY_EXACT = new Set(["/"]);
const DENY_PREFIX: string[] = [];

export function AuroraBackground() {
  const pathname = usePathname() ?? "/";
  const denied = DENY_EXACT.has(pathname) || DENY_PREFIX.some((p) => pathname.startsWith(p));

  useEffect(() => {
    document.body.classList.toggle("aurora-active", !denied);
    return () => document.body.classList.remove("aurora-active");
  }, [denied]);

  return null;
}
