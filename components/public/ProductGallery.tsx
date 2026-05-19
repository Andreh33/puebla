"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  url: string;
  urlThumb?: string | null;
  urlMedium?: string | null;
  alt: string;
  width?: number | null;
  height?: number | null;
  blurDataUrl?: string | null;
};

type Props = {
  images: GalleryImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: Props) {
  const safeImages = useMemo(
    () => (images.length > 0 ? images : []),
    [images],
  );
  const [active, setActive] = useState(0);
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  const next = useCallback(() => {
    if (safeImages.length === 0) return;
    setActive((i) => (i + 1) % safeImages.length);
  }, [safeImages.length]);
  const prev = useCallback(() => {
    if (safeImages.length === 0) return;
    setActive((i) => (i - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (safeImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-zs-border bg-zs-surface text-zs-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageOff className="h-12 w-12" aria-hidden />
          <span className="text-sm">Imagen no disponible</span>
        </div>
      </div>
    );
  }

  const current = safeImages[active]!;

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={mainRef}
        className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-zs-border bg-zs-surface"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt || productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
          placeholder={current.blurDataUrl ? "blur" : "empty"}
          blurDataURL={current.blurDataUrl ?? undefined}
        />

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
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
              {active + 1} / {safeImages.length}
            </div>
          </>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {safeImages.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg border bg-zs-surface transition",
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
    </div>
  );
}
