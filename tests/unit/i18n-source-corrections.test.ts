import { describe, expect, it, vi } from "vitest";
vi.mock("node:fs", () => ({
  default: {
    readFileSync: () =>
      JSON.stringify({
        article: {
          contentMd: "Texto corregido y comprobado",
          description: "Descripción ampliada y comprobada",
          title: "Título corregido",
          id: "malicious",
          slug: "other",
          status: "DRAFT",
          retailPrice: 1,
        },
      }),
  },
}));
import {
  applyPostSourceCorrections,
  applyProductSourceCorrections,
} from "@/lib/i18n/source-corrections";
import { sourceContentHash } from "@/lib/i18n/content-contract";
describe("versioned Spanish source corrections", () => {
  it("corrects authoritative public text before hashing without changing stored identity/status", () => {
    const source = {
      id: "post1",
      slug: "article",
      title: "Título anterior",
      contentMd: "Texto anterior",
      status: "PUBLISHED",
    };
    const fixed = applyPostSourceCorrections(source);
    expect(fixed).toEqual({
      ...source,
      title: "Título corregido",
      contentMd: "Texto corregido y comprobado",
    });
    expect(source.contentMd).toBe("Texto anterior");
    expect(sourceContentHash("posts", source)).not.toBe(sourceContentHash("posts", fixed));
  });
  it("supports fact-checked product descriptions without changing prices, stock or identity", () => {
    const source = {
      id: "p1",
      slug: "article",
      name: "Modelo",
      description: "Old",
      retailPrice: 49.5,
      stock: 2,
    };
    const fixed = applyProductSourceCorrections(source);
    expect(fixed.retailPrice).toBe(49.5);
    expect(fixed.stock).toBe(2);
    expect(fixed.id).toBe("p1");
    expect(fixed.name).toBe("Modelo");
    expect(fixed.description).toBe("Descripción ampliada y comprobada");
  });
  it("leaves articles without a reviewed correction unchanged", () => {
    const source = { slug: "unchanged", title: "Other" };
    expect(applyPostSourceCorrections(source)).toBe(source);
  });
});
