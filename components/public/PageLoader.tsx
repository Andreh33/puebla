"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * PageLoader — barra superior estilo NProgress que se anima en cada navegación.
 *
 * Heurística: al cambiar `pathname`, animamos la barra hasta 90% y al
 * confirmarse el nuevo render (next tick) la cerramos al 100%.
 *
 * Mejoras premium:
 *  - Easing exponencial para la animación.
 *  - Glow color marca tras la barra.
 *  - "Comet" head (punto brillante avanzando).
 */
export function PageLoader() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const lastPath = useRef(pathname);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    setVisible(true);
    setProgress(12);
    timers.current.push(window.setTimeout(() => setProgress(38), 90));
    timers.current.push(window.setTimeout(() => setProgress(64), 220));
    timers.current.push(window.setTimeout(() => setProgress(82), 420));
    timers.current.push(window.setTimeout(() => setProgress(92), 700));

    timers.current.push(
      window.setTimeout(() => {
        setProgress(100);
        timers.current.push(
          window.setTimeout(() => {
            setVisible(false);
            setProgress(0);
          }, 240),
        );
      }, 850),
    );

    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [pathname]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] h-[3px] overflow-visible"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease",
      }}
    >
      <div className="relative h-full w-full">
        {/* Glow base */}
        <div
          className="absolute inset-y-0 left-0 h-full"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, var(--color-zs-blue-700) 0%, var(--color-zs-red-600) 50%, var(--color-zs-tennis-500) 100%)",
            transition:
              "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
            boxShadow:
              "0 0 12px 1px rgba(220, 38, 38, 0.55), 0 0 20px 2px rgba(20, 34, 91, 0.35)",
            borderRadius: "0 999px 999px 0",
          }}
        />
        {/* Comet head */}
        <div
          className="absolute -top-px h-[5px] w-12 -translate-x-full rounded-full"
          style={{
            left: `${progress}%`,
            background:
              "radial-gradient(ellipse at right, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)",
            transition: "left 700ms cubic-bezier(0.22, 1, 0.36, 1)",
            mixBlendMode: "screen",
          }}
        />
      </div>
    </div>
  );
}
