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
    return [];
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
    "@prisma/client",
    "bcryptjs",
    // paapi5-nodejs-sdk usa imports relativos sin "./" que el bundler de
    // producción de Next no resuelve. Lo cargamos en runtime Node tal cual.
    "paapi5-nodejs-sdk",
    // Stripe SDK es Node-only y pesado; lo dejamos external para no inflar
    // los bundles de las funciones que no lo usan.
    "stripe",
  ],
};

export default nextConfig;
