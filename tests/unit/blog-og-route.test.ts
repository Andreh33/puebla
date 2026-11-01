import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { findFirst, findUnique } = vi.hoisted(() => ({ findFirst: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { blogPost: { findFirst, findUnique } } }));
beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());
async function endpoint() {
  const route = await import("@/app/[locale]/(public)/blog/[slug]/share-image/route").catch(() => null);
  expect(route, "a stable blog share-image handler must exist").not.toBeNull();
  return route!;
}
describe("blog share image", () => {
  it("publishes the stable PNG endpoint in both social metadata formats", async () => {
    findUnique.mockResolvedValue({ title: "Prueba", status: "PUBLISHED", publishedAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), tags: [] });
    const { generateMetadata } = await import("@/app/[locale]/(public)/blog/[slug]/page");
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "prueba" }) });
    const social = JSON.stringify({ openGraph: metadata.openGraph, twitter: metadata.twitter });
    expect(social).toContain("/blog/prueba/share-image");
    expect(social).not.toContain("/opengraph-image");
  });
  it("returns an actual 1200 by 630 PNG for a published article", async () => {
    findFirst.mockResolvedValue({ title: "Prueba deportiva" });
    const response = await (
      await endpoint()
    ).GET(new Request("https://zonasportpuebla.com/blog/prueba/share-image"), {
      params: Promise.resolve({ slug: "prueba" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    const png = new Uint8Array(await response.arrayBuffer());
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const header = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect([header.getUint32(16), header.getUint32(20)]).toEqual([1200, 630]);
  });
  it("returns 404 instead of creating previews of unavailable articles", async () => {
    findFirst.mockResolvedValue(null);
    const response = await (
      await endpoint()
    ).GET(new Request("https://zonasportpuebla.com/blog/private/share-image"), {
      params: Promise.resolve({ slug: "private" }),
    });
    expect(response.status).toBe(404);
  });
});
