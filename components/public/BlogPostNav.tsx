"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Neighbor = { slug: string; title: string } | null;

type Props = {
  prev: Neighbor;
  next: Neighbor;
};

/**
 * BlogPostNav — navegación entre artículos.
 *
 * - Render: tarjetas prev/next al pie del post.
 * - Gestos: swipe horizontal global en mobile abre el siguiente/anterior post.
 * - Atajos: ← → en teclado.
 */
export function BlogPostNav({ prev, next }: Props) {
  const router = useRouter();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startT = useRef<number>(0);

  useEffect(() => {
    const THRESHOLD = 90;
    const VELOCITY = 0.4;
    const HORIZONTAL_RATIO = 1.4;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX.current = t.clientX;
      startY.current = t.clientY;
      startT.current = Date.now();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current == null || startY.current == null) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX.current;
      const dy = t.clientY - startY.current;
      const dt = Math.max(1, Date.now() - startT.current);
      startX.current = null;
      startY.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      // Solo swipe horizontal claro
      if (absX < THRESHOLD && absX / dt < VELOCITY) return;
      if (absX < absY * HORIZONTAL_RATIO) return;

      // Evitar disparar dentro de elementos que ya capturan swipe (galerías, etc.)
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-swipe-stop]") || target?.closest(".group")) return;

      if (dx < 0 && next) router.push(`/blog/${next.slug}`);
      else if (dx > 0 && prev) router.push(`/blog/${prev.slug}`);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next, router]);

  // Atajos teclado ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "ArrowLeft" && prev) router.push(`/blog/${prev.slug}`);
      if (e.key === "ArrowRight" && next) router.push(`/blog/${next.slug}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Navegación entre artículos"
      className="mt-12 grid gap-3 border-t border-zs-border pt-6 sm:grid-cols-2"
    >
      {prev ? (
        <Link
          href={`/blog/${prev.slug}`}
          className="group flex items-start gap-3 rounded-2xl border border-zs-border bg-white p-4 transition hover:border-zs-blue-300 hover:shadow-sm"
          rel="prev"
        >
          <ChevronLeft className="mt-1 h-5 w-5 shrink-0 text-zs-muted transition group-hover:-translate-x-0.5 group-hover:text-zs-blue-700" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-zs-muted">
              Artículo anterior
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-zs-blue-900 group-hover:text-zs-blue-700">
              {prev.title}
            </p>
          </div>
        </Link>
      ) : (
        <span aria-hidden />
      )}
      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group flex items-start justify-end gap-3 rounded-2xl border border-zs-border bg-white p-4 text-right transition hover:border-zs-blue-300 hover:shadow-sm sm:text-right"
          rel="next"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-zs-muted">
              Siguiente artículo
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-zs-blue-900 group-hover:text-zs-blue-700">
              {next.title}
            </p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zs-muted transition group-hover:translate-x-0.5 group-hover:text-zs-blue-700" />
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
