// @vitest-environment happy-dom
import React from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeHero } from "@/components/public/home/HomeHero";

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let resolveFonts: () => void;
let rejectFonts: (reason?: unknown) => void;
const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");

function renderFrame() {
  const callbacks = [...frames.values()];
  frames.clear();
  act(() => callbacks.forEach((callback) => callback(performance.now())));
}

beforeEach(() => {
  vi.stubGlobal("React", React);
  frames = new Map();
  nextFrame = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const ready = new Promise<void>((resolve, reject) => {
    resolveFonts = resolve;
    rejectFonts = reject;
  });
  void ready.catch(() => {});
  Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
  vi.spyOn(window, "matchMedia").mockImplementation((media) => ({
    matches: false,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalFonts) Object.defineProperty(document, "fonts", originalFonts);
  else Reflect.deleteProperty(document, "fonts");
});

describe("hero background media loading", () => {
  it("renders the same poster and autoplay controls without an SSR media download", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<HomeHero />);
    const video = container.querySelector("video")!;
    expect(video.getAttribute("poster")).toBe("/videos/hero-basket.jpg");
    expect(video.hasAttribute("autoplay")).toBe(true);
    expect(video.hasAttribute("loop")).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.hasAttribute("src")).toBe(false);
    expect(video.querySelector("source[src]")).toBeNull();
  });

  it("keeps media idle until fonts have settled and a rendering opportunity has completed", async () => {
    const { container } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    window.dispatchEvent(new Event("focus"));
    renderFrame();
    expect(video.getAttribute("src")).toBeNull();
    expect(video.querySelector("source[src]")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await act(async () => resolveFonts());
    renderFrame();
    expect(video.getAttribute("src")).toBeNull();
    renderFrame();
    expect(video.getAttribute("src")).toBe("/videos/hero-basket.mp4");
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it("does not start a download when unmounted before fonts settle", async () => {
    const { container, unmount } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    unmount();
    await act(async () => resolveFonts());
    renderFrame();
    renderFrame();
    expect(video.getAttribute("src")).toBeNull();
    expect(video.querySelector("source[src]")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("cancels startup when unmounted between the rendering frames", async () => {
    const { container, unmount } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    await act(async () => resolveFonts());
    renderFrame();
    unmount();
    renderFrame();
    expect(video.getAttribute("src")).toBeNull();
    expect(video.querySelector("source[src]")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("still starts the video if font loading rejects", async () => {
    const { container } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    await act(async () => rejectFonts(new Error("font unavailable")));
    renderFrame();
    renderFrame();
    expect(video.getAttribute("src")).toBe("/videos/hero-basket.mp4");
  });

  it("falls back to a rendered frame when the font-loading API is unavailable", async () => {
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    const { container } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    await act(async () => {});
    renderFrame();
    expect(video.getAttribute("src")).toBeNull();
    renderFrame();
    expect(video.getAttribute("src")).toBe("/videos/hero-basket.mp4");
  });

  it("releases the media resource and stops retries when unmounted after startup", async () => {
    const { container, unmount } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    await act(async () => resolveFonts());
    renderFrame();
    renderFrame();
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    unmount();
    window.dispatchEvent(new Event("focus"));
    expect(video.getAttribute("src")).toBeNull();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("keeps the poster available if the browser rejects autoplay", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("autoplay blocked"));
    const { container } = render(<HomeHero />);
    const video = container.querySelector("video")!;
    await act(async () => resolveFonts());
    renderFrame();
    renderFrame();
    await act(async () => {});
    expect(video.getAttribute("src")).toBe("/videos/hero-basket.mp4");
    expect(video.getAttribute("poster")).toBe("/videos/hero-basket.jpg");
  });

  it("retains focus playback retry after media becomes available", async () => {
    render(<HomeHero />);
    await act(async () => resolveFonts());
    renderFrame();
    renderFrame();
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    window.dispatchEvent(new Event("focus"));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });
});
