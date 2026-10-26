import { describe, expect, it } from "vitest";
import { manifestTranslationReady } from "@/lib/i18n/readiness";
describe("whole-inventory publication gate", () => {
  const source = {
    id: "p1",
    slug: "shoe",
    sourceHash: "current",
    requiredFields: ["name", "description"],
    tagCount: 1,
    imageAltUrls: ["https://img.test/a"],
  };
  const record = {
    id: "p1",
    slug: "shoe",
    sourceHash: "current",
    status: "published",
    fields: {
      name: "Sapato",
      description: "Descrição completa",
      tags: ["desporto"],
      imageAlts: { "https://img.test/a": "Sapato azul" },
    },
  };
  it("admits complete current records", () =>
    expect(manifestTranslationReady(source, record)).toBe(true));
  it("rejects placeholders, stale hashes, wrong identities and missing alt translations", () => {
    expect(manifestTranslationReady(source, null)).toBe(false);
    expect(manifestTranslationReady(source, { ...record, sourceHash: "old" })).toBe(false);
    expect(manifestTranslationReady(source, { ...record, id: "other" })).toBe(false);
    expect(
      manifestTranslationReady(source, { ...record, fields: { ...record.fields, imageAlts: {} } }),
    ).toBe(false);
  });
});
