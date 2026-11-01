import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "inter" }),
  Manrope: () => ({ variable: "manrope" }),
}));
vi.mock("sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/public/CookieConsent", () => ({ CookieConsent: () => null }));
vi.mock("@/components/public/AnalyticsGate", () => ({ AnalyticsGate: () => null }));
vi.mock("@/components/public/TrackPageView", () => ({ TrackPageView: () => null }));
vi.mock("@/components/public/ServiceWorkerRegistration", () => ({
  ServiceWorkerRegistration: () => null,
}));
import RootLayout from "@/lib/i18n/root-document";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it("emits the organization referenced as the website publisher", () => {
  const tree = RootLayout({ children: null });
  const schemas: Array<Record<string, any>> = [];
  function visit(node: React.ReactNode): void {
    React.Children.forEach(node, (child) => {
      if (
        !React.isValidElement<{
          children?: React.ReactNode;
          type?: string;
          dangerouslySetInnerHTML?: { __html: string };
        }>(child)
      )
        return;
      if (child.type === "script" && child.props.type === "application/ld+json")
        schemas.push(JSON.parse(child.props.dangerouslySetInnerHTML!.__html));
      visit(child.props.children);
    });
  }
  visit(tree);
  const website = schemas.find((schema) => schema["@type"] === "WebSite")!;
  expect(website).toBeDefined();
  const publisher = schemas.find((schema) => schema["@id"] === website.publisher["@id"]);
  expect(publisher?.["@type"]).toBe("Organization");
  expect(publisher?.name).toBe("Zona Sport");
});
