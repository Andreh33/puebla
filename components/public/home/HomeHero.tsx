"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { MagneticButton } from "@/components/public/MagneticButton";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";

/**
 * HomeHero — hero editorial inmersivo a viewport completo.
 *
 * Reemplaza el viejo StaticHeroFallback (foto plana de bota sobre blanco) por
 * una composición tipográfica gigante con mesh-gradient animado de fondo, words
 * que entran con stagger, marquee de marcas y CTAs magnéticos.
 *
 * Decisiones:
 *  - Sin foto cuadrada de producto. Bleed completo al viewport.
 *  - Mesh gradient: 4 blobs azul/red/tennis con animación CSS lenta (no GPU
 *    expensive). En reduced-motion los blobs se quedan fijos.
 *  - Tipografía display ~clamp(3.5rem, 12vw, 11rem) con tracking apretado.
 *  - Stagger por palabra mediante delays incrementales — sin dependencias
 *    nuevas (no Motion/Framer): solo CSS transitions disparadas por estado
 *    `mounted`.
 *  - Marquee inferior infinito con keyframes.
 *  - CTAs envueltos en MagneticButton existente.
 *
 * A11y:
 *  - H1 con todo el texto del título "leído" (sr-only fallback) y la versión
 *    visible aria-hidden.
 *  - prefers-reduced-motion neutraliza stagger y mesh.
 */

const HEADLINE = ["No", "es", "una", "tienda.", "Es", "el", "barrio."] as const;
const BRANDS_TICKER = [
  "JOHN SMITH",
  "+8000",
  "NIKE",
  "ADIDAS",
  "BULLPADEL",
  "HEAD",
  "NOX",
  "WILSON",
  "ASICS",
  "SALOMON",
] as const;

export function HomeHero() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Defer al siguiente frame para garantizar transición desde el estado inicial.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Parallax sutil del título según pointer (solo desktop con hover fine).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduced) return;
    const root = rootRef.current;
    if (!root) return;
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!hover) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 14;
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      root.style.setProperty("--zs-hero-px", `${cx.toFixed(2)}px`);
      root.style.setProperty("--zs-hero-py", `${cy.toFixed(2)}px`);
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section
      ref={rootRef}
      aria-label="Zona Sport — bienvenida"
      className="relative isolate overflow-hidden bg-zs-blue-950 text-white"
      style={{ minHeight: "100svh" }}
    >
      {/* H1 accesible para SEO */}
      <h1 className="sr-only">
        Zona Sport — tienda de deportes multimarca en Puebla de la Calzada (Badajoz).
      </h1>

      {/* Mesh-gradient animado: 4 blobs en colores corporativos. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="zs-blob zs-blob-1" />
        <div className="zs-blob zs-blob-2" />
        <div className="zs-blob zs-blob-3" />
        <div className="zs-blob zs-blob-4" />
        {/* Grano sutil */}
        <div className="absolute inset-0 mix-blend-overlay opacity-[0.07] zs-grain" />
        {/* Viñeta inferior para legibilidad del marquee */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-zs-blue-950 via-zs-blue-950/40 to-transparent" />
      </div>

      {/* Eyebrow superior */}
      <div className="relative mx-auto flex max-w-[1600px] items-center justify-between px-4 pt-28 sm:px-8 sm:pt-32 lg:pt-36">
        <p className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/60">
          <span className="inline-block h-px w-8 bg-white/40" />
          Multimarca · Puebla de la Calzada
        </p>
        <p className="hidden text-[11px] uppercase tracking-[0.32em] text-white/45 sm:block">
          Est. 1998 — Badajoz
        </p>
      </div>

      {/* Titular monumental */}
      <div
        className="relative mx-auto max-w-[1600px] px-4 pt-10 pb-10 sm:px-8 sm:pt-16 lg:pt-24"
        style={{
          transform: reduced
            ? undefined
            : "translate3d(var(--zs-hero-px, 0px), var(--zs-hero-py, 0px), 0)",
          transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <h2
          aria-hidden
          className="font-display font-black leading-[0.86] tracking-[-0.04em]"
          style={{ fontSize: "clamp(3.5rem, 13vw, 12rem)" }}
        >
          {HEADLINE.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="zs-word-mask inline-block overflow-hidden align-bottom"
              style={{ marginRight: "0.18em" }}
            >
              <span
                className="zs-word inline-block will-change-transform"
                style={{
                  transitionDelay: reduced ? "0ms" : `${120 + i * 90}ms`,
                  transform:
                    mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 105%, 0)",
                  opacity: mounted || reduced ? 1 : 0,
                  color:
                    word === "barrio."
                      ? "var(--color-zs-red-500)"
                      : undefined,
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </h2>

        {/* Sub-copy + CTAs en grid 12 cols */}
        <div className="mt-12 grid gap-10 sm:mt-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p
              className="max-w-2xl text-balance text-base leading-relaxed text-white/75 sm:text-lg"
              style={{
                opacity: mounted || reduced ? 1 : 0,
                transform:
                  mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
                transition:
                  "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 900ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 900ms",
              }}
            >
              Running, montaña, pádel y calzado. Llevamos años eligiendo a mano
              cada referencia que entra en la tienda. Te asesoramos cara a cara
              — y por WhatsApp cuando te queda lejos venir.
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end"
            style={{
              opacity: mounted || reduced ? 1 : 0,
              transform:
                mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
              transition:
                "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 1050ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 1050ms",
            }}
          >
            <MagneticButton strength={14}>
              <Link
                href="#catalogo"
                data-cursor="Catálogo"
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-white pl-7 pr-3 text-sm font-semibold tracking-tight text-zs-blue-950 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.7)] transition-colors hover:bg-zs-tennis-300"
              >
                Ver catálogo
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zs-blue-950 text-white transition-transform group-hover:rotate-45">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton strength={10}>
              <a
                href={whatsappUrl(WhatsAppMessages.generic())}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="WhatsApp"
                className="inline-flex h-14 items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.04] px-7 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/[0.08]"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp directo
              </a>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Stats fila inferior */}
      <div className="relative mx-auto max-w-[1600px] px-4 pb-14 sm:px-8">
        <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:mt-16 sm:grid-cols-4">
          {[
            { k: "27", v: "años en el barrio" },
            { k: "+40", v: "marcas seleccionadas" },
            { k: "24/7", v: "reservas por WhatsApp" },
            { k: "0€", v: "envío en Extremadura" },
          ].map((it, i) => (
            <div
              key={it.v}
              style={{
                opacity: mounted || reduced ? 1 : 0,
                transform:
                  mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 12px, 0)",
                transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${
                  1200 + i * 80
                }ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${1200 + i * 80}ms`,
              }}
            >
              <p className="font-display text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl">
                {it.k}
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
                {it.v}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee inferior de marcas */}
      <div className="relative border-t border-white/10 bg-black/30 py-5">
        <div className="zs-brand-track flex w-max items-center gap-12 whitespace-nowrap text-white/70">
          {[...BRANDS_TICKER, ...BRANDS_TICKER, ...BRANDS_TICKER].map((b, i) => (
            <span
              key={`${b}-${i}`}
              className="inline-flex items-center gap-12 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
            >
              {b}
              <span aria-hidden className="text-zs-red-500">
                ✺
              </span>
            </span>
          ))}
        </div>
      </div>

      <style>{`
        .zs-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(120px);
          opacity: 0.55;
          will-change: transform;
        }
        .zs-blob-1 {
          top: -10%;
          left: -8%;
          width: 48vmax;
          height: 48vmax;
          background: radial-gradient(circle, #1e3a8a 0%, transparent 65%);
          animation: zs-blob-a 22s ease-in-out infinite;
        }
        .zs-blob-2 {
          top: 8%;
          right: -12%;
          width: 42vmax;
          height: 42vmax;
          background: radial-gradient(circle, #dc2626 0%, transparent 65%);
          animation: zs-blob-b 28s ease-in-out infinite;
          opacity: 0.42;
        }
        .zs-blob-3 {
          bottom: -18%;
          left: 22%;
          width: 50vmax;
          height: 50vmax;
          background: radial-gradient(circle, #14225b 0%, transparent 70%);
          animation: zs-blob-c 32s ease-in-out infinite;
          opacity: 0.85;
        }
        .zs-blob-4 {
          top: 38%;
          left: 38%;
          width: 26vmax;
          height: 26vmax;
          background: radial-gradient(circle, #c8da46 0%, transparent 60%);
          animation: zs-blob-d 26s ease-in-out infinite;
          opacity: 0.18;
        }
        @keyframes zs-blob-a {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(8vw, 6vh, 0) scale(1.12); }
        }
        @keyframes zs-blob-b {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-6vw, 8vh, 0) scale(0.92); }
        }
        @keyframes zs-blob-c {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(4vw, -10vh, 0) scale(1.08); }
        }
        @keyframes zs-blob-d {
          0%, 100% { transform: translate3d(0,0,0) scale(1); }
          50% { transform: translate3d(-10vw, 4vh, 0) scale(1.18); }
        }
        .zs-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          background-size: 200px 200px;
        }
        .zs-word {
          transition: transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 900ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes zs-brand-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .zs-brand-track {
          animation: zs-brand-scroll 38s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .zs-blob,
          .zs-brand-track { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
