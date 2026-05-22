"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Fondo azul cielo claro (Bloque 9.1): gradiente cielo + grid sutil + glows
 * animados, en estructura tipo Linear/Vercel pero en paleta clara. Premium
 * tech accesible; identidad azul de marca conservada.
 *
 * Por qué se pinta como FONDO del <body> (clase `aurora-active`) y NO como una
 * capa `fixed -z-10`: en este sitio el navegador propaga el fondo blanco del
 * <body> al lienzo del viewport y un elemento `fixed` con z-index 0/negativo
 * se pinta DETRÁS de ese lienzo → invisible (verificado con Playwright). Pintar
 * sobre el lienzo del body es la única vía que funciona sin tocar otros
 * archivos. El componente no pinta nada; solo conmuta la clase según la ruta.
 *
 * Gate por pathname: páginas internas (listados, ficha, catálogo, carrito…).
 * Se EXCLUYEN home, hubs de género e informativas (tienen su propio hero / no
 * lo necesitan).
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
