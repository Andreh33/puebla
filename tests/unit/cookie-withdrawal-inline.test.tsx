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

it("loads Vercel for a new visitor while the own counter still requires explicit opt-in", async () => {
  const view = render(preferenceControls());
  expect(getConsent()).toBeNull();
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  expect(sendBeacon).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();

  const filter = window.vaq?.find(([name]) => name === "beforeSend")?.[1] as (event: {
    type: "pageview";
    url: string;
  }) => unknown;
  expect(
    filter({ type: "pageview", url: "https://zonasportpuebla.com/catalogo?email=private#token" }),
  ).toEqual({ type: "pageview", url: "https://zonasportpuebla.com/catalogo" });
  expect(getConsent()).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Permitir contador de páginas" }));
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  expect(getConsent()?.categories).toEqual({ necessary: true, analytics: true, marketing: false });
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  expect(sendBeacon.mock.calls[0]?.[0]).toBe("/api/track");
  expect(await (sendBeacon.mock.calls[0]?.[1] as Blob).text()).toBe('{"path":"/politica-cookies"}');
  expect(screen.getByRole("status").textContent).toContain("Contador de páginas activado");

  view.unmount();
  render(<CookieReopenButton />);
  expect(screen.getByRole("status").textContent).toContain("Contador de páginas activado");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("withdraws only the own counter consent while Vercel keeps following public routes", async () => {
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
  expect(analyticsFilter!(pageEvent)).toEqual(pageEvent);
  expect(speedFilter!(vitalEvent)).toEqual(vitalEvent);

  fireEvent.click(screen.getByRole("button", { name: "Desactivar contador de páginas" }));
  expect(getConsent()?.categories).toEqual({ necessary: true, analytics: false, marketing: false });
  expect(screen.getByRole("status").textContent).toContain("Contador de páginas desactivado");
  expect(analyticsFilter!(pageEvent)).toEqual(pageEvent);
  expect(speedFilter!(vitalEvent)).toEqual(vitalEvent);
  sendBeacon.mockClear();
  view.rerender(preferenceControls("/catalogo"));
  expect(sendBeacon).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Permitir contador de páginas" }));
  expect(analyticsFilter!(pageEvent)).toEqual(pageEvent);
  expect(speedFilter!(vitalEvent)).toEqual(vitalEvent);
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
  fireEvent.click(screen.getByRole("button", { name: "Desactivar contador de páginas" }));

  view.unmount();
  render(<CookieReopenButton />);
  expect(screen.getByRole("status").textContent).toContain("Contador de páginas desactivado");
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

it("also loads Vercel with a saved refusal without granting counter or marketing consent", async () => {
  setConsent({ analytics: false, marketing: false });
  render(preferenceControls("/fr/catalogo"));
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  expect(getConsent()?.categories).toEqual({ necessary: true, analytics: false, marketing: false });
  expect(sendBeacon).not.toHaveBeenCalled();
});

it.each([
  "/admin",
  "/admin/login?from=/admin/pedidos",
  "/api/auth/callback/credentials?token=secret",
  "/auth/callback#secret",
  "/checkout/success?session_id=cs_private",
  "/pt/checkout/success?session_id=cs_private",
  "/it/checkout/cancelado",
  "/fr/admin/pedidos",
  "/de/auth/callback",
  "/%61dmin/pedidos",
])("drops private Vercel page and vital events for %s", async (path) => {
  setConsent({ analytics: true, marketing: false });
  render(preferenceControls());
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  const analyticsFilter = window.vaq?.find(([name]) => name === "beforeSend")?.[1] as (event: {
    type: "pageview";
    url: string;
  }) => unknown;
  const speedFilter = window.siq?.find(([name]) => name === "beforeSend")?.[1];
  const url = `https://zonasportpuebla.com${path}`;
  expect(analyticsFilter({ type: "pageview", url })).toBeNull();
  expect(speedFilter!({ type: "vital", url })).toBeNull();
});

it.each([
  ["/", "/"],
  ["/catalogo?email=private%40example.com#secret", "/catalogo"],
  ["/producto/zapatilla-runner?token=secret", "/producto/zapatilla-runner"],
  ["/pt", "/pt"],
  ["/it/blog/guia?utm_campaign=private#section", "/it/blog/guia"],
  ["/fr/marca/joma?ref=private", "/fr/marca/joma"],
  ["/de/carrito#email", "/de/carrito"],
  ["/blog/checkout-guide", "/blog/checkout-guide"],
])("keeps public routes but removes query and hash from %s", async (path, expectedPath) => {
  setConsent({ analytics: true, marketing: false });
  render(preferenceControls());
  await waitFor(() => expect(sdkScripts()).toHaveLength(2));
  const analyticsFilter = window.vaq?.find(([name]) => name === "beforeSend")?.[1] as (event: {
    type: "pageview";
    url: string;
  }) => unknown;
  const speedFilter = window.siq?.find(([name]) => name === "beforeSend")?.[1];
  const url = `https://zonasportpuebla.com${path}`;
  const cleanUrl = `https://zonasportpuebla.com${expectedPath}`;
  expect(analyticsFilter({ type: "pageview", url })).toEqual({ type: "pageview", url: cleanUrl });
  expect(speedFilter!({ type: "vital", url, route: path })).toEqual({
    type: "vital",
    url: cleanUrl,
    route: expectedPath,
  });
});

it.each([
  ["pt", "Permitir contador de páginas", "Contador de páginas ativado."],
  ["it", "Consenti contatore di pagine", "Contatore di pagine attivato."],
  ["fr", "Autoriser le compteur de pages", "Compteur de pages activé."],
  ["de", "Seitenzähler erlauben", "Seitenzähler aktiviert."],
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
