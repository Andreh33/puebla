import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { buildMetadata } from "@/lib/seo/metadata";
import { localBusinessSchema, websiteSchema, jsonLd } from "@/lib/seo/schema-org";
import { CookieConsent } from "@/components/public/CookieConsent";
import { AnalyticsGate } from "@/components/public/AnalyticsGate";
import { ServiceWorkerRegistration } from "@/components/public/ServiceWorkerRegistration";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
  variable: "--font-manrope",
});

export const metadata: Metadata = buildMetadata({
  title: "Tienda de deportes en Puebla de la Calzada",
  path: "/",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1228" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-ES" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Preload del modelo 3D + imagen demo del fallback (LCP) */}
        <link
          rel="preload"
          as="fetch"
          href="/3d/zapatilla.glb"
          type="model/gltf-binary"
          crossOrigin="anonymous"
        />
        <link rel="preload" as="image" href="/sample-products/bota-alta-8000-tovir-negro.webp" />
        <meta name="application-name" content="Zona Sport" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Zona Sport" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(localBusinessSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema()) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a href="#main" className="skip-to-content">
          Saltar al contenido
        </a>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
        <CookieConsent />
        <AnalyticsGate />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
