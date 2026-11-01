import { createHash } from "node:crypto";
import type { ForeignLocale } from "./config";
export type ContentKind = "products" | "posts";
export type SourceText = Record<string, unknown> & { slug: string; id?: string };
export const PRODUCT_TEXT_FIELDS = [
  "name",
  "shortName",
  "description",
  "technicalDescription",
  "colorName",
  "sportUse",
  "composition",
  "metaTitle",
  "metaDescription",
] as const;
export const POST_TEXT_FIELDS = [
  "title",
  "excerpt",
  "contentMd",
  "author",
  "metaTitle",
  "metaDescription",
] as const;
export type TranslationRecord = {
  id?: string;
  slug: string;
  sourceHash: string;
  status: "published";
  fields: Record<string, unknown>;
};
/** Hash exactly these source text fields. IDs, prices, stock, timestamps and URLs are not translated. */
export function sourceContentHash(kind: ContentKind, source: SourceText): string {
  const fields = kind === "products" ? PRODUCT_TEXT_FIELDS : POST_TEXT_FIELDS;
  const text: Record<string, unknown> = {};
  for (const field of fields) text[field] = source[field] ?? null;
  text.tags = source.tags ?? [];
  if (kind === "products")
    text.imageAlts = (
      Array.isArray(source.images)
        ? source.images
        : Array.isArray(source.imageAlts)
          ? source.imageAlts
          : []
    )
      .map((image: { url?: string; alt?: string }) => ({
        url: image.url ?? "",
        alt: image.alt ?? "",
      }))
      .sort((a, b) => a.url.localeCompare(b.url));
  return createHash("sha256").update(JSON.stringify(text), "utf8").digest("hex");
}
export function validTranslation(
  kind: ContentKind,
  _locale: ForeignLocale,
  source: SourceText,
  record: unknown,
): record is TranslationRecord {
  if (!record || typeof record !== "object") return false;
  const r = record as Partial<TranslationRecord>;
  if (
    r.status !== "published" ||
    r.slug !== source.slug ||
    (r.id && source.id && r.id !== source.id) ||
    r.sourceHash !== sourceContentHash(kind, source) ||
    !r.fields ||
    typeof r.fields !== "object"
  )
    return false;
  const fields = kind === "products" ? PRODUCT_TEXT_FIELDS : POST_TEXT_FIELDS;
  for (const key of fields) {
    const original = source[key];
    if (
      typeof original === "string" &&
      original.trim() &&
      (typeof r.fields[key] !== "string" || !(r.fields[key] as string).trim())
    )
      return false;
  }
  const tags = Array.isArray(source.tags) ? source.tags : [];
  if (
    !Array.isArray(r.fields.tags) ||
    r.fields.tags.length !== tags.length ||
    !r.fields.tags.every((tag) => typeof tag === "string")
  )
    return false;
  if (kind === "products") {
    const alts = r.fields.imageAlts as Record<string, string> | undefined;
    if (!alts || typeof alts !== "object") return false;
    for (const image of Array.isArray(source.images)
      ? source.images
      : Array.isArray(source.imageAlts)
        ? source.imageAlts
        : []) {
      if (image.alt && (typeof alts[image.url] !== "string" || !alts[image.url]?.trim()))
        return false;
    }
  }
  return true;
}
