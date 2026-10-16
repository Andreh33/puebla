import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { createElement } from "react";
import { ImageResponse } from "next/og";
import { productOgPhoto } from "@/lib/seo/product-og-image";

afterEach(() => vi.unstubAllGlobals());

describe("productOgPhoto", () => {
  it("converts a real imported WebP to an embeddable PNG", async () => {
    const webp = await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: "red" },
    })
      .webp()
      .toBuffer();
    const fetchImage = vi.fn().mockResolvedValue(new Response(new Uint8Array(webp)));
    vi.stubGlobal("fetch", fetchImage);

    const result = await productOgPhoto(
      "https://store.public.blob.vercel-storage.com/product.webp",
    );
    expect(result).toMatch(/^data:image\/png;base64,/);
    const metadata = await sharp(Buffer.from(result!.split(",")[1]!, "base64")).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(796);
    expect(metadata.height).toBe(597);
    expect(fetchImage.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
    expect(fetchImage.mock.calls[0]![1].redirect).toBe("error");

    // Exercise the real Next/Satori renderer, not just the conversion helper.
    const card = new ImageResponse(
      createElement("img", {
        src: result!,
        width: 1200,
        height: 630,
        style: { objectFit: "contain" },
      }),
      { width: 1200, height: 630 },
    );
    expect(card.headers.get("content-type")).toBe("image/png");
    const cardMetadata = await sharp(Buffer.from(await card.arrayBuffer())).metadata();
    expect(cardMetadata.format).toBe("png");
    expect(cardMetadata.width).toBe(1200);
    expect(cardMetadata.height).toBe(630);
  });

  it("resolves relative catalog photos on the public canonical host", async () => {
    const fetchImage = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchImage);
    await productOgPhoto("/images/product.jpg");
    expect(fetchImage.mock.calls[0]![0].href).toBe(
      "https://zonasport.vercel.app/images/product.jpg",
    );
  });

  it("does not fetch missing photos or non-HTTP sources", async () => {
    const fetchImage = vi.fn();
    vi.stubGlobal("fetch", fetchImage);
    expect(await productOgPhoto(null)).toBeNull();
    expect(await productOgPhoto("data:image/webp;base64,AAAA")).toBeNull();
    expect(await productOgPhoto("file:///private/photo.png")).toBeNull();
    expect(await productOgPhoto("http://m.media-amazon.com/photo.jpg")).toBeNull();
    expect(await productOgPhoto("https://localhost/photo.jpg")).toBeNull();
    expect(await productOgPhoto("https://127.0.0.1/photo.jpg")).toBeNull();
    expect(await productOgPhoto("https://192.168.1.1/photo.jpg")).toBeNull();
    expect(await productOgPhoto("https://m.media-amazon.com.evil.example/photo.jpg")).toBeNull();
    expect(await productOgPhoto("https://user:pass@m.media-amazon.com/photo.jpg")).toBeNull();
    expect(fetchImage).not.toHaveBeenCalled();
  });

  it.each(["unavailable", "invalid", "timeout", "too-large", "stream-too-large"])(
    "falls back safely for an %s source",
    async (scenario) => {
      const response =
        scenario === "unavailable"
          ? new Response(null, { status: 404 })
          : scenario === "too-large"
            ? new Response("image", { headers: { "content-length": String(9 * 1024 * 1024) } })
            : scenario === "stream-too-large"
              ? new Response(new Uint8Array(8 * 1024 * 1024 + 1))
              : new Response("not an image");
      vi.stubGlobal(
        "fetch",
        scenario === "timeout"
          ? vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError"))
          : vi.fn().mockResolvedValue(response),
      );
      expect(await productOgPhoto("https://m.media-amazon.com/product.webp")).toBeNull();
    },
  );
});
