"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CustomCursor — un puntero suave (dot + ring) que sigue al cursor con lag.
 *
 * - Sólo se monta en dispositivos con hover real (no touch).
 * - Respeta `prefers-reduced-motion` (en ese caso no se renderiza).
 * - Los elementos pueden poner `data-cursor="texto"` para mostrar label.
 * - Sobre <a>, <button>, [role="button"] el ring crece y se vuelve más opaco.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = false;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!reduce && hover) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      // Hover state target
      const target = e.target as HTMLElement | null;
      const interactive = target?.closest(
        'a, button, [role="button"], input, textarea, select, label[for], [data-cursor]',
      ) as HTMLElement | null;
      if (interactive) {
        ring.dataset.state = "hover";
        const text = interactive.dataset.cursor;
        if (text) {
          ring.dataset.state = "label";
          label.textContent = text;
        } else {
          label.textContent = "";
        }
      } else {
        ring.dataset.state = "default";
        label.textContent = "";
      }
    };

    const onDown = () => {
      ring.dataset.pressed = "true";
    };
    const onUp = () => {
      ring.dataset.pressed = "false";
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate3d(${mx - 4}px, ${my - 4}px, 0)`;
      ring.style.transform = `translate3d(${rx - 16}px, ${ry - 16}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] hidden md:block">
      <style>{`
        .zs-cursor-dot { position: fixed; top: 0; left: 0; width: 8px; height: 8px; border-radius: 9999px; background: #14225b; opacity: 0.85; mix-blend-mode: normal; }
        .zs-cursor-ring { position: fixed; top: 0; left: 0; width: 32px; height: 32px; border-radius: 9999px; border: 1.5px solid rgba(20,34,91,0.55); transition: width 0.25s ease, height 0.25s ease, border-color 0.25s ease, background 0.25s ease, opacity 0.25s ease; opacity: 0.7; display: flex; align-items: center; justify-content: center; padding: 0 8px; white-space: nowrap; }
        .zs-cursor-ring[data-state="hover"] { width: 48px; height: 48px; border-color: rgba(20,34,91,0.9); }
        .zs-cursor-ring[data-state="label"] { width: auto; min-width: 64px; height: 32px; background: #14225b; border-color: #14225b; color: #fff; }
        .zs-cursor-ring[data-pressed="true"] { transform-origin: center; }
        .zs-cursor-label { font-size: 11px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
      `}</style>
      <div ref={dotRef} className="zs-cursor-dot" />
      <div ref={ringRef} className="zs-cursor-ring">
        <span ref={labelRef} className="zs-cursor-label" />
      </div>
    </div>
  );
}
