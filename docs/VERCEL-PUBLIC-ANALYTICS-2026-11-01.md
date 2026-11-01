# Public Vercel metrics — 1 November 2026

This change supersedes the Vercel consent gate described in
[the earlier consent report](ANALYTICS-CONSENT-2026-11-01.md), following the owner's
explicit request to collect Vercel visits without waiting for cookie permission.

## Runtime behavior

- Vercel Web Analytics and Speed Insights mount without reading or setting the
  consent cookie. Existing refusal and a missing choice do not block them.
- Their shared `beforeSend` filter removes query strings and URL fragments from
  measured page URLs and Speed Insights routes. URL credentials are removed too.
- The filter drops `/admin`, `/api`, `/auth`, and `/checkout` route trees,
  including ES/PT/IT/FR/DE prefixes and encoded path names. It matches route roots,
  so public product, category, brand and article slugs containing those words
  remain measurable. Checkout confirmation contains a Stripe session token and
  is deliberately excluded.
- The SDK instances remain mounted across navigation; filtering is per event.
  Keeping the Speed Insights instance preserves its route updater.
- The independent `TrackPageView` / `POST /api/track` counter still requires its
  existing explicit permission and checks the stored choice before sending.
  The inline cookie-page controls now identify that counter specifically.
- No popup is mounted. Marketing remains disabled by the inline controls, and no
  new tracker or custom event was added.

## Scope and measurement limits

The public cookies/privacy text and client controls were updated in Spanish,
Portuguese, Italian, French and German. They describe this configuration without
claiming a universal legal exemption. Provider privacy documents:

- [Vercel Web Analytics privacy](https://vercel.com/docs/analytics/privacy-policy)
- [Vercel Speed Insights privacy](https://vercel.com/docs/speed-insights/privacy-policy)

Removing query strings also removes campaign/query-level attribution from the
measured URL. Public page paths and locale prefixes remain intact. Browser
blocking, disabled JavaScript, network failures, provider filtering and sampling
can still reduce measurement; this does not promise collection of every visit
or recover previously omitted visits. Google Search Console remains independent.

## Isolation and validation

The worktree was based on `459c75d2bccdc5f596d3b9044f32f6bbde20a57d` at
`H:\Proyectos\worktrees\zonasport-vercel-analytics-20261101`. Its dependencies
were installed with `npm ci --no-audit --no-fund` into a real local
`node_modules` directory. Prisma Client generation was local; no migration or
database operation was performed.

The initial suite passed 665 tests in 105 files. Updated real-SDK integration
tests first failed for the missing automatic mounting, private-route filtering
and URL redaction. They disable external script downloads and intercept the
first-party beacon, so they do not generate production traffic.

Final verification:

- `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1 --reporter=dot`:
  684 tests passed in 105 files, including 26 real-SDK/consent integration cases.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- `git diff --check`: passed.
- All 2,297 UI corpus keys have translations in PT/IT/FR/DE. The regenerated
  client manifest contains 922 keys and matches the source corpus hash.
- The original H checkout retained its HEAD, porcelain status and the SHA-256
  hashes of all four tracked modified files. Paused product content was untouched.
- Independent Astra Ultra runtime review found no P1/P2 issues. It reran the 26
  integration cases and checked 11 additional in-memory URL/filter cases.

The suite still prints its expected simulated blob-network error and Vite CJS
deprecation warning. No browser/live-ingestion test or database-backed production
build was performed locally. Publication is coordinated separately; this
worktree does not push, merge or deploy.
