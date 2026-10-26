import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { Locale } from "./config";
import { translationSnapshot } from "./content";
import { hasCompleteUi } from "./dictionaries";
export type SourceManifestEntry = {
  id?: string;
  slug: string;
  sourceHash: string;
  requiredFields: string[];
  tagCount: number;
  imageAltUrls?: string[];
};
export type SourceManifest = {
  version: number;
  exportedAt: string;
  products: SourceManifestEntry[];
  posts: SourceManifestEntry[];
};
let manifest: SourceManifest | undefined;
export function sourceManifest(): SourceManifest | null {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "data", "translations", "source-manifest.json"),
        "utf8",
      ),
    ) as SourceManifest;
    return manifest;
  } catch {
    return null;
  }
}
export function manifestTranslationReady(source: SourceManifestEntry, record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  const r = record as {
    id?: string;
    slug?: string;
    sourceHash?: string;
    status?: string;
    fields?: Record<string, unknown>;
  };
  if (
    r.slug !== source.slug ||
    r.sourceHash !== source.sourceHash ||
    r.status !== "published" ||
    (r.id && source.id && r.id !== source.id) ||
    !r.fields
  )
    return false;
  if (
    !source.requiredFields.every(
      (key) => typeof r.fields![key] === "string" && String(r.fields![key]).trim(),
    )
  )
    return false;
  if (!Array.isArray(r.fields.tags) || r.fields.tags.length !== source.tagCount) return false;
  const alts = r.fields.imageAlts as Record<string, string> | undefined;
  return !source.imageAltUrls?.some(
    (url) => !alts || typeof alts[url] !== "string" || !alts[url]?.trim(),
  );
}
const readiness = new Map<Locale, boolean>();
export function isLocalePublished(locale: Locale): boolean {
  if (locale === "es") return true;
  if (readiness.has(locale)) return readiness.get(locale)!;
  const source = sourceManifest();
  const ready =
    !!source &&
    hasCompleteUi(locale) &&
    source.products.length === 1521 &&
    source.posts.length === 54 &&
    (["products", "posts"] as const).every((kind) => {
      const snapshot = translationSnapshot(kind, locale);
      return source[kind].every((entry) => manifestTranslationReady(entry, snapshot[entry.slug]));
    });
  readiness.set(locale, ready);
  return ready;
}
