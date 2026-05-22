"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Punto decorativo con atracción magnética al cursor. Cuando el cursor
 * está dentro del `radius` (en px), el dot se desplaza hacia él de forma
 * suave con interpolación exponencial. Fuera del radio vuelve a su
 * posición original.
 *
 * Solo se activa en desktop con `(hover: hover) and (pointer: fine)` —
 * en móvil/tablet queda estático para no consumir batería ni dar saltos
 * raros con touches.
 *
 * Respeta `prefers-reduced-motion: reduce` (queda inmóvil).
 *
 * Props:
 *  - `radius` (default 220): distancia en px en la que el dot empieza a
 *    moverse hacia el cursor.
 *  - `strength` (default 0.45): qué porcentaje del vector cursor→dot se
 *    aplica como desplazamiento máximo (0 = nulo, 1 = sigue el cursor).
 *  - `className`: para posicionar (absolute con coordenadas) y dar tamaño.
 */
type Props = {
  radius?: number;
  strength?: number;
  className?: string;
  children?: React.ReactNode;
};

export function MagneticDot({
  radius = 220,
  strength = 0.45,
  className,
  children,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!supportsHover) return;
    const reduced = false;
    if (reduced) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dotCx = rect.left + rect.width / 2;
      const dotCy = rect.top + rect.height / 2;
      const dx = e.clientX - dotCx;
      const dy = e.clientY - dotCy;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        // Caída suave conforme se acerca el cursor (1 cerca, 0 lejos).
        const factor = (1 - dist / radius) * strength;
        tx = dx * factor;
        ty = dy * factor;
      } else {
        tx = 0;
        ty = 0;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const loop = () => {
      const easing = 0.18;
      cx += (tx - cx) * easing;
      cy += (ty - cy) * easing;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [radius, strength]);

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none inline-block will-change-transform", className)}
      style={{ transition: "transform 0ms" /* loop ya interpola */ }}
    >
      {children}
    </span>
  );
}
