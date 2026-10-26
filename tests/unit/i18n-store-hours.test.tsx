// @vitest-environment happy-dom
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { OpenNowBadge } from "@/components/public/OpenNowBadge";
import fr from "@/data/translations/fr/ui.json";

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-26T20:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("renders the real next opening time in French after client hydration", () => {
  render(<LocaleProvider locale="fr" dictionary={fr}><OpenNowBadge /></LocaleProvider>);
  expect(screen.getByText("Fermé")).toBeTruthy();
  expect(screen.getByText("· ouvre demain à 10:00")).toBeTruthy();
  expect(screen.queryByText(/abre mañana/)).toBeNull();
});

it("preserves the Spanish opening message at the same Madrid time", () => {
  render(<LocaleProvider locale="es" dictionary={{}}><OpenNowBadge /></LocaleProvider>);
  expect(screen.getByText("Cerrado")).toBeTruthy();
  expect(screen.getByText("· abre mañana a las 10:00")).toBeTruthy();
});
