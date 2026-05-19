"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Distancia máxima en px de desplazamiento del elemento (default 18). */
  strength?: number;
  /** Si true, fuerza la desactivación (útil cuando se anida en links). */
  disabled?: boolean;
};

/**
 * MagneticButton — envuelve un elemento y lo atrae al cursor con elasticidad.
 *
 * - Sólo se activa en punteros con hover (no en touch).
 * - Respeta `prefers-reduced-motion`.
 * - No fuerza display, se comporta como inline-block.
 */
export function MagneticButton({ children, className, strength = 18, disabled }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reduce || !hover) return;

    let rafId = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const animate = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      const max = Math.max(rect.width, rect.height) / 2;
      const dist = Math.min(1, Math.hypot(x, y) / max);
      tx = (x / max) * strength * (1 - dist * 0.4);
      ty = (y / max) * strength * (1 - dist * 0.4);
      if (!rafId) rafId = requestAnimationFrame(animate);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!rafId) rafId = requestAnimationFrame(animate);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
      el.style.transform = "";
    };
  }, [disabled, strength]);

  return (
    <span
      ref={ref}
      className={cn("inline-block will-change-transform", className)}
      style={{ transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {children}
    </span>
  );
}
