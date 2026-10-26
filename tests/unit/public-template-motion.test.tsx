// @vitest-environment happy-dom
import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicTemplate from "@/app/[locale]/(public)/template";

const animate = vi.fn();
const cancel = vi.fn();
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
beforeEach(() => {
  vi.stubGlobal("React", React);
  animate.mockReset().mockReturnValue({ cancel });
  cancel.mockReset();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
  Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
  else Reflect.deleteProperty(Element.prototype, "animate");
});

describe("public page entrance motion", () => {
  it.each(["(max-width: 767px)", "(prefers-reduced-motion: reduce)"])(
    "keeps content visible when %s matches", (matched) => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === matched, media: query }));
      const view = render(<PublicTemplate><p>Contenido de la tienda</p></PublicTemplate>);
      expect(view.getByText("Contenido de la tienda")).toBeTruthy();
      expect(animate).not.toHaveBeenCalled();
    },
  );
  it("preserves the desktop entrance and cancels it when leaving the page", () => {
    const view = render(<PublicTemplate><p>Contenido de la tienda</p></PublicTemplate>);
    expect(animate).toHaveBeenCalledOnce();
    expect(animate.mock.calls[0]?.[1]).toMatchObject({ duration: 400 });
    view.unmount();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
