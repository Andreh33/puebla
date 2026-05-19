import type { Metadata } from "next";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Zona Sport";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_DESCRIPTION_DEFAULT =
  "Tienda de deportes en Puebla de la Calzada (Badajoz). Running, pádel, montaña, fitness, calzado y complementos. Visítanos o consulta por WhatsApp.";

const SITE_BASE = `${SITE_NAME} — Puebla de la Calzada`;

type BuildArgs = {
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
  description = SITE_DESCRIPTION_DEFAULT,
  path = "/",
  ogImage,
  noIndex = false,
  ogType = "website",
  publishedTime,
  modifiedTime,
  tags,
}: BuildArgs): Metadata {
  const url = `${SITE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const fullTitle =
    title.toLowerCase().includes(SITE_NAME.toLowerCase()) ? title : `${title} | ${SITE_BASE}`;
  const imageUrl = ogImage || `${SITE_URL}/og-default.png`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_BASE,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
      locale: "es_ES",
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
