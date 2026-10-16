import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, photo, render } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  photo: vi.fn(),
  render: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: { product: { findFirst } } }));
vi.mock("@/lib/seo/product-og-image", () => ({ productOgPhoto: photo }));
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(element: unknown, options: unknown) {
      render(element, options);
    }
  },
}));

import OG from "@/lib/seo/product-og-card";
import {
  GET,
  runtime,
  revalidate,
} from "@/app/(public)/producto/[slug]/share-image/route";

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
  photo.mockResolvedValue("data:image/png;base64,PHOTO");
});
afterEach(() => vi.unstubAllGlobals());

describe("product Open Graph endpoint", () => {
  it("exposes the card through a stable GET route handler", async () => {
    findFirst.mockResolvedValue(null);
    const response = await GET(
      new Request("https://zonasport.vercel.app/producto/hidden-product/share-image"),
      { params: Promise.resolve({ slug: "hidden-product" }) },
    );
    expect(runtime).toBe("nodejs");
    expect(revalidate).toBe(300);
    expect(response.status).toBe(404);
    expect(findFirst.mock.calls[0]![0].where.slug).toBe("hidden-product");
  });

  it("only looks up active products and returns 404 without rendering hidden/missing products", async () => {
    findFirst.mockResolvedValue(null);
    const response = await OG({ params: Promise.resolve({ slug: "hidden-product" }) });
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(404);
    expect(findFirst.mock.calls[0]![0].where).toEqual({ slug: "hidden-product", status: "ACTIVE" });
    expect(photo).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("renders the normalized photo with cleaned product text at the public card dimensions", async () => {
    findFirst.mockResolvedValue({
      name: "<b>Running &amp; Sport</b>",
      shortName: "<span> </span>",
      colorName: "<b>Rojo</b>",
      brand: { name: "Go&amp;win" },
      retailPrice: 60,
      salePrice: null,
      mainImageUrl: "https://images.example/photo.webp",
    });
    await OG({ params: Promise.resolve({ slug: "running" }) });
    expect(photo).toHaveBeenCalledWith("https://images.example/photo.webp");
    const [element, options] = render.mock.calls[0]!;
    const tree = JSON.stringify(element);
    expect(tree).toContain("Running & Sport");
    expect(tree).toContain("Go&win");
    expect(tree).toContain("data:image/png;base64,PHOTO");
    expect(tree).not.toContain("<b>");
    expect(tree).not.toContain(".webp");
    expect(options).toEqual({ width: 1200, height: 630 });
  });

  it("still renders an active product when its source photo is unavailable", async () => {
    findFirst.mockResolvedValue({
      name: "Camiseta",
      shortName: null,
      colorName: "Único",
      brand: null,
      retailPrice: 20,
      salePrice: null,
      mainImageUrl: null,
    });
    photo.mockResolvedValue(null);
    await OG({ params: Promise.resolve({ slug: "camiseta" }) });
    const tree = JSON.stringify(render.mock.calls[0]![0]);
    expect(tree).toContain("Camiseta");
    expect(tree).not.toContain('"type":"img"');
  });

  it("uses the first ordered gallery photo when the main photo is missing", async () => {
    findFirst.mockResolvedValue({
      name: "Camiseta",
      shortName: null,
      colorName: null,
      brand: null,
      retailPrice: 20,
      salePrice: null,
      mainImageUrl: null,
      images: [{ url: "https://store.public.blob.vercel-storage.com/gallery.webp" }],
    });
    await OG({ params: Promise.resolve({ slug: "camiseta" }) });
    expect(findFirst.mock.calls[0]![0].select.images).toEqual({
      orderBy: { position: "asc" },
      take: 1,
      select: { url: true },
    });
    expect(photo).toHaveBeenCalledWith("https://store.public.blob.vercel-storage.com/gallery.webp");
    expect(JSON.stringify(render.mock.calls[0]![0])).toContain("data:image/png;base64,PHOTO");
  });
});
