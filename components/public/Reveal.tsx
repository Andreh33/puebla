"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Variant = "fade-up" | "fade-right" | "fade-left" | "scale" | "fade";

type Props = {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  duration?: number;
  className?: string;
  /** Cuándo dispara: 0..1 (porcentaje visible del elemento). */
  threshold?: number;
  /** Margen extra para disparar antes/después de entrar. */
  rootMargin?: string;
  /** Si true, sólo se reproduce una vez. */
  once?: boolean;
  as?: "div" | "section" | "article" | "header" | "footer" | "main" | "aside" | "li" | "ul" | "ol" | "span" | "h1" | "h2" | "h3" | "h4";
};

const initial: Record<Variant, CSSProperties> = {
  "fade-up": { opacity: 0, transform: "translate3d(0,20px,0)" },
  "fade-right": { opacity: 0, transform: "translate3d(-20px,0,0)" },
  "fade-left": { opacity: 0, transform: "translate3d(20px,0,0)" },
  scale: { opacity: 0, transform: "scale(0.96)" },
  fade: { opacity: 0 },
};

export function Reveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 700,
  className,
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
  once = true,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            if (once) obs.unobserve(e.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reduced, threshold, rootMargin, once]);

  const style: CSSProperties = reduced
    ? {}
    : {
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: "opacity, transform",
        ...(visible
          ? { opacity: 1, transform: "translate3d(0,0,0) scale(1)" }
          : initial[variant]),
      };

  return createElement(
    Tag,
    { ref, className: cn(className), style },
    children,
  );
}
