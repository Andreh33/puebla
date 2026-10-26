import { isLocalePublished } from "./readiness";
import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
  jsonLd,
} from "@/lib/seo/schema-org";

import { AnalyticsGate } from "@/components/public/AnalyticsGate";
import { TrackPageView } from "@/components/public/TrackPageView";
import { ServiceWorkerRegistration } from "@/components/public/ServiceWorkerRegistration";
import "@/app/globals.css";
import { LOCALES, LOCALE_INFO, type Locale } from "./config";
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { getClientDictionary } from "./dictionaries";

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

export default function RootDocument({
  children,
  locale = "es",
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  return (
    <html lang={LOCALE_INFO[locale].language} className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="application-name" content="Zona Sport" />
        <meta
          name="google-site-verification"
          content="LP6vkEfusxa3ya5enfvVs2Y8JKgBFSvWxvk_xsNvyzo"
        />
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
          dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema(locale)) }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen overflow-x-hidden antialiased">
        <LocaleProvider
          locale={locale}
          dictionary={getClientDictionary(locale)}
          availableLocales={LOCALES.filter(isLocalePublished)}
        >
          <a href="#main" className="skip-to-content">
            {LOCALE_INFO[locale].skip}
          </a>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{ duration: 4000 }}
          />

          <AnalyticsGate />
          <TrackPageView />
          <ServiceWorkerRegistration />
        </LocaleProvider>
      </body>
    </html>
  );
}
