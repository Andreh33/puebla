"use client";

import { useCallback, useEffect, useRef } from "react";

export type SwipeDirection = "left" | "right" | "up" | "down";

export type SwipeHandlers = {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Cualquier swipe sea cual sea la dirección. */
  onSwipe?: (dir: SwipeDirection, info: { dx: number; dy: number; velocity: number }) => void;
};

export type UseSwipeOptions = SwipeHandlers & {
  /** Distancia mínima en píxeles para considerar swipe. Default: 40. */
  threshold?: number;
  /** Velocidad mínima (px/ms) para considerar swipe rápido. Default: 0.25. */
  velocityThreshold?: number;
  /** Si true, llama preventDefault en touchmove cuando el movimiento es claramente horizontal. */
  preventScrollOnSwipe?: boolean;
  /** Habilita/deshabilita el hook. */
  enabled?: boolean;
};

/**
 * useSwipe — hook React para gestos táctiles.
 *
 * Devuelve un objeto con handlers que se pueden esparcir sobre un elemento.
 * Funciona en touch y mouse (pointer events) para QA en desktop.
 *
 * ```tsx
 * const swipe = useSwipe({ onSwipeLeft: () => next(), onSwipeRight: () => prev() });
 * return <div {...swipe.bind} />;
 * ```
 */
export function useSwipe(opts: UseSwipeOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipe,
    threshold = 40,
    velocityThreshold = 0.25,
    preventScrollOnSwipe = false,
    enabled = true,
  } = opts;

  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  // refs vivos para handlers
  const handlersRef = useRef<SwipeHandlers>({});
  handlersRef.current = { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onSwipe };

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const t = e.touches[0];
      if (!t) return;
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !preventScrollOnSwipe || !start.current) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - start.current.x);
      const dy = Math.abs(t.clientY - start.current.y);
      if (dx > dy && dx > 12 && e.cancelable) {
        e.preventDefault();
      }
    },
    [enabled, preventScrollOnSwipe],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !start.current) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      const dt = Math.max(1, Date.now() - start.current.t);
      start.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const velocity = Math.max(absX, absY) / dt;

      if (Math.max(absX, absY) < threshold && velocity < velocityThreshold) return;

      let dir: SwipeDirection;
      if (absX > absY) {
        dir = dx < 0 ? "left" : "right";
      } else {
        dir = dy < 0 ? "up" : "down";
      }

      const h = handlersRef.current;
      h.onSwipe?.(dir, { dx, dy, velocity });
      if (dir === "left") h.onSwipeLeft?.();
      else if (dir === "right") h.onSwipeRight?.();
      else if (dir === "up") h.onSwipeUp?.();
      else if (dir === "down") h.onSwipeDown?.();
    },
    [enabled, threshold, velocityThreshold],
  );

  // Mouse fallback (útil para QA en desktop). Solo botón izquierdo.
  const mouseStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || e.button !== 0) return;
      mouseStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    },
    [enabled],
  );
  const onMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled || !mouseStart.current) return;
      const dx = e.clientX - mouseStart.current.x;
      const dy = e.clientY - mouseStart.current.y;
      const dt = Math.max(1, Date.now() - mouseStart.current.t);
      mouseStart.current = null;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const velocity = Math.max(absX, absY) / dt;
      if (Math.max(absX, absY) < threshold && velocity < velocityThreshold) return;
      let dir: SwipeDirection;
      if (absX > absY) dir = dx < 0 ? "left" : "right";
      else dir = dy < 0 ? "up" : "down";

      const h = handlersRef.current;
      h.onSwipe?.(dir, { dx, dy, velocity });
      if (dir === "left") h.onSwipeLeft?.();
      else if (dir === "right") h.onSwipeRight?.();
      else if (dir === "up") h.onSwipeUp?.();
      else if (dir === "down") h.onSwipeDown?.();
    },
    [enabled, threshold, velocityThreshold],
  );

  useEffect(() => {
    return () => {
      start.current = null;
      mouseStart.current = null;
    };
  }, []);

  return {
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseUp,
    },
  };
}
