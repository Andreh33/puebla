"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Truck, Sparkles } from "lucide-react";
import { MagneticButton } from "@/components/public/MagneticButton";
import { OpenNowBadge } from "@/components/public/OpenNowBadge";

/**
 * HomeHero — hero monumental sobre UNA SOLA imagen estática vistosa.
 *
 * Decisión tras varias iteraciones:
 *  1. Inicialmente había <video> + <Image> solapada → cliente pidió quitar.
 *  2. Probamos foto Unsplash que resultó ser una nadadora (mal etiquetada).
 *  3. Probamos video Pexels (3192305): hoy apunta a una reunión de oficina.
 *  4. Probamos video Mixkit (32812): pista de atletismo con shorts Adidas.
 *  5. Final: cenital aéreo de pista de atletismo color terracota con
 *     corredores en SILUETA (Unsplash CC0, photo-1502904550040). Sin ropa
 *     identificable → cero riesgo de marcas prohibidas. Atmosférico,
 *     dramático, inequívocamente deportivo.
 *
 * A11y:
 *  - H1 visible con headline real.
 *  - Respeta `prefers-reduced-motion`.
 *  - Contraste AA por overlay 55% + gradientes.
 */

const HEADLINE = ["La", "temporada", "que", "estabas", "esperando."] as const;
const BRANDS_TICKER = [
  "JOHN SMITH",
  "+8000",
  "BULLPADEL",
  "HEAD",
  "NOX",
  "WILSON",
  "ASICS",
  "SALOMON",
  "JOMA",
  "MIZUNO",
] as const;

export function HomeHero() {
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Forzar reproducción del video en CADA visita. Algunos navegadores
  // (Safari iOS, Chrome con autoplay restringido) ignoran el atributo
  // `autoplay` si la pestaña entra en background o el bundle JS termina
  // antes de que se cumplan las heurísticas. Llamamos a play() en el
  // efecto post-hidratación y volvemos a intentar cuando la pestaña
  // vuelve a primer plano. Silenciamos rejections (algunos browsers las
  // lanzan aunque el video sí esté reproduciendo). Se reproduce SIEMPRE,
  // independientemente de prefers-reduced-motion (decisión del cliente).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      void v.play().catch(() => {
        /* ignored — autoplay puede estar bloqueado puntualmente */
      });
    };
    tryPlay();
    document.addEventListener("visibilitychange", tryPlay);
    window.addEventListener("focus", tryPlay);
    return () => {
      document.removeEventListener("visibilitychange", tryPlay);
      window.removeEventListener("focus", tryPlay);
    };
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
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
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
      {/* Video hero EN FIXED — se queda de fondo mientras scrolleas por
          encima. Las secciones siguientes del home tienen background
          opaco propio, así que tapan al fixed cuando llegas a ellas.
          Videezy preview "corredor en puente al atardecer". */}
      <div className="fixed inset-0 -z-20 h-screen w-screen" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-runner-bridge.jpg"
          disablePictureInPicture
          disableRemotePlayback
          className="h-full w-full object-cover object-center"
        >
          <source src="/videos/hero-runner-bridge.mp4" type="video/mp4" />
        </video>
      </div>
      {/* Overlay degradado para legibilidad. También fixed para acompañar al
          video — si solo el video fuera fixed, el overlay scrollearía con la
          sección y dejaría ver el video sin atenuar. */}
      <div className="fixed inset-0 -z-10 h-screen w-screen" aria-hidden>
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-zs-blue-950 via-zs-blue-950/40 to-zs-blue-950/10" />
        <div className="absolute inset-0 bg-gradient-to-br from-zs-blue-950/55 via-transparent to-transparent" />
        <div className="absolute inset-0 mix-blend-overlay opacity-[0.07] zs-grain" />
      </div>

      {/* Sticker superior derecho */}
      <div className="pointer-events-none absolute right-4 top-24 z-20 hidden -rotate-6 sm:right-8 sm:top-28 sm:block">
        <div
          className="flex items-center gap-2 rounded-full bg-zs-tennis-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-zs-blue-950 shadow-2xl"
          style={{ boxShadow: "var(--shadow-zs-tennis-glow-lg)" }}
        >
          <Truck className="h-3.5 w-3.5" strokeWidth={2.5} />
          Envío rápido
        </div>
      </div>

      {/* Eyebrow superior + badge "Abierto ahora". El padding-top alto es
          intencional: la pill flotante del Header (top-strip 38px + pill ~64px
          + márgenes) ocupa ~148px desde el top y la imagen del hero queda
          DETRÁS de la pill — el texto tiene que empezar por debajo. */}
      <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 pt-44 sm:px-8 sm:pt-48 lg:pt-52">
        <p className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.32em] text-white/70">
          <span className="inline-block h-px w-8 bg-white/40" />
          Multimarca · Puebla de la Calzada
        </p>
        <div className="flex items-center gap-3">
          <OpenNowBadge className="text-white" tone="dark" />
          <p className="hidden text-[11px] uppercase tracking-[0.32em] text-white/55 sm:block">
            Est. 1998 — Badajoz
          </p>
        </div>
      </div>

      {/* Titular monumental */}
      <div
        className="relative mx-auto max-w-[1600px] px-4 pt-8 pb-10 sm:px-8 sm:pt-14 lg:pt-20"
        style={{
          transform: reduced
            ? undefined
            : "translate3d(var(--zs-hero-px, 0px), var(--zs-hero-py, 0px), 0)",
          transition: "transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <h1
          className="font-display font-black leading-[0.86] tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(3rem, 11vw, 10.5rem)" }}
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
                    word === "esperando."
                      ? "#f97316" /* orange-500 — cambio de rojo a naranja por petición del cliente */
                      : undefined,
                }}
              >
                {word}
              </span>
            </span>
          ))}
        </h1>

        {/* Sub-copy + CTAs */}
        <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p
              className="max-w-2xl text-balance text-base leading-relaxed text-white/85 sm:text-lg"
              style={{
                opacity: mounted || reduced ? 1 : 0,
                transform:
                  mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
                transition:
                  "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 900ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 900ms",
              }}
            >
              Running, montaña, pádel, fitness y calzado. Más de 40 marcas
              técnicas y urbanas, atención cara a cara en tienda y envío 24/48 h
              en toda Extremadura.
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
                data-cursor="Comprar"
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-zs-red-600 pl-7 pr-3 text-sm font-bold uppercase tracking-[0.06em] text-white transition-all hover:bg-zs-red-500"
                style={{ boxShadow: "var(--shadow-zs-rojo-glow-lg)" }}
              >
                Comprar ahora
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zs-red-600 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton strength={10}>
              <Link
                href="/marcas"
                data-cursor="Marcas"
                className="inline-flex h-14 items-center gap-2.5 rounded-full border border-white/30 bg-white/[0.06] px-7 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:border-white/60 hover:bg-white/[0.12]"
              >
                Explorar marcas
              </Link>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Banner "OFERTAS DE LA SEMANA" — franja CTA dramática */}
      <div
        className="relative mx-auto max-w-[1600px] px-4 pb-12 sm:px-8 sm:pb-16"
        style={{
          opacity: mounted || reduced ? 1 : 0,
          transform: mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 18px, 0)",
          transition:
            "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) 1200ms",
        }}
      >
        <Link
          href="#catalogo"
          data-cursor="Ofertas"
          /* Banner cambiado de rojo a naranja por petición del cliente.
             Glow naranja inline para coherencia (el token --shadow-zs-rojo-glow
             sigue siendo rojo y se sigue usando en otros sitios como el CTA
             principal "Comprar ahora"). */
          className="group relative mt-4 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-orange-500 via-orange-500 to-orange-800 p-6 text-white transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-12 sm:p-8 lg:p-10"
          style={{ boxShadow: "0 14px 40px -10px rgba(249, 115, 22, 0.55)" }}
        >
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-overlay zs-grain" aria-hidden />
          <div className="flex flex-1 items-center gap-5 sm:gap-7">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur sm:h-16 sm:w-16">
              <Sparkles className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/80">
                Ofertas de la semana
              </p>
              <p
                className="mt-1 font-display font-black leading-[0.95] tracking-[-0.03em]"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
              >
                Hasta <span className="text-zs-tennis-300">-30%</span> en una selección
              </p>
              <p className="mt-1 text-sm text-white/80">
                Running, montaña y calzado urbano · termina el domingo
              </p>
            </div>
          </div>
          <span className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold uppercase tracking-[0.06em] text-orange-600 transition-transform group-hover:translate-x-1">
            Ver ofertas
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </Link>
      </div>

      {/* Stats fila inferior */}
      <div className="relative mx-auto max-w-[1600px] px-4 pb-12 sm:px-8 sm:pb-16">
        <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
          {[
            { k: "27", v: "años en el barrio" },
            { k: "+40", v: "marcas seleccionadas" },
            { k: "24/48h", v: "envío Península" },
            { k: "0€", v: "envío Extremadura" },
          ].map((it, i) => (
            <div
              key={it.v}
              style={{
                opacity: mounted || reduced ? 1 : 0,
                transform:
                  mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 12px, 0)",
                transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${
                  1300 + i * 80
                }ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${1300 + i * 80}ms`,
              }}
            >
              <p className="font-display text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl">
                {it.k}
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/65">
                {it.v}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee inferior de marcas */}
      <div className="relative overflow-hidden border-t border-white/10 bg-black/45 py-5">
        <div className="zs-brand-track flex w-max items-center gap-12 whitespace-nowrap text-white/75">
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
          .zs-brand-track { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
