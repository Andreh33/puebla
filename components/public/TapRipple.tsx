"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /** Color del ripple. Default: zs-blue-900 al 15%. */
  color?: string;
  /** Duración de la animación en ms. */
  duration?: number;
  /** Si true, no añade overflow-hidden ni position-relative al wrapper. */
  bare?: boolean;
  className?: string;
  as?: "span" | "div";
};

type Ripple = { id: number; x: number; y: number; size: number };

/**
 * TapRipple — wrapper que añade efecto ripple Material-style en click/tap.
 *
 * Usa pointer events para funcionar en touch y mouse.
 *
 * ```tsx
 * <TapRipple>
 *   <button>Comprar</button>
 * </TapRipple>
 * ```
 */
export function TapRipple({
  children,
  color = "rgba(20, 34, 91, 0.18)",
  duration = 600,
  bare = false,
  className,
  as = "span",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const host = ref.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.6;
      const id = Date.now() + Math.random();
      setRipples((prev) => [
        ...prev,
        {
          id,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          size,
        },
      ]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, duration + 50);
    },
    [duration],
  );

  const Tag = as as "span";

  return (
    <Tag
      ref={(node) => {
        ref.current = node;
      }}
      onPointerDown={onPointerDown}
      className={cn(!bare && "relative inline-flex overflow-hidden", className)}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            background: color,
            transform: "translate(-50%, -50%) scale(0)",
            animation: `zs-tap-ripple ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          }}
        />
      ))}
    </Tag>
  );
}
