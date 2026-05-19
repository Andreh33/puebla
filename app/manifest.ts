import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zona Sport — Puebla de la Calzada",
    short_name: "Zona Sport",
    description:
      "Tienda de deportes en Puebla de la Calzada (Badajoz). Running, pádel, montaña, fitness, calzado y complementos.",
    start_url: "/?source=pwa",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#14225b",
    lang: "es-ES",
    dir: "ltr",
    categories: ["shopping", "sports", "lifestyle"],
    icons: [
      // SVG escalable — útil para favicon de alta nitidez en algunos contextos.
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      // PNG reales generadas por scripts/process-logo.ts (logo Zona Sport).
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Running",
        short_name: "Running",
        description: "Catálogo de running y trail",
        url: "/running?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Pádel",
        short_name: "Pádel",
        description: "Material y palas de pádel",
        url: "/padel?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Contacto",
        short_name: "Contacto",
        description: "Habla con nuestra tienda",
        url: "/contacto?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/wide.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Zona Sport — Catálogo en escritorio",
      },
      {
        src: "/screenshots/narrow.png",
        sizes: "720x1280",
        type: "image/png",
        form_factor: "narrow",
        label: "Zona Sport — Catálogo en móvil",
      },
    ],
  };
}
