// @vitest-environment happy-dom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@vercel/analytics/next", () => ({
  Analytics: () => React.createElement("div", { "data-testid": "analytics" }),
}));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));
import { CookieReopenButton } from "@/components/public/CookieReopenButton";
import { AnalyticsGate } from "@/components/public/AnalyticsGate";
import { setConsent, getConsent } from "@/lib/cookies/consent";
afterEach(() => {
  cleanup();
  document.cookie = "zs_consent=; Max-Age=0; Path=/";
  vi.unstubAllGlobals();
});
it("withdraws previous optional consent inline and stops analytics without a popup", async () => {
  vi.stubGlobal("React", React);
  setConsent({ analytics: true, marketing: true });
  render(
    <>
      <CookieReopenButton />
      <AnalyticsGate />
    </>,
  );
  await waitFor(() => expect(screen.queryByTestId("analytics")).not.toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Desactivar cookies opcionales" }));
  await waitFor(() => expect(screen.queryByTestId("analytics")).toBeNull());
  expect(getConsent()?.categories).toEqual({ necessary: true, analytics: false, marketing: false });
  expect(screen.getByRole("status").textContent).toContain("Cookies opcionales desactivadas");
  expect(screen.queryByRole("dialog")).toBeNull();
});
