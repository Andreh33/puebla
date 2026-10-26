import { describe, expect, it } from "vitest";
import {
  websiteSchema,
  categoryCollectionSchema,
  productSchema,
  blogPostingSchema,
} from "@/lib/seo/schema-org";
describe("localized structured data", () => {
  it("links locale website identities consistently and retains a single organization", () => {
    const site = websiteSchema("fr");
    const category = categoryCollectionSchema({ slug: "mujer", name: "Femme" }, "fr");
    expect(site["@id"]).toMatch(/\/fr#website$/);
    expect(category.isPartOf["@id"]).toBe(site["@id"]);
    expect(site.publisher["@id"]).not.toContain("/fr/");
    expect(site.inLanguage).toBe("fr-FR");
  });
  it("uses translated page URLs for offers and editorial schema", () => {
    const product = productSchema(
      {
        slug: "shoe",
        name: "Schuh",
        images: [],
        sku: "s",
        brandName: "Marca",
        price: 49.5,
        inStock: true,
      },
      "de",
    );
    expect(product.offers.url).toMatch(/\/de\/producto\/shoe$/);
    const post = blogPostingSchema(
      { slug: "guide", title: "Guida", author: "Zona Sport", publishedAt: "2026-01-01" },
      "it",
    );
    expect(post.mainEntityOfPage["@id"]).toMatch(/\/it\/blog\/guide$/);
    expect(post.inLanguage).toBe("it-IT");
  });
});
