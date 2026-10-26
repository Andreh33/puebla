import * as React from "react";
import { beforeEach, expect, it, vi } from "vitest";
const { published, db, translated, correction, image } = vi.hoisted(() => ({
  published: vi.fn(() => false),
  db: vi.fn(),
  translated: vi.fn(),
  correction: vi.fn(),
  image: vi.fn(),
}));
vi.mock("@/lib/i18n/readiness", () => ({ isLocalePublished: published }));
vi.mock("@/lib/i18n/public-db", () => ({ publicDatabase: db }));
vi.mock("@/lib/i18n/dictionaries", () => ({
  translate: translated,
  translateValue: (x: unknown) => x,
}));
vi.mock("@/lib/db", () => ({ db: { product: { findFirst: db } } }));
import BlogImage from "@/app/[locale]/(public)/blog/[slug]/opengraph-image";
import { GET as blogGET } from "@/app/[locale]/(public)/blog/[slug]/share-image/route";
vi.mock("@/lib/i18n/source-corrections", () => ({ applyProductSourceCorrections: correction }));
vi.mock("@/lib/seo/product-og-image", () => ({ productOgPhoto: () => null }));
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: unknown) {
      image(element);
    }
  },
}));
import ProductImage from "@/lib/seo/product-og-card";
beforeEach(() => {
  vi.clearAllMocks();
  published.mockReturnValue(false);
});
it.each(["it", "xx"])(
  "returns 404 for %s before image data or UI translation access",
  async (locale) => {
    for (const response of [
      await BlogImage({ params: Promise.resolve({ locale, slug: "native-editorial" }) }),
      await blogGET(new Request("https://example.com"), {
        params: Promise.resolve({ locale, slug: "native-editorial" }),
      }),
      await ProductImage({ params: Promise.resolve({ locale, slug: "shoe" }) }),
    ])
      expect(response.status).toBe(404);
    expect(db).not.toHaveBeenCalled();
    expect(translated).not.toHaveBeenCalled();
  },
);

it("blocks foreign product OG even when the editorial locale is published", async () => {
  vi.stubGlobal("React", React);
  published.mockReturnValue(true);
  const product = {
    name: "Chaussure française",
    shortName: null,
    colorName: null,
    retailPrice: 20,
    salePrice: null,
    mainImageUrl: null,
  };
  db.mockReturnValue({ product: { findFirst: async () => product } });
  const result = await ProductImage({ params: Promise.resolve({ locale: "fr", slug: "shoe" }) });
  expect(result.status).toBe(404);
  expect(db).not.toHaveBeenCalled();
  expect(correction).not.toHaveBeenCalled();
  expect(image).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
