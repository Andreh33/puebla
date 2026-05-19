"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Template público — se monta de nuevo en cada navegación, lo que nos da un
 * gancho perfecto para una animación de entrada fade+slide-up.
 *
 * Respetamos `prefers-reduced-motion`.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.animate(
      [
        { opacity: 0, transform: "translate3d(0,16px,0)" },
        { opacity: 1, transform: "translate3d(0,0,0)" },
      ],
      {
        duration: 400,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
      },
    );
  }, [pathname, reduced]);

  return <div ref={ref}>{children}</div>;
}
