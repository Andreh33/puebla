# Versioned international content

Public routes use Spanish URLs without a visible prefix, plus `/pt`, `/it`, `/fr`, `/de`. Foreign locales remain unpublished (404/noindex, omitted from hreflang/sitemaps) until the whole verified source manifest and UI dictionary are complete. This is intentional: a partial translated catalog must not masquerade as the completed request.

## Files and ownership

- `{locale}/ui.json`: exact Spanish source string -> translated visible string. `evidence/ui-source.es.json` lists required keys and source contexts. Preserve `{0}`, `{1}` interpolation tokens, brand/model identities, technical identifiers and CSS strings. Extra obsolete keys are allowed.
- `{locale}/products.json` and `{locale}/posts.json`: slug-keyed records `{id?,slug,sourceHash,status:"published",fields:{...}}`.
- `source-manifest.json`: authoritative current source identities, hashes and required text fields. Initial verified scope is1521products and54existingarticles. It contains public identifiers/hashes, never commerce/customer secrets.
- `data/editorial/source-corrections.json`: reviewed Spanish blog overrides by slug. Only `POST_TEXT_FIELDS`/tags are applied; database rows stay unchanged.
- `data/editorial/product-source-corrections.json`: fact-checked Spanish product overrides by slug. Only `PRODUCT_TEXT_FIELDS`/tags are applied; prices, stock, SKU, URL, identifiers and statuses stay authoritative in Prisma.
- `data/editorial/international-2026-10-26/{locale}/{slug}.json`: original editorial records from the approved50-article brief, ten perlocale. Each must contain at least3400words, real HTTPSsourceURLs and a nonfuture publishedAt.

## Hash and translation contract

Import `sourceContentHash(kind,source)` and `validTranslation(kind,locale,source,record)` from `lib/i18n/content-contract.ts`; do not duplicate the algorithm. Hashes cover only ordered public text fields, tags and sorted product image alt records. Both Prisma `images:[{url,alt}]` and the production export's `imageAlts:[{url,alt}]` normalize identically. IDs, pricing, inventory and timestamps are excluded.

Every nonempty source text field needs a nonempty translation. `fields.tags` must have the source tag count. Products also require `fields.imageAlts` keyed by source image URL, with a translation for every nonempty source alt. Publication does not treat brand/model/SKU text as prose that must be changed.

Apply reviewed ES overlays BEFORE generating hashes or translations. Runtime ES views, translated views, metadata and sitemap availability do this through `applyPostSourceCorrections`/`applyProductSourceCorrections`. The offline authoritative reviewed export and source-manifest must be regenerated after an overlay changes. Otherwise the locale publication gate correctly remains closed.

Generate the manifest from the verified, reviewed production export, never the stale local database export:

```powershell
node_modules/.bin/tsx.cmd scripts/i18n-source-manifest.ts C:/absolute/path/public-content-reviewed.json
```

The initial guard deliberately requires1521products and54existingarticles. A future catalog inventory migration must update that release baseline deliberately. New original editorial records are separate from these existing54translations and do not borrow reciprocal hreflang from unrelated city guides.

## Publication and caching

`lib/i18n/readiness.ts:isLocalePublished(locale)` checks every source-manifest record plus every UI key. `lib/i18n/content.ts:localizeContent` additionally rejects a missing/stale individual translation against live public text. These snapshots are immutable deployment assets and read once perprocess. Restart the development server or redeploy after generating them; they are not a live translation database.

Locale, public layouts and page/metadata entries set their locale from route params. `React.cache` holds only render-scoped locale context; route handlers must call `publicDatabase(locale)` explicitly. No global `headers()`/`cookies()` call was added. Product/home ISR300s and blog ISR600s remain intact.

Only the current UI dictionary enters the client provider. Product/blog snapshots, source manifests, overlays and source corpora are server-only and traced into serverless output by next.config. ExistingSpanish/admin/API/assets retain their external URLs.

## Checkout

The server validates country ES/PT/FR/IT/DE and locale. PT/FR/IT/DE shipping is980EURcents, with Stripe address collection restricted to the selectedcountry. Pickup is zero. ES checkout keeps its existing zero shipping charge; the existing domestic written policy still needs the owner's clarification. No international delivery date is invented. The country selector displays the actual charge before payment. Checkout return URLs retain locale and reject external origins.

## Verification status

Use `node_modules/.bin/vitest.cmd run` and `node_modules/.bin/tsc.cmd --noEmit --incremental false`. A direct Nextbuild in this Hcheckout is blocked by the pre-existing cross-drive node_modules junction resolving Nextcliententries onF; a supported preserve-symlinks attempt also failed in the NextRSCloader. No npm installation, prisma generation, DBwrites, commits or deployment was performed for this implementation. A clean remote build plus HTTP/mobile/desktop audit is still required before publication.

Final integration note: after changing home/client source or UI corpus, run `node scripts/i18n-client-keys.cjs`. The generated `evidence/ui-client-keys.es.json` is traced with the full corpus. It currently limits client payload to876keys from2248total; metadata, legal and taxonomy prose remain server-only. A hash mismatch safely falls back to the full current UI dictionary until regeneration, preventing missing-key crashes.

The home directory now uses translation helpers recursively, with its headline translated as one natural sentence before word animation. The GoogleReviews component has its own native five-language copy and must not be processed through these dictionaries. Markdown internal/same-origin shopping URLs are locale-prefixed while external references, images, mailto/tel and anchors retain their targets.

Unpublished locales are guarded independently in root layout, public layout, page and metadata entrypoints because Next can render layouts/pages concurrently. `generateStaticParams` emits published locales only. The public language switcher offers published locales only. This prevents partial-dictionary Footer rendering from breaking prerender/404 behavior.
