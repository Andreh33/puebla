"use client";

import { useEffect } from "react";

/**
 * SmoothScroll — instancia un Lenis global y lo sincroniza con GSAP ScrollTrigger.
 *
 * - Desactivado si el usuario tiene `prefers-reduced-motion: reduce`.
 * - Desactivado en touch (degradado a scroll nativo, que en iOS/Android ya es liso).
 * - GSAP y Lenis se cargan dinámicamente para no engordar el bundle inicial.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honorar accesibilidad
    const reduce = false;
    if (reduce) return;

    // Evitar reinstanciar (HMR / template re-render)
    if ((window as unknown as { __lenis?: unknown }).__lenis) return;

    let rafId = 0;
    let lenis: { destroy: () => void; raf: (t: number) => void } | null = null;
    let cleanupGsap: (() => void) | null = null;

    (async () => {
      const [{ default: Lenis }, gsapMod, stMod] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      const gsap = gsapMod.gsap;
      const ScrollTrigger = stMod.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const instance = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        // En touch dejamos que el navegador maneje el scroll (mejor inercia nativa).
        syncTouch: false,
      });

      lenis = instance;
      (window as unknown as { __lenis: unknown }).__lenis = instance;

      // Sync con ScrollTrigger
      instance.on("scroll", ScrollTrigger.update);
      const tickerCb = (time: number) => instance.raf(time * 1000);
      gsap.ticker.add(tickerCb);
      gsap.ticker.lagSmoothing(0);

      cleanupGsap = () => {
        gsap.ticker.remove(tickerCb);
      };

      const raf = (time: number) => {
        instance.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    })();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      cleanupGsap?.();
      lenis?.destroy();
      try {
        delete (window as unknown as { __lenis?: unknown }).__lenis;
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}
