import { isLocalePublished } from "@/lib/i18n/readiness";
import "server-only";
import type { MetadataRoute } from "next";
import { LOCALES, LOCALE_INFO, type Locale } from "./config";
import { localePath } from "./routing";
import { isLocaleRouteAvailable } from "./publication-policy";
import { availableContentLocales, loadEditorialPosts } from "./content";
import { hasCompleteUi } from "./dictionaries";
import type { ContentKind, SourceText } from "./content-contract";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
type Entry = MetadataRoute.Sitemap[number];
export const PRODUCT_TRANSLATION_SELECT = {
  id: true,
  slug: true,
  name: true,
  shortName: true,
  description: true,
  technicalDescription: true,
  colorName: true,
  sportUse: true,
  composition: true,
  metaTitle: true,
  metaDescription: true,
  tags: true,
  images: { select: { url: true, alt: true } },
  updatedAt: true,
} as const;
export const POST_TRANSLATION_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  contentMd: true,
  author: true,
  metaTitle: true,
  metaDescription: true,
  tags: true,
  updatedAt: true,
  publishedAt: true,
} as const;
function variants(path: string, locales: readonly Locale[], base: Omit<Entry, "url">): Entry[] {
  locales = locales.filter((locale) => isLocaleRouteAvailable(locale, path));
  const languages = Object.fromEntries(
    locales.map((locale) => [
      LOCALE_INFO[locale].language,
      `${SITE_URL}${localePath(locale, path)}`,
    ]),
  );
  if (locales.includes("es")) languages["x-default"] = `${SITE_URL}${localePath("es", path)}`;
  return locales.map((locale) => ({
    url: `${SITE_URL}${localePath(locale, path)}`,
    ...base,
    alternates: { languages },
  }));
}
export function staticLocaleEntries(entry: Entry): Entry[] {
  const url = new URL(String(entry.url));
  const { url: _url, ...base } = entry;
  return variants(url.pathname, LOCALES.filter(isLocalePublished), base);
}
export function contentLocaleEntries(
  kind: ContentKind,
  source: SourceText & { updatedAt?: Date; publishedAt?: Date | null },
): Entry[] {
  const path = `/${kind === "products" ? "producto" : "blog"}/${encodeURIComponent(source.slug)}`;
  return variants(path, availableContentLocales(kind, source).filter(isLocalePublished), {
    lastModified: source.updatedAt,
    changeFrequency: kind === "products" ? "weekly" : "monthly",
    priority: kind === "products" ? 0.6 : 0.5,
  });
}
export function editorialLocaleEntries(): Entry[] {
  return LOCALES.filter(isLocalePublished).flatMap((locale) =>
    loadEditorialPosts(locale).flatMap((post) =>
      variants(`/blog/${post.slug}`, [locale], {
        lastModified: new Date(post.publishedAt),
        changeFrequency: "monthly",
        priority: 0.6,
      }),
    ),
  );
}
function escapeXml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!,
  );
}
export function sitemapXml(entries: Entry[]): string {
  const urls = entries
    .map((entry) => {
      const languages = entry.alternates?.languages ?? {};
      const alternates = Object.entries(languages)
        .map(
          ([language, url]) =>
            `<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(String(url))}"/>`,
        )
        .join("");
      return `<url><loc>${escapeXml(String(entry.url))}</loc>${entry.lastModified ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>` : ""}${alternates}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}
