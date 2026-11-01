import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: { setting: { findUnique: async () => ({ value: false }) } } }));
import robots from "@/app/robots";
describe("ChatGPT search discovery", () => {
  it("allows search/user retrieval independently of the training preference", async () => {
    const result = await robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const search = rules.find(
      (rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("OAI-SearchBot"),
    );
    const training = rules.find(
      (rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("GPTBot"),
    );
    expect(search?.allow).toBe("/");
    expect(search?.disallow).toEqual(
      expect.arrayContaining(["/admin", "/api", "/fr/buscar", "/*?preview="]),
    );
    expect(training?.disallow).toBe("/");
  });
});
