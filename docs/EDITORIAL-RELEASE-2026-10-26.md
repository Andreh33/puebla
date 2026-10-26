# International editorial release, 26 October 2026

The user's latest instruction pauses product descriptions, corrections and translations. The release enables Portuguese `/pt`, Italian `/it`, French `/fr` and German `/de` for the storefront interface, information pages, blog, cart and checkout. Shopping links continue to the existing Spanish catalog; direct foreign shopping routes return a permanent redirect preserving the query. Switching language from a shopping page opens that language's home page.

`PRODUCT_TRANSLATIONS_ENABLED = false` is an explicit publication decision. It prevents partial product records from appearing publicly. Spanish product overlays come exclusively from `product-source-corrections.published.json`, copied byte for byte from the previously published deployment: SHA256 `cece203fe185a2a6768eb0de9fcda8a1a3b8eaf0048f5840f72b6dd1e5456b4e`. Later authoring files remain saved and inactive. No production database product updates are part of this release.

Each foreign language has 54 translated existing blog articles and ten native guides, comprising five city guides and five buying guides. Together with the ten Spanish guides, the fifty new guides each exceed 3,400 words. Native editorial authors, terminology and links were reviewed separately for all four languages. The legacy launch article now describes the available checkout consistently in all five languages.

Readiness checks require complete interface dictionaries, current source hashes for all 54 legacy articles and ten valid native guides per language. Foreign product URLs are excluded from sitemaps, hreflang and publication eligibility during the pause. Cart and Checkout retain Spanish product labels, server prices and stock validation, free Spanish shipping and EUR 9.80 shipping to Portugal, France, Italy and Germany.

Verification before deployment: 102 Vitest files / 651 tests passed; TypeScript exited zero; native guide audit reported fifty articles and no issues. An independent reviewer found no confirmed new P1/P2 issue in the release changes. Build, deployed browser checks, redirects and sitemap submissions are recorded separately after they actually complete.

The home video, fonts, animations and existing styling are preserved. Existing Google reviews retain their attribution and translations. Search submissions do not guarantee indexing or ranking. The external old `.es` host still needs its owner to repair redirects that lose paths; the `.com` and former Vercel redirects are managed separately.
