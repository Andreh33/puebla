import { describe, expect, it } from "vitest";
import {
  aboutPageSchema,
  blogPostingSchema,
  brandSchema,
  breadcrumbSchema,
  categoryCollectionSchema,
  contactPageSchema,
  faqPageSchema,
  jsonLd,
  localBusinessSchema,
  localLandingSchema,
  organizationSchema,
  productListSchema,
  productSchema,
  siteNavigationElementSchema,
  websiteSchema,
} from "@/lib/seo/schema-org";

function hasJsonLdHeader(schema: unknown): schema is { "@context": string; "@type": string | string[] } {
  return (
    typeof schema === "object" &&
    schema !== null &&
    "@context" in schema &&
    "@type" in schema
  );
}

describe("schema.org builders", () => {
  it("localBusinessSchema incluye dirección y geo", () => {
    const s = localBusinessSchema();
    expect(hasJsonLdHeader(s)).toBe(true);
    expect(s.address.streetAddress).toBeTruthy();
    expect(s.geo.latitude).toBeGreaterThan(0);
    expect(s.openingHoursSpecification.length).toBeGreaterThan(0);
  });

  it("organizationSchema incluye contactPoint", () => {
    const s = organizationSchema();
    expect(s["@type"]).toBe("Organization");
    expect(Array.isArray(s.contactPoint)).toBe(true);
    expect(s.contactPoint[0]!.telephone).toMatch(/\+\d/);
  });

  it("websiteSchema incluye SearchAction", () => {
    const s = websiteSchema();
    expect(s["@type"]).toBe("WebSite");
    expect(s.potentialAction["@type"]).toBe("SearchAction");
  });

  it("breadcrumbSchema enumera posiciones 1..n", () => {
    const s = breadcrumbSchema([
      { name: "Inicio", path: "/" },
      { name: "Blog", path: "/blog" },
    ]);
    expect(s.itemListElement).toHaveLength(2);
    expect(s.itemListElement[0]!.position).toBe(1);
    expect(s.itemListElement[1]!.position).toBe(2);
  });

  it("productSchema serializa precio con 2 decimales", () => {
    const s = productSchema({
      name: "Zapatilla X",
      images: ["https://x/img.jpg"],
      sku: "SKU-1",
      brandName: "Adidas",
      price: 99.9,
      inStock: true,
      slug: "zapatilla-x",
    });
    expect(s.offers.price).toBe("99.90");
    expect(s.offers.priceCurrency).toBe("EUR");
    expect(s.offers.availability).toContain("InStock");
  });

  it("productListSchema usa numberOfItems coherente", () => {
    const items = [
      { name: "A", slug: "a" },
      { name: "B", slug: "b" },
    ];
    const s = productListSchema(items);
    expect(s.numberOfItems).toBe(2);
    expect(s.itemListElement[1]!.position).toBe(2);
  });

  it("blogPostingSchema convierte fechas a ISO", () => {
    const s = blogPostingSchema({
      title: "Hola",
      slug: "hola",
      publishedAt: new Date("2025-01-15"),
      author: "Equipo",
    });
    expect(s.datePublished).toBe("2025-01-15T00:00:00.000Z");
  });

  it("faqPageSchema mapea cada Q/A", () => {
    const s = faqPageSchema([{ q: "¿Hola?", a: "Sí" }]);
    expect(s.mainEntity[0]!.acceptedAnswer.text).toBe("Sí");
  });

  it("brandSchema construye URL absoluta", () => {
    const s = brandSchema({ name: "Adidas", slug: "adidas" });
    expect(s.url).toMatch(/\/marca\/adidas$/);
  });

  it("categoryCollectionSchema produce CollectionPage", () => {
    const s = categoryCollectionSchema({ name: "Running", slug: "running" });
    expect(s["@type"]).toBe("CollectionPage");
  });

  it("localLandingSchema vincula al store padre", () => {
    const s = localLandingSchema("Mérida");
    expect(s.parentOrganization["@id"]).toMatch(/#organization$/);
  });

  it("aboutPageSchema y contactPageSchema son válidos", () => {
    const a = aboutPageSchema({ title: "Sobre", description: "x" });
    const c = contactPageSchema({ title: "Contacto", description: "x" });
    expect(a["@type"]).toBe("AboutPage");
    expect(c["@type"]).toBe("ContactPage");
  });

  it("siteNavigationElementSchema produce nombres y URLs paralelos", () => {
    const s = siteNavigationElementSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
    ]);
    expect(s.name).toHaveLength(2);
    expect(s.url).toHaveLength(2);
  });

  it("jsonLd escapa caracteres peligrosos", () => {
    const out = jsonLd({ "@type": "X", evil: "</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
  });
});
