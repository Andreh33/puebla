import { describe, expect, it } from "vitest";
import { LoginSchema } from "@/lib/validators";

describe("admin login compatibility", () => {
  it("accepts the requested username with six characters and normalizes input", () => {
    const result = LoginSchema.parse({ email: " ADMIN3 ", password: "abc123" });
    expect(result.email).toBe("admin3");
    expect(result.password).toBe("abc123");
  });
  it("retains the eight-character minimum for existing email accounts", () => {
    expect(LoginSchema.safeParse({ email: "owner@example.com", password: "abc123" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "owner@example.com", password: "abc12345" }).success).toBe(true);
  });
  it("rejects arbitrary usernames and missing or short passwords", () => {
    expect(LoginSchema.safeParse({ email: "admin4", password: "abc12345" }).success).toBe(false);
    for (const password of ["", "12345"]) {
      expect(LoginSchema.safeParse({ email: "admin3", password }).success).toBe(false);
    }
  });
});
