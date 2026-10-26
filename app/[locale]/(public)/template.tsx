"use client";


import { useTranslatedValue } from "@/components/public/LocaleProvider";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Template público — se monta de nuevo en cada navegación, lo que nos da un
 * gancho perfecto para una animación de entrada fade+slide-up.
 *
 * En móvil el contenido conserva su primer pintado; escritorio mantiene la
 * entrada animada. Respetamos `prefers-reduced-motion`.
 */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  const tx = useTranslatedValue();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      typeof el.animate !== "function" ||
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    const animation = el.animate(
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
    return () => animation.cancel();
  }, [pathname]);

  return <div ref={ref}>{tx(children)}</div>;
}
