import { describe, expect, it } from "vitest";
import { localePath, routeLocale, shouldLocalizePath } from "@/lib/i18n/routing";
import { isLocale, LOCALES } from "@/lib/i18n/config";

describe("locale routing", () => {
  it("recognizes only the five supported languages", () => {
    expect(LOCALES).toEqual(["es", "pt", "it", "fr", "de"]);
    expect(isLocale("en")).toBe(false);
  });
  it("preserves stable product slugs, query strings and hashes", () => {
    expect(localePath("pt", "/producto/modelo?x=1#foto")).toBe("/pt/producto/modelo?x=1#foto");
    expect(localePath("fr", "/de/blog/articulo?a=2")).toBe("/fr/blog/articulo?a=2");
    expect(localePath("es", "/es/catalogo")).toBe("/catalogo");
    expect(localePath("de", "/de")).toBe("/de");
  });
  it("leaves external and operational URLs unchanged", () => {
    for (const path of [
      "/api/search?q=a",
      "/admin",
      "/_next/image",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
      "/blog/a/share-image",
      "/3d/a.glb",
      "https://example.com/a",
      "tel:+1",
      "#main",
    ]) {
      expect(shouldLocalizePath(path)).toBe(false);
      expect(localePath("it", path)).toBe(path);
    }
    expect(routeLocale("/fr/blog/a")).toBe("fr");
    expect(routeLocale("/fresa")).toBe("es");
  });
});
