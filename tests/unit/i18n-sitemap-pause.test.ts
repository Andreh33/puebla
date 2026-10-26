import { expect, it, vi } from "vitest";
vi.mock("@/lib/i18n/readiness", () => ({ isLocalePublished: () => true }));
vi.mock("@/lib/i18n/content", () => ({
  availableContentLocales: () => ["es", "pt", "fr", "it", "de"],
  loadEditorialPosts: () => [],
}));
import { contentLocaleEntries, staticLocaleEntries } from "@/lib/i18n/sitemap";
it("keeps product sitemaps Spanish-only even if saved translations exist", () => {
  const products = contentLocaleEntries("products", { slug: "shoe" });
  expect(products).toHaveLength(1);
  expect(products[0]!.alternates?.languages).toHaveProperty("es-ES");
  expect(products[0]!.alternates?.languages).not.toHaveProperty("fr-FR");
});
it("publishes category, catalog and brand sitemap variants with reciprocal languages", () => {
  for (const path of ["/catalogo", "/hombre/calzado", "/marca/joma", "/marcas", "/outlet/textil", "/accesorios-balones"]) {
    const entries = staticLocaleEntries({ url: `https://zonasportpuebla.com${path}` });
    expect(entries, path).toHaveLength(5);
    expect(entries.find((entry) => String(entry.url).includes(`/fr${path}`))?.alternates?.languages)
      .toHaveProperty("de-DE", expect.stringContaining(`/de${path}`));
  }
});
it("retains all published editorial and home variants", () => {
  expect(staticLocaleEntries({ url: "https://zonasportpuebla.com/" })).toHaveLength(5);
  expect(contentLocaleEntries("posts", { slug: "guide" })).toHaveLength(5);
});
