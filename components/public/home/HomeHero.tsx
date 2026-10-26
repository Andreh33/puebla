"use client";

import {
  useTranslations,
  useTranslatedValue,
  useTranslatedTemplate,
} from "@/components/public/LocaleProvider";
import { LocalizedLink as Link } from "@/components/public/LocalizedLink";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Truck, Sparkles } from "lucide-react";
import { MagneticButton } from "@/components/public/MagneticButton";
import { OpenNowBadge } from "@/components/public/OpenNowBadge";

/**
 * Portada con vídeo local y póster visible desde el HTML inicial.
 * El contenido móvil se muestra sin esperar a la hidratación; el vídeo empieza
 * después de las fuentes y del primer pintado. Conserva la animación de escritorio.
 */

// Marcas que la tienda trabaja de verdad (petición cliente 2026-05-24). Misma
// lista que la marquesina superior del Header y que MARQUEE_BRAND_NAMES en
// public-queries.ts — fuente única de marcas en todo el sitio.
const BRANDS_TICKER = [
  "JOHN SMITH",
  "+8000",
  "JOMA",
  "PUMA",
  "BABOLAT",
  "JOLUVI",
  "DITCHIL",
  "JHAYBER",
] as const;

export function HomeHero() {
  const _translateUi = useTranslations();
  const _translateValue = useTranslatedValue();
  const headlineWords = _translateUi("La temporada que estabas esperando.").split(/\s+/);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setReduced(false);
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // El póster ya está en el HTML; el vídeo de fondo espera a las fuentes y
  // a una oportunidad de pintado para no competir con el texto crítico.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let frame = 0;
    let started = false;

    const tryPlay = () => {
      if (cancelled || !started) return;
      void video.play().catch(() => {
        // El navegador puede bloquear autoplay; el póster sigue visible.
      });
    };

    void Promise.resolve(document.fonts?.ready)
      .catch(() => {
        // Un fallo de fuentes no debe impedir la reproducción del fondo.
      })
      .then(() => {
        if (cancelled) return;
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (cancelled) return;
            video.src = "/videos/hero-basket.mp4";
            started = true;
            video.load();
            tryPlay();
          });
        });
      });

    document.addEventListener("visibilitychange", tryPlay);
    window.addEventListener("focus", tryPlay);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", tryPlay);
      window.removeEventListener("focus", tryPlay);
      if (started) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
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
      aria-label={_translateUi("Zona Sport — bienvenida")}
      className="bg-zs-blue-950 relative isolate overflow-hidden text-white"
      style={{ minHeight: "100svh" }}
    >
      {/* Video hero EN FIXED — se queda de fondo mientras scrolleas por
          encima. Las secciones siguientes del home tienen background
          opaco propio, así que tapan al fixed cuando llegas a ellas.
          Vídeo local de zapatillas y balón de baloncesto en pista terracota. */}
      <div className="fixed inset-0 -z-20 h-screen w-screen" aria-hidden>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/videos/hero-basket.jpg"
          disablePictureInPicture
          disableRemotePlayback
          className="h-full w-full object-cover object-center"
        />
      </div>
      {/* Capa negra al 30% sobre el vídeo, manteniendo la textura editorial. */}
      <div className="fixed inset-0 -z-10 h-screen w-screen" aria-hidden>
        <div className="absolute inset-0 bg-black/30" />
        <div className="zs-grain absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      </div>

      {/* Sticker superior derecho */}
      <div className="pointer-events-none absolute top-24 right-4 z-20 hidden -rotate-6 sm:top-28 sm:right-8 sm:block">
        <div
          className="bg-zs-tennis-300 text-zs-blue-950 flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-bold tracking-[0.22em] uppercase shadow-2xl"
          style={{ boxShadow: "var(--shadow-zs-tennis-glow-lg)" }}
        >
          <Truck className="h-3.5 w-3.5" strokeWidth={2.5} />
          {_translateUi("Envío rápido")}
        </div>
      </div>

      {/* Eyebrow superior + badge "Abierto ahora". El padding-top alto es
          intencional: la pill flotante del Header (top-strip 38px + pill ~64px
          + márgenes) ocupa ~148px desde el top y la imagen del hero queda
          DETRÁS de la pill — el texto tiene que empezar por debajo. */}
      <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 pt-28 sm:px-8 sm:pt-44">
        <p className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.32em] text-white/70 uppercase">
          <span className="inline-block h-px w-8 bg-white/40" />
          {_translateUi("Con cariño desde Puebla de la Calzada")}
        </p>
        <div className="flex items-center gap-3">
          <OpenNowBadge className="text-white" tone="dark" />
          <p className="hidden text-[11px] tracking-[0.32em] text-white/55 uppercase sm:block">
            {_translateUi("Puebla de la Calzada — Badajoz")}
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
          className="font-display leading-[0.86] font-black tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(3rem, 11vw, 10.5rem)" }}
        >
          {headlineWords.map((word, i) => (
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
                    i === headlineWords.length - 1
                      ? "#f97316" /* orange-500 — cambio de rojo a naranja por petición del cliente */
                      : undefined,
                }}
              >
                {_translateValue(word)}
              </span>
            </span>
          ))}
        </h1>

        {/* Sub-copy + CTAs */}
        <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p
              className="zs-hero-critical max-w-2xl text-base leading-relaxed text-balance text-white/85 sm:text-lg"
              style={{
                opacity: mounted || reduced ? 1 : 0,
                transform: mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
                transition:
                  "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 900ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 900ms",
              }}
            >
              {_translateUi(
                "Running, montaña, pádel, fitness y calzado. Atención cara a cara en tienda y envíos a España, Portugal, Francia, Italia y Alemania.",
              )}
            </p>
          </div>

          <div
            className="zs-hero-critical flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end"
            style={{
              opacity: mounted || reduced ? 1 : 0,
              transform: mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 14px, 0)",
              transition:
                "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 1050ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 1050ms",
            }}
          >
            <MagneticButton strength={14}>
              <Link
                href="#catalogo"
                data-cursor="Comprar"
                className="group bg-zs-red-600 hover:bg-zs-red-500 inline-flex h-14 items-center gap-3 rounded-full pr-3 pl-7 text-sm font-bold tracking-[0.06em] text-white uppercase transition-all"
                style={{ boxShadow: "var(--shadow-zs-rojo-glow-lg)" }}
              >
                {_translateUi("Comprar ahora")}
                <span className="text-zs-red-600 flex h-9 w-9 items-center justify-center rounded-full bg-white transition-transform group-hover:translate-x-0.5">
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
                {_translateUi("Explorar marcas")}
              </Link>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Banner "OUTLET" — franja CTA dramática que lleva a /outlet */}
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
          href="/outlet"
          data-cursor="Outlet"
          /* Banner cambiado de rojo a naranja por petición del cliente.
             Glow naranja inline para coherencia (el token --shadow-zs-rojo-glow
             sigue siendo rojo y se sigue usando en otros sitios como el CTA
             principal "Comprar ahora"). */
          className="group relative mt-4 flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-orange-500 via-orange-500 to-orange-800 p-6 text-white transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-12 sm:p-8 lg:p-10"
          style={{ boxShadow: "0 14px 40px -10px rgba(249, 115, 22, 0.55)" }}
        >
          <div
            className="zs-grain pointer-events-none absolute inset-0 -z-10 opacity-30 mix-blend-overlay"
            aria-hidden
          />
          {/* Brillo que barre el banner de lado a lado en bucle. Banda
              diagonal blanca semitransparente que cruza con `zs-shine-sweep`.
              Respeta prefers-reduced-motion (no anima). */}
          <span
            aria-hidden
            className="zs-shine pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          >
            <span className="zs-shine-bar" />
          </span>
          <div className="relative flex flex-1 items-center gap-5 sm:gap-7">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur sm:h-16 sm:w-16">
              <Sparkles className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.32em] text-white/80 uppercase">
                {_translateUi("Outlet")}
              </p>
              <p
                className="font-display mt-1 leading-[0.95] font-black tracking-[-0.03em]"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
              >
                {_translateUi("Outlet en una")}{" "}
                <span className="text-zs-tennis-300">{_translateUi("selección")}</span>
              </p>
              <p className="mt-1 text-sm text-white/80">
                {_translateUi("Textil y calzado de marca a precio reducido · mientras haya stock")}
              </p>
            </div>
          </div>
          <span className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold tracking-[0.06em] text-orange-600 uppercase transition-transform group-hover:translate-x-1">
            {_translateUi("Ver outlet")}
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </span>
        </Link>
      </div>

      {/* Stats fila inferior */}
      <div className="relative mx-auto max-w-[1600px] px-4 pb-12 sm:px-8 sm:pb-16">
        <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
          {[
            { k: "06490", v: "Puebla de la Calzada" },
            { k: "Tienda", v: "atención cercana" },
            { k: "5", v: "países de entrega" },
            { k: "9,80 €", v: "envío internacional" },
          ].map((it, i) => (
            <div
              key={it.v}
              style={{
                opacity: mounted || reduced ? 1 : 0,
                transform: mounted || reduced ? "translate3d(0, 0, 0)" : "translate3d(0, 12px, 0)",
                transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${
                  1300 + i * 80
                }ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${1300 + i * 80}ms`,
              }}
            >
              <p className="font-display text-3xl leading-none font-bold tracking-tight text-white sm:text-4xl">
                {_translateValue(it.k)}
              </p>
              <p className="mt-2 text-[11px] font-medium tracking-[0.22em] text-white/65 uppercase">
                {_translateValue(it.v)}
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
              className="font-display inline-flex items-center gap-12 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
            >
              {_translateValue(b)}
              <span aria-hidden className="text-zs-red-500">
                {_translateUi("✺")}
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
        /* The mobile first paint must not wait for hydration or entrance delays. */
        @media (max-width: 767px), (prefers-reduced-motion: reduce) {
          .zs-word, .zs-hero-critical {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
          }
        }
        @keyframes zs-brand-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        .zs-brand-track {
          animation: zs-brand-scroll 38s linear infinite;
        }
        /* Brillo que barre el banner de ofertas de lado a lado. La banda
           diagonal arranca fuera por la izquierda y cruza hasta salir por
           la derecha, con una pausa entre pasadas. */
        .zs-shine-bar {
          position: absolute;
          top: -50%;
          left: -75%;
          width: 50%;
          height: 200%;
          transform: skewX(-20deg);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.05) 40%,
            rgba(255, 255, 255, 0.45) 50%,
            rgba(255, 255, 255, 0.05) 60%,
            transparent 100%
          );
          animation: zs-shine-sweep 3.8s ease-in-out infinite;
        }
        @keyframes zs-shine-sweep {
          0% { left: -75%; }
          55%, 100% { left: 130%; }
        }
              `}</style>
    </section>
  );
}
