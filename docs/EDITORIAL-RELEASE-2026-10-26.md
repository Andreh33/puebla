# International editorial release, 26 October 2026

Historical release record. The current pause boundary and store-page publication policy are documented in [NATIVE-COMMERCE-2026-10-26.md](NATIVE-COMMERCE-2026-10-26.md).

The user's latest instruction pauses product descriptions, corrections and translations. The release enables Portuguese `/pt`, Italian `/it`, French `/fr` and German `/de` for the storefront interface, information pages, blog, cart and checkout. Shopping links continue to the existing Spanish catalog; direct foreign shopping routes return a permanent redirect preserving the query. Switching language from a shopping page opens that language's home page.

`PRODUCT_TRANSLATIONS_ENABLED = false` is an explicit publication decision. It prevents partial product records from appearing publicly. Spanish product overlays come exclusively from `product-source-corrections.published.json`, copied byte for byte from the previously published deployment: SHA256 `cece203fe185a2a6768eb0de9fcda8a1a3b8eaf0048f5840f72b6dd1e5456b4e`. Later authoring files remain saved and inactive. No production database product updates are part of this release.

Each foreign language has 54 translated existing blog articles and ten native guides, comprising five city guides and five buying guides. Together with the ten Spanish guides, the fifty new guides each exceed 3,400 words. Native editorial authors, terminology and links were reviewed separately for all four languages. The legacy launch article now describes the available checkout consistently in all five languages.

Readiness checks require complete interface dictionaries, current source hashes for all 54 legacy articles and ten valid native guides per language. Foreign product URLs are excluded from sitemaps, hreflang and publication eligibility during the pause. Cart and Checkout retain Spanish product labels, server prices and stock validation, free Spanish shipping and EUR 9.80 shipping to Portugal, France, Italy and Germany.

Verification before deployment: 102 Vitest files / 651 tests passed; TypeScript exited zero; native guide audit reported fifty articles and no issues. An independent reviewer found no confirmed new P1/P2 issue in the release changes. Build, deployed browser checks, redirects and sitemap submissions are recorded separately after they actually complete.

The home video, fonts, animations and existing styling are preserved. Existing Google reviews retain their attribution and translations. Search submissions do not guarantee indexing or ranking. The external old `.es` host still needs its owner to repair redirects that lose paths; the `.com` and former Vercel redirects are managed separately.

## Published release

Production alias `zonasportpuebla.com` was verified on deployment `dpl_6YPqbAbgszNi3zvq5duj1YdzvCPP`, built from isolated `stage-20261026T194640Z`, application commit `8a51bb0`. The prior production deployment `dpl_9w8to3CbvDBaVjgMbnqShoxZTGJw` remains the rollback reference. Functions stay in Frankfurt (`fra1`). No database migration ran.

Final verification: 103 Vitest files / 653 tests passed and TypeScript exited zero. The real staged and public deployments each passed 100 HTTP/content checks, including all forty new foreign guides, native interface routes, canonical URLs, indexability, share images and paused shopping redirects preserving their query. Seventeen additional checks passed for linked shopping routes, native tag pages and rejection of unsigned webhook/invalid empty checkout requests. Browser checks confirmed native language switching, Spanish product labels and shipping of EUR 0 for Spain / EUR 9.80 for France; the temporary cart item was removed without a payment or session. Six sampled Spanish product pages matched their pre-release text and images byte-derived hashes exactly; the complete frozen overlay retains its expected SHA256.

The main sitemap has 260 entries, products 1,521 and articles 320. Their union has 2,051 unique canonical URLs; fifty native articles also appear in the main sitemap. Google Search Console reports all three updated sitemaps Correcto, with those counts. Bing has processed the 320-article sitemap successfully. IndexNow accepted the union of 2,051 URLs with HTTP 200 after public key verification. These are discovery/submission confirmations, not evidence that every URL is already indexed.

Fresh Google PageSpeed Insights after publication: mobile performance 89, accessibility 93, best practices 100 and SEO 100; FCP 1.2 s, LCP 3.5 s, TBT 30 ms and CLS 0. This follows previous valid performance runs of 89–93 versus the user's initial 66. The latest report is https://pagespeed.web.dev/analysis/https-zonasportpuebla-com/2qvg2j8i1a?form_factor=mobile . Scores vary between runs.
