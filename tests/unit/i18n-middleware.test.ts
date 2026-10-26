import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/redirects", () => ({
  lookupRedirect: async () => null,
  normalizePath: (path: string) => path,
}));
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
describe("public language middleware", () => {
  it.each([
    "/pt/producto/a",
    "/fr/producto/a/share-image",
  ])("redirects only paused product pages %s preserving the query", async (path) => {
    const response = await middleware(
      new NextRequest(`https://zonasportpuebla.com${path}?ref=a&sort=price`),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `https://zonasportpuebla.com${path.slice(3)}?ref=a&sort=price`,
    );
  });
  it("internally rewrites Spanish URLs and preserves their public URL/query", async () => {
    const response = await middleware(
      new NextRequest("https://zonasportpuebla.com/producto/modelo?ref=a"),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://zonasportpuebla.com/es/producto/modelo?ref=a",
    );
  });
  it("redirects visible /es aliases once and preserves queries", async () => {
    const response = await middleware(new NextRequest("https://zonasportpuebla.com/es/blog?a=1"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://zonasportpuebla.com/blog?a=1");
  });
  it("rewrites the Spanish share image route after its page moved under locale", async () => {
    const response = await middleware(
      new NextRequest("https://zonasportpuebla.com/blog/a/share-image"),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://zonasportpuebla.com/es/blog/a/share-image",
    );
  });
  it("leaves foreign URLs, API, assets and discovery endpoints outside rewrites", async () => {
    for (const path of [
      "/pt/carrito",
      "/fr/checkout/success",
      "/it/buscar",
      "/de/blog/a",
      "/it/catalogo?sort=price",
      "/fr/marca/nike",
      "/de/running/zapatillas",
      "/pt/hombre/calzado",
      "/fr/outlet/textil",
      "/it/marcas",
      "/api/search",
      "/robots.txt",
      "/sitemap-products.xml",
      "/videos/hero.mp4",
      "/logo.webp",
      "/manifest.webmanifest",
    ]) {
      const response = await middleware(new NextRequest(`https://zonasportpuebla.com${path}`));
      expect(response.headers.get("x-middleware-rewrite"), path).toBeNull();
    }
  });
});
