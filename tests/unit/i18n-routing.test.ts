import { describe, expect, it } from "vitest";
import {
  languageSwitchPath,
  localePath,
  localizedContentHref,
  routeLocale,
  shouldLocalizePath,
} from "@/lib/i18n/routing";
import { isLocale, LOCALES } from "@/lib/i18n/config";

describe("locale routing", () => {
  it("recognizes only the five supported languages", () => {
    expect(LOCALES).toEqual(["es", "pt", "it", "fr", "de"]);
    expect(isLocale("en")).toBe(false);
  });
  it("preserves stable product slugs, query strings and hashes", () => {
    expect(localePath("pt", "/producto/modelo?x=1#foto")).toBe("/producto/modelo?x=1#foto");
    expect(localePath("fr", "/de/marca/nike?sort=price#top")).toBe("/marca/nike?sort=price#top");
    expect(localePath("it", "/fr/running/zapatillas?a=1#top")).toBe("/running/zapatillas?a=1#top");
    expect(localePath("fr", "/de/blog/articulo?a=2")).toBe("/fr/blog/articulo?a=2");
    expect(localePath("es", "/es/catalogo")).toBe("/catalogo");
    expect(localePath("de", "/de")).toBe("/de");
  });
  it("switches from Spanish shopping to the selected language home without redirect loops", () => {
    expect(languageSwitchPath("fr", "/producto/shoe")).toBe("/fr");
    expect(languageSwitchPath("de", "/catalogo")).toBe("/de");
    expect(languageSwitchPath("fr", "/blog/a")).toBe("/fr/blog/a");
    expect(localePath("pt", "/carrito")).toBe("/pt/carrito");
    expect(localePath("it", "/checkout/success?q=1")).toBe("/it/checkout/success?q=1");
  });
  it("canonicalizes same-site absolute shopping links and keeps native editorial links and query/hash", () => {
    expect(
      localizedContentHref("fr", "https://zonasportpuebla.com/de/producto/shoe?ref=a#photo"),
    ).toBe("https://zonasportpuebla.com/producto/shoe?ref=a#photo");
    expect(localizedContentHref("pt", "https://zonasport.vercel.app/catalogo?q=a#top")).toBe(
      "https://zonasportpuebla.com/catalogo?q=a#top",
    );
    expect(localizedContentHref("it", "https://www.zonasportpuebla.com/blog/a?q=1#top")).toBe(
      "https://zonasportpuebla.com/it/blog/a?q=1#top",
    );
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
