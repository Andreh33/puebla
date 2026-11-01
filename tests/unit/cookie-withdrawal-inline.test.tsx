// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"disableJavaScriptFileLoading":true,"handleDisabledFileLoadingAsSuccess":true}}
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  PathnameContext,
  PathParamsContext,
  SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";

import { CookieReopenButton } from "@/components/public/CookieReopenButton";
import { AnalyticsGate } from "@/components/public/AnalyticsGate";
import { TrackPageView } from "@/components/public/TrackPageView";
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { getClientDictionary } from "@/lib/i18n/dictionaries";
import { setConsent, getConsent } from "@/lib/cookies/consent";

const sendBeacon = vi.fn((_url: string, _body: Blob) => true);
const sdkScripts = () => document.head.querySelectorAll("script[data-sdkn]");
const preferenceControls = (pathname = "/politica-cookies") => (
  <PathnameContext.Provider value={pathname}>
    <PathParamsContext.Provider value={{}}>
      <SearchParamsContext.Provider value={new URLSearchParams()}>
        <CookieReopenButton />
        <AnalyticsGate />
        <TrackPageView />
      </SearchParamsContext.Provider>
    </PathParamsContext.Provider>
  </PathnameContext.Provider>
);

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("navigator", { sendBeacon });
  sendBeacon.mockClear();
});

afterEach(() => {
  cleanup();
  document.cookie = "zs_consent=; Max-Age=0; Path=/";
  sdkScripts().forEach((script) => script.remove());
  delete window.va;
  delete window.vaq;
  delete window.vam;
  delete window.si;
  delete window.siq;
  vi.unstubAllGlobals();
});

it("keeps tracking off for a new visitor until an explicit inline opt-in", async () => {
  const view = render(preferenceControls());
  expect(getConsent()).toBeNull();
  expect(sdkScripts()).toHaveLength(0);
  expect(sendBeacon).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Permitir analítica opcional" }));
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  expect(getConsent()?.categories).toEqual({ necessary: true, analytics: true, marketing: false });
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  expect(sendBeacon.mock.calls[0]?.[0]).toBe("/api/track");
  expect(await (sendBeacon.mock.calls[0]?.[1] as Blob).text()).toBe('{"path":"/politica-cookies"}');
  expect(screen.getByRole("status").textContent).toContain("Analítica opcional activada");

  view.unmount();
  render(<CookieReopenButton />);
  expect(screen.getByRole("status").textContent).toContain("Analítica opcional activada");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("withdraws existing consent and blocks later events from already loaded SDKs and routes", async () => {
  setConsent({ analytics: true, marketing: true });
  const view = render(preferenceControls());
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  const analyticsFilter = window.vaq?.find(([name]) => name === "beforeSend")?.[1] as
    | ((event: { type: "pageview"; url: string }) => unknown)
    | undefined;
  const speedFilter = window.siq?.find(([name]) => name === "beforeSend")?.[1];
  expect(analyticsFilter).toBeTypeOf("function");
  expect(speedFilter).toBeTypeOf("function");
  const pageEvent = { type: "pageview" as const, url: "https://zonasportpuebla.com/catalogo" };
  const vitalEvent = { type: "vital" as const, url: pageEvent.url };
  expect(analyticsFilter!(pageEvent)).toBe(pageEvent);
  expect(speedFilter!(vitalEvent)).toBe(vitalEvent);

  fireEvent.click(screen.getByRole("button", { name: "Desactivar cookies opcionales" }));
  expect(getConsent()?.categories).toEqual({ necessary: true, analytics: false, marketing: false });
  expect(screen.getByRole("status").textContent).toContain("Cookies opcionales desactivadas");
  expect(analyticsFilter!(pageEvent)).toBeNull();
  expect(speedFilter!(vitalEvent)).toBeNull();
  sendBeacon.mockClear();
  view.rerender(preferenceControls("/catalogo"));
  expect(sendBeacon).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Permitir analítica opcional" }));
  expect(analyticsFilter!(pageEvent)).toBe(pageEvent);
  expect(speedFilter!(vitalEvent)).toBe(vitalEvent);
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  view.rerender(preferenceControls("/catalogo"));
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  const speedScript = document.head.querySelector<HTMLScriptElement>(
    'script[data-sdkn="@vercel/speed-insights/next"]',
  );
  expect(speedScript?.dataset.route).toBe("/catalogo");
  view.rerender(preferenceControls("/blog"));
  expect(speedScript?.dataset.route).toBe("/blog");
  expect(sendBeacon).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Desactivar cookies opcionales" }));

  view.unmount();
  render(<CookieReopenButton />);
  expect(screen.getByRole("status").textContent).toContain("Cookies opcionales desactivadas");
});

it("checks stored permission before counting a route after consent was cleared elsewhere", () => {
  setConsent({ analytics: true, marketing: false });
  const view = render(preferenceControls());
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  sendBeacon.mockClear();
  document.cookie = "zs_consent=; Max-Age=0; Path=/";
  view.rerender(preferenceControls("/catalogo"));
  expect(sendBeacon).not.toHaveBeenCalled();
});

it.each([
  ["pt", "Permitir análise opcional", "Análise opcional ativada."],
  ["it", "Consenti analisi facoltative", "Analisi facoltative attivate."],
  ["fr", "Autoriser l’analyse facultative", "Analyse facultative activée."],
  ["de", "Optionale Analyse erlauben", "Optionale Analyse aktiviert."],
] as const)(
  "offers working opt-in with the published %s client dictionary",
  (locale, label, status) => {
    render(
      <LocaleProvider locale={locale} dictionary={getClientDictionary(locale)}>
        <CookieReopenButton />
      </LocaleProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(getConsent()?.categories).toEqual({
      necessary: true,
      analytics: true,
      marketing: false,
    });
    expect(screen.getByRole("status").textContent).toBe(status);
  },
);
