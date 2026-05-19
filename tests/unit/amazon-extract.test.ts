import { describe, it, expect } from "vitest";
import { extractAsin, buildAffiliateUrl } from "@/lib/amazon/utils";

describe("extractAsin", () => {
  it("acepta ASIN puro", () => {
    expect(extractAsin("B0CXYZ1234")).toBe("B0CXYZ1234");
    expect(extractAsin("b0cxyz1234")).toBe("B0CXYZ1234");
  });

  it("extrae de URL /dp/", () => {
    expect(
      extractAsin("https://www.amazon.es/dp/B0CXYZ1234/ref=foo"),
    ).toBe("B0CXYZ1234");
  });

  it("extrae de URL /gp/product/", () => {
    expect(
      extractAsin("https://amazon.es/gp/product/B0AABB2233/?tag=zs"),
    ).toBe("B0AABB2233");
  });

  it("extrae de ?ASIN=", () => {
    expect(extractAsin("https://x.amazon.com/anything?ASIN=B0CCDDEEFF")).toBe(
      "B0CCDDEEFF",
    );
  });

  it("devuelve null si no hay ASIN reconocible", () => {
    expect(extractAsin("https://amazon.es/")).toBeNull();
    expect(extractAsin("notanasin")).toBeNull();
  });
});

describe("buildAffiliateUrl", () => {
  it("incluye el tag de afiliado", () => {
    process.env.AMAZON_ASSOCIATE_TAG = "test-21";
    process.env.AMAZON_MARKETPLACE = "www.amazon.es";
    const url = buildAffiliateUrl("B0AAAAAA00");
    expect(url).toContain("/dp/B0AAAAAA00");
    expect(url).toContain("tag=test-21");
  });
});
