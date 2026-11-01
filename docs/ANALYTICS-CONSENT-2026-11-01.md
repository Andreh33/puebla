# Inline analytics consent — 1 November 2026

Removing the cookie popup left new visitors without a way to enable optional analytics: the remaining control on the cookie policy page could only withdraw permission. That page now offers equally styled inline allow/disable buttons, an explanation of the measurement, and the current saved choice in ES/PT/IT/FR/DE. Analytics remains off until explicit opt-in; marketing stays off. No automatic popup is mounted.

The existing consent cookie persists the choice. Vercel Analytics, Speed Insights, and the page counter follow that choice. Both Vercel SDKs retain injected scripts after React unmounts, so their `beforeSend` callbacks read the current cookie and return `null` when permission is absent. Once first authorized, the SDK components stay mounted to preserve Speed Insights' route handle when permission is withdrawn and later granted again. The page counter also checks the current cookie before each send, covering expiry or a change made in another tab.

This is consented measurement, not total traffic. Visitors who do not opt in remain excluded, and previously omitted visits are not recovered. Search Console measures Google Search performance independently of these analytics controls; this change does not diagnose or repair an uninspected Search Console property.

Validation:

- Seven integration tests use the real SDK components and Next navigation contexts, with external script downloads disabled. They cover initial opt-out, explicit opt-in, cookie persistence, withdrawal, reactivation, later route attribution, missing stored permission, and all four translated client dictionaries.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1`: 665 tests passed in 105 files.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- The first default-concurrency suite run, alongside TypeScript, hit the existing five-second timeout in `blog-og-route.test.ts` for social metadata. The focused rerun and final complete suite with two workers passed without changing the test or timeout. The suite still prints its expected simulated blob-network error and Vite CJS deprecation warning.
- The UI corpus has 2,295 keys and the regenerated client manifest has 922 keys.
- Product translations remain paused. The frozen published overlay retains SHA256 `cece203fe185a2a6768eb0de9fcda8a1a3b8eaf0048f5840f72b6dd1e5456b4e`. Existing unpublished product authoring changes are excluded.

This commit has not been merged or deployed. Release verification and promotion are coordinated separately from a clean checkout; no package installation or Prisma generation was run through the working copy's shared `node_modules` junction. Browser verification remains unavailable because local browser use is disabled in Work settings.

References: [Web Analytics beforeSend](https://vercel.com/docs/analytics/package#beforesend), [Speed Insights beforeSend](https://vercel.com/docs/speed-insights/package#beforesend), [Search Console performance](https://support.google.com/webmasters/answer/7042828).
