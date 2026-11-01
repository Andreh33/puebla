// @vitest-environment happy-dom
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/public/LocaleProvider";
import { SearchCommand } from "@/components/public/SearchCommand";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("cmdk", () => {
  const Command = Object.assign(({ children }: { children: React.ReactNode }) => <div>{children}</div>, {
    Input: () => <input aria-label="search" />,
    List: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  });
  return { Command };
});
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("opens one search dialog for Ctrl+K while keeping the narrow-menu trigger usable", () => {
  render(<LocaleProvider locale="es" dictionary={{}}>
    <SearchCommand trigger={<button>Header search</button>} />
    <SearchCommand keyboardShortcut={false} trigger={<button>Menu search</button>} />
  </LocaleProvider>);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Menu search" }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});
