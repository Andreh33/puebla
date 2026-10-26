import { translate } from "./dictionaries";
import "server-only";
import { PRODUCT_TRANSLATIONS_ENABLED } from "./publication-policy";
import { db } from "@/lib/db";
import { getRequestLocale } from "./request";
import { normalizeLocale, type Locale } from "./config";
import {
  availableContentLocales,
  editorialPost,
  loadEditorialPosts,
  localizeContent,
} from "./content";
import {
  PRODUCT_TEXT_FIELDS,
  POST_TEXT_FIELDS,
  type SourceText,
  type ContentKind,
} from "./content-contract";

function localizeEntity<T extends Record<string, unknown>>(
  locale: Locale,
  entity: T,
  translateName: boolean,
): T {
  if (locale === "es") return entity;
  const result = { ...entity };
  for (const field of [
    ...(translateName ? ["name"] : []),
    "description",
    "metaTitle",
    "metaDescription",
  ])
    if (typeof result[field] === "string" && (result[field] as string).trim())
      (result as Record<string, unknown>)[field] = translate(locale, result[field] as string);
  if (result.parent && typeof result.parent === "object")
    (result as Record<string, unknown>).parent = localizeEntity(
      locale,
      result.parent as Record<string, unknown>,
      true,
    );
  return result;
}
const contentLocales = new WeakMap<object, Locale[]>();
export function localesForContent(record: object): Locale[] {
  return contentLocales.get(record) ?? ["es"];
}
export function editorialAsPost(post: ReturnType<typeof loadEditorialPosts>[number]) {
  const date = new Date(post.publishedAt);
  return {
    ...post,
    id: `editorial:${post.locale}:${post.slug}`,
    status: "PUBLISHED" as const,
    ogImageUrl: null,
    createdAt: date,
    updatedAt: date,
    publishedAt: date,
  };
}
/** Read-only public view. Never import this proxy in admin mutations or checkout. */
export function publicDatabase(locale: Locale = getRequestLocale()): typeof db {
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property === "brand" || property === "category") {
        const model = Reflect.get(target, property, receiver);
        return new Proxy(model, {
          get(modelTarget, method) {
            const original = Reflect.get(modelTarget, method);
            if (!["findUnique", "findFirst", "findMany"].includes(String(method)))
              return typeof original === "function" ? original.bind(modelTarget) : original;
            return async (query: Record<string, unknown> = {}) => {
              const result = await original.call(modelTarget, query);
              return Array.isArray(result)
                ? result.map((entry) => localizeEntity(locale, entry, property === "category"))
                : result
                  ? localizeEntity(locale, result, property === "category")
                  : result;
            };
          },
        });
      }
      if (property !== "product" && property !== "blogPost")
        return Reflect.get(target, property, receiver);
      const kind: ContentKind = property === "product" ? "products" : "posts";
      const model = Reflect.get(target, property, receiver);
      return new Proxy(model, {
        get(modelTarget, method) {
          const original = Reflect.get(modelTarget, method);
          if (!["findUnique", "findFirst", "findMany"].includes(String(method)))
            return typeof original === "function" ? original.bind(modelTarget) : original;
          return async (query: Record<string, any> = {}) => {
            // Spanish source data stays untouched, except editorial originals.
            const sourceQuery = { ...query };
            {
              const fields = kind === "products" ? PRODUCT_TEXT_FIELDS : POST_TEXT_FIELDS;
              const textSelect: Record<string, unknown> = { id: true, slug: true, tags: true };
              for (const field of fields) textSelect[field] = true;
              if (kind === "products")
                textSelect.images = {
                  orderBy: { position: "asc" },
                  select: { url: true, alt: true },
                };
              if (query.select) sourceQuery.select = { ...query.select, ...textSelect };
              else if (kind === "products")
                sourceQuery.include = { ...query.include, images: query.include?.images ?? true };
            }
            if (
              kind === "posts" &&
              (method === "findUnique" || method === "findFirst") &&
              typeof query.where?.slug === "string"
            ) {
              const entry = editorialPost(locale, query.where.slug);
              if (entry) {
                const post = editorialAsPost(entry);
                contentLocales.set(post, [locale]);
                return post;
              }
            }
            let result = await original.call(modelTarget, sourceQuery);
            if (
              result == null &&
              kind === "posts" &&
              (method === "findUnique" || method === "findFirst") &&
              typeof query.where?.slug === "string"
            ) {
              const editorial = editorialPost(locale, query.where.slug);
              if (editorial) {
                const post = editorialAsPost(editorial);
                contentLocales.set(post, [locale]);
                return post;
              }
            }
            const localize = (source: SourceText) => {
              const productPaused = kind === "products" && !PRODUCT_TRANSLATIONS_ENABLED;
              const localized = localizeContent(kind, productPaused ? "es" : locale, source);
              if (!localized) return null;
              if (kind === "products" && locale !== "es" && PRODUCT_TRANSLATIONS_ENABLED) {
                if (localized.category)
                  (localized as Record<string, unknown>).category = localizeEntity(
                    locale,
                    localized.category as Record<string, unknown>,
                    true,
                  );
                if (localized.brand)
                  (localized as Record<string, unknown>).brand = localizeEntity(
                    locale,
                    localized.brand as Record<string, unknown>,
                    false,
                  );
              }
              const projected = query.select
                ? Object.fromEntries(
                    Object.keys(query.select)
                      .filter((key) => query.select[key])
                      .map((key) => [key, localized[key]]),
                  )
                : localized;
              if (localized.translatedTags && (!query.select || query.select.tags))
                projected.translatedTags = localized.translatedTags;
              contentLocales.set(
                projected,
                productPaused ? ["es"] : availableContentLocales(kind, source),
              );
              return projected;
            };
            if (Array.isArray(result)) result = result.map(localize).filter(Boolean);
            else if (result) result = localize(result);
            return result;
          };
        },
      });
    },
  });
}
// Accessing a model captures the current render locale at call time, never module import time.
export const localizedPublicDb: typeof db = new Proxy(db, {
  get(_target, property) {
    return Reflect.get(publicDatabase(getRequestLocale()), property);
  },
});
export { normalizeLocale };
