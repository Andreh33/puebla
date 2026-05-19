"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/hooks/use-swipe";
import type { GalleryImage } from "@/components/public/ProductGallery";

type Props = {
  images: GalleryImage[];
  productName: string;
};

/**
 * ProductGalleryLuxe — versión cinemática:
 *  - Layout 4:5 con thumbs en columna a la izquierda (desktop) y debajo (mobile).
 *  - Crossfade 400ms al cambiar de imagen.
 *  - Zoom on hover desktop (transform-origin dinámico).
 *  - Lightbox fullscreen (click en main image).
 *  - Swipe horizontal en touch.
 *  - ESC y flechas para navegar.
 */
export function ProductGalleryLuxe({ images, productName }: Props) {
  const safeImages = useMemo(() => (images.length > 0 ? images : []), [images]);
  const [active, setActive] = useState(0);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const mainRef = useRef<HTMLButtonElement | null>(null);

  const next = useCallback(() => {
    if (safeImages.length === 0) return;
    setActive((i) => (i + 1) % safeImages.length);
  }, [safeImages.length]);
  const prev = useCallback(() => {
    if (safeImages.length === 0) return;
    setActive((i) => (i - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  const swipe = useSwipe({
    onSwipeLeft: next,
    onSwipeRight: prev,
    threshold: 50,
    enabled: safeImages.length > 1,
  });
  const swipeLightbox = useSwipe({
    onSwipeLeft: next,
    onSwipeRight: prev,
    onSwipeDown: () => setLightbox(false),
    threshold: 50,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") setLightbox(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

  if (safeImages.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl border border-zs-border bg-zs-surface text-zs-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-12 w-12" aria-hidden />
          <span className="text-sm">Imagen no disponible</span>
        </div>
      </div>
    );
  }

  const current = safeImages[active]!;

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        {/* Thumbs */}
        {safeImages.length > 1 && (
          <div className="order-2 grid grid-cols-5 gap-2 md:order-1 md:grid-cols-1 md:gap-2">
            {safeImages.map((img, i) => (
              <button
                key={img.url + i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-lg border bg-zs-surface transition md:w-20",
                  i === active
                    ? "border-zs-blue-700 ring-2 ring-zs-blue-700/30"
                    : "border-zs-border hover:border-zs-blue-300",
                )}
              >
                <Image
                  src={img.urlThumb || img.url}
                  alt=""
                  fill
                  sizes="100px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        <div className="order-1 flex-1 md:order-2">
          <div
            className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-zs-border bg-zs-surface touch-pan-y"
            {...swipe.bind}
            onMouseMove={onMouseMove}
            onMouseLeave={() => setZoomPos(null)}
          >
            {safeImages.map((img, i) => (
              <Image
                key={img.url + i}
                src={img.url}
                alt={i === active ? img.alt || productName : ""}
                fill
                priority={i === active}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={cn(
                  "object-contain transition-opacity duration-500 ease-out",
                  i === active ? "opacity-100" : "opacity-0",
                )}
                placeholder={img.blurDataUrl ? "blur" : "empty"}
                blurDataURL={img.blurDataUrl ?? undefined}
                style={
                  i === active && zoomPos
                    ? {
                        transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                        transform: "scale(2)",
                        transition: "transform 200ms ease-out",
                      }
                    : undefined
                }
              />
            ))}

            <button
              ref={mainRef}
              type="button"
              aria-label="Ampliar imagen"
              onClick={() => setLightbox(true)}
              className="absolute right-3 top-3 z-10 inline-flex items-center justify-center rounded-full border border-zs-border bg-white/90 p-2 text-zs-ink shadow-sm transition hover:bg-white"
              data-cursor="Zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-zs-border bg-white/90 p-2 text-zs-ink shadow-sm opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-zs-border bg-white/90 p-2 text-zs-ink shadow-sm opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
                  {active + 1} / {safeImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="relative h-full max-h-[90vh] w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
            {...swipeLightbox.bind}
          >
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt || productName}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  {active + 1} / {safeImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
