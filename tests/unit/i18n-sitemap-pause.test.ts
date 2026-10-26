import { expect, it, vi } from "vitest";
vi.mock("@/lib/i18n/readiness", () => ({ isLocalePublished: () => true }));
vi.mock("@/lib/i18n/content", () => ({
  availableContentLocales: () => ["es", "pt", "fr", "it", "de"],
  loadEditorialPosts: () => [],
}));
import { contentLocaleEntries, staticLocaleEntries } from "@/lib/i18n/sitemap";
it("keeps product and category sitemaps Spanish-only even if saved translations exist", () => {
  const products = contentLocaleEntries("products", { slug: "shoe" });
  expect(products).toHaveLength(1);
  expect(products[0]!.alternates?.languages).toHaveProperty("es-ES");
  expect(products[0]!.alternates?.languages).not.toHaveProperty("fr-FR");
  expect(staticLocaleEntries({ url: "https://zonasportpuebla.com/catalogo" })).toHaveLength(1);
});
it("retains all published editorial and home variants", () => {
  expect(staticLocaleEntries({ url: "https://zonasportpuebla.com/" })).toHaveLength(5);
  expect(contentLocaleEntries("posts", { slug: "guide" })).toHaveLength(5);
});
