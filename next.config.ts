import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "recharts",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Las portadas del blog son SVG de generación propia (/blog-covers/*.svg).
    // next/image los rechaza por defecto (HTTP 400 en /_next/image). Como son de
    // confianza (no de usuario), los permitimos con una CSP estricta que bloquea
    // scripts y sandboxea el render → riesgo nulo.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
      { protocol: "https", hostname: "www.johnsmith-sport.com" },
      { protocol: "https", hostname: "www.mas8000.com" },
      { protocol: "https", hostname: "www.aguirreycia.es" },
      { protocol: "https", hostname: "aguirreycia.es" },
    ],
  },
  async redirects() {
    return [
      // /nino y /nina YA NO redirigen: desde el Bloque 4 son hubs reales
      // (app/(public)/nino|nina/page.tsx con GenderLanding + GenderHub).
      //
      // El plural combinado /ninos se retira en favor del modelo
      // género→familia separado por hubs; el tráfico legacy redirige al hub
      // de niño por defecto (301 permanente; Next emite 308, equivalente).
      { source: "/ninos", destination: "/nino", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
          },
        ],
      },
      {
        source: "/admin/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  serverExternalPackages: [
    "sharp",
    "exceljs",
    // SheetJS (lector universal de tablas: xlsx/xls/ods/csv…). Es CommonJS
    // Node-only; lo dejamos external para que el bundler de producción no lo
    // procese y se cargue tal cual en runtime Node.
    "xlsx",
    "@prisma/client",
    "bcryptjs",
    // paapi5-nodejs-sdk usa imports relativos sin "./" que el bundler de
    // producción de Next no resuelve. Lo cargamos en runtime Node tal cual.
    "paapi5-nodejs-sdk",
    // Stripe SDK es Node-only y pesado; lo dejamos external para no inflar
    // los bundles de las funciones que no lo usan.
    "stripe",
    // @react-pdf/renderer es Node-only (fontkit/yoga); fuera del bundler de prod.
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
