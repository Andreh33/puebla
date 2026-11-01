# International storefront core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver cacheable locale routing, honest content availability, international SEO and validated international checkout without changing the visual design.

**Architecture:** One public route tree under `[locale]`, Spanish internally rewritten from unprefixed URLs. Server-only, versioned translation snapshots keep commerce data authoritative and admit only complete current translations; editorial records are independent original articles. Metadata and discovery share availability rules.

**Tech Stack:** Existing Next.js 15 App Router, TypeScript, React, Prisma read interfaces, Stripe and Vitest; no new dependencies.

**Spec:** docs/superpowers/specs/2026-10-26-international-seo-design.md, as amended by the user's final instruction: ten original articles per locale (five cities and five buying guides), 50 originals total, each at least 3400 words; existing 54 articles and all 1521 products translated into four languages.

## Global Constraints

- Spanish URLs unprefixed; pt-PT, it-IT, fr-FR and de-DE under /pt /it /fr /de.
- Preserve styling, image assets and ISR300s products/home and ISR600s blog; never translate during a public request.
- All 1521 published products and 54 existing articles require complete translations; incomplete coverage is an explicit release blocker.
- Shipping destinations ES/PT/FR/IT/DE; outside Spain exactly EUR9.80, timelines unspecified.
- No commits, deployments, database writes, npm installation or prisma generation through the shared node_modules junction.
- Preserve prior SEO repairs and original F worktree; parent/editorial/performance workers own their existing files.

## Review Focus

- Missing or stale content translations must never yield an indexable Spanish copy under a foreign URL.
- /es, locale-prefixed admin/API, resources and redirect query strings must not create duplicate content or loops.
- Forged country, shipping amount and external return URL must never alter server shipping charge or checkout destination policy.
- Source content edits must suppress stale translations and remove their hreflang and sitemap entries.
- Future editorial publication dates and unsafe Markdown links must not publish premature or unintended content.

### Task 1: Locale and content contracts
**Files:** lib/i18n/config.ts, routing.ts, dictionaries.ts, content.ts; tests/unit/i18n-routing.test.ts, i18n-content.test.ts.
**Interfaces:** Locale; localePath(locale,path); routeLocale(path); sourceContentHash(kind,source); resolveTranslation(kind,locale,source); loadEditorialPosts(locale).
- [ ] Add failing tests for idempotent prefixing, locale rejection, route exclusions, query preservation, missing/stale translations and future editorial dates.
- [ ] Run targeted Vitest and observe failure.
- [ ] Implement typed locale/path helpers and server-only disk content loader keyed by stable slug plus sourceHash. Include complete field validation and editorial minimum word checks.
- [ ] Run targeted tests and typecheck; expected pass.

### Task 2: Routing and document language
**Files:** middleware.ts; move public pages to app/[locale]/(public); app/[locale]/layout.tsx; app/(default)/layout.tsx and admin routes; shared document component; locale provider/link/switcher.
**Interfaces:** Route params carry locale and existing slug/category params. Shared RootDocument takes locale; server locale scope enables existing metadata builders without headers/cookies.
- [ ] Add failing middleware tests covering Spanish rewrite, /es redirect, foreign locale routes and untouched API/admin/assets.
- [ ] Implement route migration and params-based html language; maintain Spanish route behavior and preserved Organization emission.
- [ ] Update moved-file imports/tests; run routing and root graph tests then typecheck.

### Task 3: Localized views and SEO discovery
**Files:** public product/blog pages, public shell/components, lib/seo/metadata.ts, schema-org.ts, sitemap routes, robots.ts.
**Interfaces:** buildMetadata accepts locale and availableLocales; translated data merges text only into live records. Published editorial articles use existing blog presentation. Sitemaps consume same availability as pages.
- [ ] Add failing tests for canonical, reciprocal hreflang, x-default, OG locale, translated schema URLs, omitted untranslated pages, editorial sitemap entries.
- [ ] Add explicit locale props/loader use; server dictionaries and client provider keep links and shared UI in language; missing foreign content returns404.
- [ ] Preserve stock/pricing, add source hash validation, localize text snapshots and read editorial originals through blog index/detail.
- [ ] Run targeted SEO/content tests and typecheck.

### Task 4: Server shipping and localized checkout
**Files:** lib/stripe/shipping.ts, lib/stripe/types.ts, app/api/stripe/create-checkout/route.ts, components/public/CheckoutButton.tsx.
**Interfaces:** ShippingCountry = ES|PT|FR|IT|DE; shippingCents(country,method); checkout body locale+shippingCountry; locale-prefixed same-origin return paths.
- [ ] Add failing tests for980cents all foreign destinations, Spain preserved, pickup zero, unsupported country rejection and constrained Stripe country/return URLs.
- [ ] Implement server tariff plus displayed country selector/charge before payment; preserve current methods and stock/promo validation.
- [ ] Run checkout tests and full suite/typecheck; no real payment.

### Task 5: Verification and release accounting
**Files:** data/translations/README.md, plan progress appendix, tests.
- [ ] Run full Vitest, typecheck and build where runtime/environment permits.
- [ ] Count actual translation/editorial availability against required1521x4 products,54x4 existing blogs and50new articles; report exact gaps, never mark full task complete prematurely.
- [ ] Review diff for route loops, missing source fields, false store/shipping claims and cache deoptimization; give parent actionable findings.

## Execution ledger

Ruling: Existing approved design and explicit parent implementation instruction supply execution authorization; no extra handoff approval pause. Parent requested no commits, so task commit checkpoints are verification-only. Shared worker coordination replaces new subagent dispatches.

## Execution outcome (2026-10-26, core handoff)

- Tasks1/2/4: core code implemented; tests cover deterministic hashes, stale/missing records, params routing, excluded paths, selfcanonical/reciprocal availability, concurrent explicit locale reads, typed shipping and real endpoint construction against mocks.
- Task3: routing, public UI including home, text-only public data proxy, overlays, new editorial consumption, schema, discovery and bot policy implemented. Content production remains parent/author ownership; foreign publication stays blocked until the complete source manifest is translated.
- Task5: local typecheck and full unit suite verified. Local Nextbuild blocked by cross-drive runtime junction; clean remote compilation/lint/types passed but first prerender exposed concurrent-layout missing-dictionary access. Added independent public-layout guard and published-only static locale generation plus regression tests. A second clean remote build and browser/HTTP verification remain parent-owned release checks.
- Reviewed Spanish source corrections apply before ES rendering and foreign hash resolution. Product correction support was added for the user's new1502short-description expansion requirement; root owns those JSON assets and manifest regeneration.
- No commits, deployments, database writes, package installation or Prisma generation were performed by this worker.
- Release remains incomplete: all1521products x4languages, all54existingposts x4languages and50original3400-word articles are still required; scaffolding and partial records do not satisfy those deliverables.
