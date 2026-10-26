vi.mock("@/lib/i18n/readiness", () => ({ isLocalePublished: () => true }));
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n/dictionaries", () => ({
  hasCompleteUi: () => true,
  getDictionary: () => ({}),
}));
import { buildMetadata } from "@/lib/seo/metadata";

describe("international metadata", () => {
  it("suppresses foreign shopping canonical, hreflang and OG variants while products are paused", () => {
    const meta = buildMetadata({
      title: "Chaussures",
      path: "/producto/modelo",
      locale: "fr",
      availableLocales: ["es", "fr", "de"],
    });
    expect(String(meta.alternates?.canonical)).toMatch(/\/producto\/modelo$/);
    expect(meta.alternates?.languages).toEqual(
      expect.objectContaining({
        "es-ES": expect.stringMatching(/\/producto\/modelo$/),
        "x-default": expect.stringMatching(/\/producto\/modelo$/),
      }),
    );
    expect(meta.alternates?.languages).not.toHaveProperty("pt-PT");
    expect(meta.alternates?.languages).not.toHaveProperty("fr-FR");
    expect(meta.alternates?.languages).not.toHaveProperty("de-DE");
    expect(meta.openGraph).toHaveProperty("locale", "es_ES");
  });
  it("keeps simultaneous explicitly scoped metadata independent", async () => {
    const [fr, de] = await Promise.all([
      Promise.resolve().then(() =>
        buildMetadata({
          title: "FR",
          path: "/blog/a",
          locale: "fr",
          availableLocales: ["es", "fr"],
        }),
      ),
      Promise.resolve().then(() =>
        buildMetadata({
          title: "DE",
          path: "/blog/a",
          locale: "de",
          availableLocales: ["es", "de"],
        }),
      ),
    ]);
    expect(String(fr.alternates?.canonical)).toMatch(/\/fr\/blog\/a$/);
    expect(String(de.alternates?.canonical)).toMatch(/\/de\/blog\/a$/);
  });
});
