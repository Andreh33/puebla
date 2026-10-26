import { isLocalePublished } from "@/lib/i18n/readiness";
import type { Metadata } from "next";
import { LOCALES, LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/routing";
import { getRequestLocale } from "@/lib/i18n/request";
import { getDictionary, hasCompleteUi } from "@/lib/i18n/dictionaries";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Zona Sport";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_DESCRIPTION_DEFAULT =
  "Tienda de deportes en Puebla de la Calzada (Badajoz). Running, pádel, montaña, fitness, calzado y complementos. Visítanos o consulta por WhatsApp.";

const SITE_BASE = `${SITE_NAME} — Puebla de la Calzada`;

export type BuildArgs = {
  locale?: Locale;
  availableLocales?: readonly Locale[];
  title: string;
  description?: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
  ogType?: "website" | "article" | "product";
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
};

export function buildMetadata({
  title,
  locale = getRequestLocale(),
  availableLocales = LOCALES,
  description = SITE_DESCRIPTION_DEFAULT,
  path = "/",
  ogImage,
  noIndex = false,
  ogType = "website",
  publishedTime,
  modifiedTime,
  tags,
}: BuildArgs): Metadata {
  const baseUrl = SITE_URL.replace(/\/$/, "");
  const url = `${baseUrl}${localePath(locale, path.startsWith("/") ? path : `/${path}`)}`;
  const publishedLocales = availableLocales.filter((item) => isLocalePublished(item));
  const languages = Object.fromEntries(
    publishedLocales.map((item) => [
      LOCALE_INFO[item].language,
      `${baseUrl}${localePath(item, path)}`,
    ]),
  );
  if (publishedLocales.includes("es"))
    languages["x-default"] = `${baseUrl}${localePath("es", path)}`;
  noIndex ||= !isLocalePublished(locale);
  const dictionary = getDictionary(locale);
  title = dictionary[title] ?? title;
  description = dictionary[description] ?? description;
  const fullTitle = title.toLowerCase().includes(SITE_NAME.toLowerCase())
    ? title
    : `${title} | ${SITE_BASE}`;
  const imageUrl = ogImage || `${SITE_URL}/og-default.png`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url, ...(Object.keys(languages).length ? { languages } : {}) },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_BASE,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      locale: LOCALE_INFO[locale].og,
      alternateLocale: publishedLocales
        .filter((item) => item !== locale)
        .map((item) => LOCALE_INFO[item].og),
      type: ogType === "product" ? "website" : ogType,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(tags ? { tags } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export const SITE = {
  name: SITE_NAME,
  url: SITE_URL,
  base: SITE_BASE,
  description: SITE_DESCRIPTION_DEFAULT,
} as const;
