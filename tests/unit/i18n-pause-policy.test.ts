import { describe, expect, it, vi } from "vitest";
import { sourceContentHash } from "@/lib/i18n/content-contract";
const { reads } = vi.hoisted(() => ({ reads: [] as string[] }));
vi.mock("node:fs", () => {
  const readFileSync = (file: string) => {
    reads.push(String(file));
    if (String(file).endsWith("product-source-corrections.published.json"))
      return JSON.stringify({
        shoe: { name: "Publicado", description: "Descripción publicada", retailPrice: 1, stock: 0 },
      });
    if (String(file).endsWith("product-source-corrections.json"))
      return JSON.stringify({ shoe: { name: "Trabajo pendiente" } });
    return JSON.stringify({
      shoe: { slug: "shoe", status: "published", fields: { name: "Traduction" } },
    });
  };
  return { default: { readFileSync }, readFileSync, readdirSync: () => [] };
});
import {
  availableContentLocales,
  localizeContent,
  resolveTranslation,
  translatedSearchSlugs,
} from "@/lib/i18n/content";
import { applyProductSourceCorrections } from "@/lib/i18n/source-corrections";
describe("paused product publication", () => {
  it("uses the frozen Spanish overlay in every locale without activating authoring work or changing commerce", () => {
    const source = {
      slug: "shoe",
      name: "Original",
      description: "Original",
      retailPrice: 49.5,
      stock: 3,
      id: "p1",
    };
    for (const locale of ["es", "pt", "fr", "it", "de"] as const)
      expect(localizeContent("products", locale, source)).toEqual({
        ...source,
        name: "Publicado",
        description: "Descripción publicada",
      });
    expect(reads.some((file) => file.endsWith("product-source-corrections.json"))).toBe(false);
    expect(source.name).toBe("Original");
    expect(sourceContentHash("products", source)).not.toBe(
      sourceContentHash("products", applyProductSourceCorrections(source)),
    );
  });
  it("never exposes saved product translations, alternate locales or their search text", () => {
    const source = { slug: "shoe", name: "Original" };
    expect(resolveTranslation("products", "fr", source)).toBeNull();
    expect(availableContentLocales("products", source)).toEqual(["es"]);
    expect(translatedSearchSlugs("products", "fr", "Traduction")).toEqual([]);
  });
});
