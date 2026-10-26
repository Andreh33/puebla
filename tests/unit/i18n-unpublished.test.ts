import { describe, expect, it, vi } from "vitest";
const { dictionary } = vi.hoisted(() => ({
  dictionary: vi.fn(() => {
    throw new Error("Must not access untranslated UI");
  }),
}));
vi.mock("@/lib/i18n/readiness", () => ({ isLocalePublished: (locale: string) => locale === "es" }));
vi.mock("@/lib/i18n/dictionaries", () => ({ getDictionary: dictionary }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
import { withLocalePage, withLocaleMetadata } from "@/lib/i18n/page";
describe("unpublished locale entry guards", () => {
  it("stops a foreign page before invoking content or translation renderers", async () => {
    const render = vi.fn(() => null);
    const page = withLocalePage(render);
    await expect(page({ params: Promise.resolve({ locale: "it" }) })).rejects.toThrow("NOT_FOUND");
    expect(render).not.toHaveBeenCalled();
    expect(dictionary).not.toHaveBeenCalled();
  });
  it("returns noindex metadata before evaluating translated metadata or dictionaries", async () => {
    const build = vi.fn(() => ({ title: "Must not render" }));
    const generate = withLocaleMetadata(build);
    const metadata = await generate({ params: Promise.resolve({ locale: "fr" }) });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(build).not.toHaveBeenCalled();
    expect(dictionary).not.toHaveBeenCalled();
  });
});
