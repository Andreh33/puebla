"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Loader visible mientras carga el bundle 3D + el .glb (1.6 MB).
 * Aparece sobre el canvas oscuro y se desvanece cuando todo está listo.
 *
 * Uso:
 *   const [ready, setReady] = useState(false);
 *   <SceneLoader visible={!ready} />
 *   // En el Canvas o tras montar, llamar setReady(true).
 *
 * No depende de R3F — funciona aunque el bundle 3D aún no se haya descargado.
 */
type Props = {
  visible: boolean;
  /** Progreso 0..100 si se conoce; si no, se anima con fake progress. */
  progress?: number;
};

export function SceneLoader({ visible, progress }: Props) {
  // Si no recibimos progress real, simulamos una barra "casi ahí": llega rápido
  // al 85% y luego espera al evento de carga real para llegar al 100.
  const [fake, setFake] = useState(8);
  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      setFake((p) => {
        // Curva: rápida hasta 60, lenta hasta 85.
        const speed = p < 60 ? 28 : p < 85 ? 6 : 0;
        return Math.min(85, p + speed * dt);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // Si recibimos un progress real > 0 lo usamos, si no, fake progress.
  // Cuando alcanza 100, mostramos 100 aunque el fake esté detrás.
  const realActive = progress != null && progress > 0;
  const pct = realActive ? Math.max(fake, Math.min(100, progress)) : fake;

  return (
    <div
      aria-hidden={!visible}
      className={[
        "pointer-events-none absolute inset-0 z-30 flex items-center justify-center",
        "bg-zs-blue-950/85 backdrop-blur-sm transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative h-20 w-20 sm:h-24 sm:w-24">
          <div className="absolute inset-0 animate-ping rounded-full bg-zs-tennis-500/20" />
          <div className="absolute inset-2 rounded-full bg-white/95 shadow-2xl">
            <Image
              src="/logo.webp"
              alt=""
              fill
              priority
              sizes="96px"
              className="object-contain p-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zs-tennis-300">
            Experiencia 3D
          </p>
          <p className="text-sm text-white/80 sm:text-base">
            Cargando la zapatilla y la sierra…
          </p>
        </div>

        <div className="w-56 sm:w-72">
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-zs-tennis-500 via-white to-zs-red-500 transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] tabular-nums text-white/60">
            {Math.floor(pct)} %
          </p>
        </div>
      </div>
    </div>
  );
}
