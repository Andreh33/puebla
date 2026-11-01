import { beforeEach, expect, it, vi } from "vitest";
const { state } = vi.hoisted(() => ({
  state: { ui: true, guides: 10, stale: false, products: false },
}));
vi.mock("@/lib/i18n/dictionaries", () => ({ hasCompleteUi: () => state.ui }));
vi.mock("@/lib/i18n/content", () => ({
  loadEditorialPosts: () => Array.from({ length: state.guides }),
  translationSnapshot: (kind: string) =>
    kind === "products" && !state.products
      ? {}
      : Object.fromEntries(
          Array.from({ length: kind === "posts" ? 54 : 1521 }, (_, i) => [
            `entry-${i}`,
            {
              slug: `entry-${i}`,
              sourceHash: state.stale ? "stale" : "exact",
              status: "published",
              fields: { title: "Native", tags: [] },
            },
          ]),
        ),
}));
import { localePublicationReady, type SourceManifest } from "@/lib/i18n/readiness";
const entries = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    slug: `entry-${i}`,
    sourceHash: "exact",
    requiredFields: ["title"],
    tagCount: 0,
  }));
const source: SourceManifest = {
  version: 1,
  exportedAt: "2026-10-26",
  products: entries(1521),
  posts: entries(54),
};
beforeEach(() => Object.assign(state, { ui: true, guides: 10, stale: false, products: false }));
it("publishes complete UI, 54 exact translated posts and 10 native guides without a product quota", () => {
  expect(localePublicationReady("fr", source)).toBe(true);
  expect(localePublicationReady("fr", { ...source, products: [] })).toBe(true);
});
it("still requires complete UI, exact post hashes and all ten valid native guides", () => {
  state.ui = false;
  expect(localePublicationReady("fr", source)).toBe(false);
  state.ui = true;
  state.guides = 9;
  expect(localePublicationReady("fr", source)).toBe(false);
  state.guides = 10;
  state.stale = true;
  expect(localePublicationReady("fr", source)).toBe(false);
});
it("retains the strict whole-catalog gate for explicit resumption", () => {
  expect(localePublicationReady("fr", source, true)).toBe(false);
  state.products = true;
  expect(localePublicationReady("fr", source, true)).toBe(true);
  expect(
    localePublicationReady("fr", { ...source, products: source.products.slice(1) }, true),
  ).toBe(false);
  state.stale = true;
  expect(localePublicationReady("fr", source, true)).toBe(false);
});
