import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { isLocalePublished } from "@/lib/i18n/readiness";
it("publishes all four editorial locales using the real complete saved UI/posts/guides", () => {
  for (const locale of ["pt", "it", "fr", "de"] as const)
    expect(isLocalePublished(locale), locale).toBe(true);
});
it("preserves the exact Spanish product overlay copied from production", () => {
  const frozen = readFileSync(
    path.join(process.cwd(), "data/editorial/product-source-corrections.published.json"),
  );
  expect(createHash("sha256").update(frozen).digest("hex")).toBe(
    "cece203fe185a2a6768eb0de9fcda8a1a3b8eaf0048f5840f72b6dd1e5456b4e",
  );
});
