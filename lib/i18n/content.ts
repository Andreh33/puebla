import { applyProductSourceCorrections, applyPostSourceCorrections } from "./source-corrections";
import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { LOCALES, type Locale, type ForeignLocale } from "./config";
import {
  validTranslation,
  type ContentKind,
  type SourceText,
  type TranslationRecord,
  PRODUCT_TEXT_FIELDS,
  POST_TEXT_FIELDS,
} from "./content-contract";

const snapshots = new Map<string, Record<string, unknown>>();
function readSnapshot(file: string): Record<string, unknown> {
  if (snapshots.has(file)) return snapshots.get(file)!;
  let result: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      result = parsed as Record<string, unknown>;
  } catch {
    /* missing or malformed snapshots are unpublished */
  }
  snapshots.set(file, result);
  return result;
}
export function translationSnapshot(
  kind: ContentKind,
  locale: ForeignLocale,
): Record<string, unknown> {
  return readSnapshot(path.join(process.cwd(), "data", "translations", locale, `${kind}.json`));
}
export function resolveTranslation(
  kind: ContentKind,
  locale: Locale,
  source: SourceText,
): TranslationRecord | null {
  source =
    kind === "posts" ? applyPostSourceCorrections(source) : applyProductSourceCorrections(source);
  if (locale === "es") return null;
  const record = translationSnapshot(kind, locale)[source.slug];
  return validTranslation(kind, locale, source, record) ? record : null;
}
export function availableContentLocales(kind: ContentKind, source: SourceText): Locale[] {
  return LOCALES.filter((locale) => locale === "es" || resolveTranslation(kind, locale, source));
}
/** Only text can be overridden; snapshots cannot change stock, prices, SKU or URLs. */
export function localizeContent<T extends SourceText>(
  kind: ContentKind,
  locale: Locale,
  source: T,
): T | null {
  source =
    kind === "posts" ? applyPostSourceCorrections(source) : applyProductSourceCorrections(source);
  if (locale === "es") return source;
  const translation = resolveTranslation(kind, locale, source);
  if (!translation) return null;
  const localized = { ...source };
  const keys = kind === "products" ? PRODUCT_TEXT_FIELDS : POST_TEXT_FIELDS;
  for (const key of keys) {
    if (key in translation.fields)
      (localized as Record<string, unknown>)[key] = translation.fields[key];
  }
  // Tags remain stable internal filter identifiers; translated labels are separate.
  (localized as Record<string, unknown>).translatedTags = translation.fields.tags;
  if (kind === "products" && Array.isArray(source.images))
    (localized as Record<string, unknown>).images = source.images.map(
      (image: { url: string; alt: string }) => ({
        ...image,
        alt: (translation.fields.imageAlts as Record<string, string>)[image.url] ?? image.alt,
      }),
    );
  return localized;
}
export type EditorialPost = {
  slug: string;
  locale: Locale;
  title: string;
  excerpt: string;
  contentMd: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  author: string;
  publishedAt: string;
  coverImageUrl: string | null;
  sourceUrls: string[];
  city?: string;
  topic?: string;
};
export function validEditorialPost(
  value: unknown,
  locale: Locale,
  now = new Date(),
): value is EditorialPost {
  if (!value || typeof value !== "object") return false;
  const record = value as EditorialPost;
  if (record.locale !== locale || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) return false;
  if (
    [
      record.title,
      record.excerpt,
      record.contentMd,
      record.metaTitle,
      record.metaDescription,
      record.author,
    ].some((text) => typeof text !== "string" || !text.trim())
  )
    return false;
  if (
    !Array.isArray(record.tags) ||
    !record.tags.every((tag) => typeof tag === "string") ||
    !Array.isArray(record.sourceUrls) ||
    record.sourceUrls.length === 0 ||
    !record.sourceUrls.every((url) => typeof url === "string" && /^https:\/\//.test(url))
  )
    return false;
  const published = new Date(record.publishedAt);
  if (Number.isNaN(published.getTime()) || published > now) return false;
  if (record.contentMd.split(/\s+/u).filter(Boolean).length < 3400) return false;
  return true;
}
export function loadEditorialPosts(locale: Locale, now = new Date()): EditorialPost[] {
  const folder = path.join(process.cwd(), "data", "editorial", "international-2026-10-26", locale);
  let files: string[];
  try {
    files = readdirSync(folder);
  } catch {
    return [];
  }
  return files
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => {
      const record = readSnapshot(path.join(folder, file));
      return validEditorialPost(record, locale, now) ? [record] : [];
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export function editorialPost(locale: Locale, slug: string): EditorialPost | null {
  return loadEditorialPosts(locale).find((post) => post.slug === slug) ?? null;
}

export function displayTags(record: { tags?: unknown; translatedTags?: unknown }): string[] {
  const value = record.translatedTags ?? record.tags;
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
}

export function translatedSearchSlugs(kind: ContentKind, locale: Locale, query: string): string[] {
  if (locale === "es") return [];
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLocaleLowerCase();
  const needle = normalize(query);
  return Object.values(translationSnapshot(kind, locale))
    .filter(
      (record): record is TranslationRecord =>
        !!record &&
        typeof record === "object" &&
        (record as TranslationRecord).status === "published",
    )
    .filter((record) =>
      Object.values(record.fields).some(
        (field) => typeof field === "string" && normalize(field).includes(needle),
      ),
    )
    .map((record) => record.slug);
}
