"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Mountain, MapPin, MessageCircle, Compass } from "lucide-react";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import { SceneLoader } from "./SceneLoader";
import { StaticHeroFallback } from "./StaticHeroFallback";

const ScrollSceneCanvas = dynamic(
  () => import("./ScrollSceneCanvas").then((m) => m.ScrollSceneCanvas),
  { ssr: false, loading: () => null },
);

/**
 * Experiencia scroll-driven inspirada en merrell.joffreyspitzer.com — adaptada
 * a Zona Sport con la zapatilla del cliente (public/3d/zapatilla.glb) +
 * rocas procedurales que se abren + fachada estilizada de la tienda.
 *
 * Estructura:
 *  - Contenedor sticky-canvas: la escena 3D queda fija mientras hacemos scroll
 *    por dentro del contenedor.
 *  - Overlay de pantallas a la derecha con titulares que avanzan con el scroll.
 *  - Altura total = N pantallas * 100vh. Cada pantalla mapea a un tramo de
 *    `scrollProgress` 0..1.
 *
 * Performance:
 *  - El canvas es dinámicamente importado (ssr:false) → no bloquea el TTFB.
 *  - `frameloop` se pausa cuando el canvas no es visible.
 *  - En `prefers-reduced-motion` o mobile estrecho, renderizamos fallback
 *    estático.
 */
type ScrollSceneProps = {
  /**
   * Render alternativo cuando no hay WebGL, hay prefers-reduced-motion, o
   * todavía no estamos hidratados. Si no se pasa, cae al StaticHeroFallback
   * histórico (foto plana). El home pasa <HomeHero /> para evitar el viejo
   * fallback "WordPress-y".
   */
  fallback?: ReactNode;
};

export function ScrollScene({ fallback }: ScrollSceneProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef(0);
  const [enabled, setEnabled] = useState(true);
  const [low, setLow] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  // Estado de carga del Canvas 3D (drei useProgress + timeout de seguridad).
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // Para evitar hydration mismatch, el primer render (server + client) NO
  // accede a window. Renderizamos StaticHeroFallback hasta que hayamos
  // comprobado WebGL en useEffect. Si OK → swap al canvas 3D.
  const [hydrated, setHydrated] = useState(false);
  const [webglOk, setWebglOk] = useState(false);

  useEffect(() => {
    let ok = false;
    try {
      const c = document.createElement("canvas");
      const gl =
        c.getContext("webgl2") ||
        c.getContext("webgl") ||
        (c.getContext("experimental-webgl") as WebGLRenderingContext | null);
      ok = !!gl;
    } catch {
      ok = false;
    }
    setWebglOk(ok);
    setHydrated(true);
  }, []);

  // El canvas 3D se monta justo después de la hidratación. El bundle Three+drei
  // se descarga en paralelo a la home; mientras tanto el SceneLoader es visible.
  const [shouldMountCanvas, setShouldMountCanvas] = useState(false);
  useEffect(() => {
    if (!hydrated || !webglOk) return;
    // Pequeño delay para no competir con LCP (CSS+fonts), pero garantizado.
    const t = setTimeout(() => setShouldMountCanvas(true), 120);
    return () => clearTimeout(t);
  }, [hydrated, webglOk]);

  // Failsafe: si tras 8 s no terminó (red lenta, GPU lenta, asset corrupto),
  // ocultamos el loader igualmente para no bloquear al usuario.
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => setLoaded(true), 8_000);
    return () => clearTimeout(t);
  }, [enabled]);

  // Detección de capabilities en cliente.
  // Si el usuario tiene `prefers-reduced-motion` activado (común en Windows con
  // "animaciones en Windows" off), NO desactivamos la escena: la mantenemos
  // pero en modo `low` (sin rocas / partículas / cámara cinemática).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    const lowCpu =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) < 4;
    if (narrow || lowCpu || reduced) setLow(true);
  }, []);

  // Calcula scrollProgress según la posición del contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const total = el.offsetHeight - viewport; // scroll efectivo dentro
      if (total <= 0) return;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = scrolled / total;
      scrollProgress.current = p;

      const panel = Math.min(3, Math.floor(p * 4));
      setActivePanel((prev) => (prev === panel ? prev : panel));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const panels = [
    {
      eyebrow: "Tu deporte, tu sitio",
      title: "Hecho para correr en Extremadura",
      copy: "Multimarca en running, trail y urban. Te asesoramos en tienda como llevamos haciéndolo años: cara a cara, sin postureo.",
      icon: Compass,
      cta: { label: "Ver running", href: "/hombre/calzado?tipo=running" },
    },
    {
      eyebrow: "Más allá del asfalto",
      title: "Las rocas se abren, la montaña aparece",
      copy: "+8000 para trekking, escalada y vías ferratas. Suelas que pegan, mochilas que aguantan, cortavientos pensados para el viento de la sierra.",
      icon: Mountain,
      cta: { label: "Ver montaña", href: "/hombre/calzado?tipo=trail" },
    },
    {
      eyebrow: "Mismo barrio, otra liga",
      title: "Te esperamos en C. Silos, 3",
      copy: "Puebla de la Calzada, en pleno centro. A 5 minutos de Montijo, 15 de Mérida y 30 de Badajoz. Si vienes de cerca, te lo apartamos por WhatsApp.",
      icon: MapPin,
      cta: { label: "Cómo llegar", href: "/contacto" },
    },
    {
      eyebrow: "Empieza",
      title: "Entra al catálogo y elige lo tuyo",
      copy: "Sigue bajando o pulsa aquí. Tienes el catálogo completo abajo: filtros por marca, color, talla y precio. Reservas por WhatsApp con un clic.",
      icon: MessageCircle,
      cta: { label: "Ver catálogo completo", href: "#catalogo" },
    },
  ];

  // Mientras no hayamos hidratado, o si está deshabilitado / sin WebGL:
  // hero estático. Esto evita el hydration mismatch (server + primer render
  // del cliente devuelven exactamente lo mismo).
  // Fallback estático solo si WebGL no está disponible o aún no hidratamos.
  // `enabled` se conserva por si el usuario lo desactiva manualmente desde
  // ajustes (no implementado todavía pero el flag está listo).
  if (!hydrated || !enabled || !webglOk) {
    return <>{fallback ?? <StaticHeroFallback />}</>;
  }

  return (
    <section
      ref={containerRef}
      className="relative bg-zs-blue-950 text-white"
      style={{ height: "400vh" }}
      aria-label="Recorrido visual por Zona Sport"
    >
      {/* H1 semántico oculto para SEO/A11y — los paneles 3D usan h2 visibles */}
      <h1 className="sr-only">
        Zona Sport — tienda de deportes en Puebla de la Calzada (Badajoz)
      </h1>

      {/* Canvas sticky 3D — lazy montado tras 1ª interacción/scroll/1500ms */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-zs-blue-950">
        {shouldMountCanvas && (
          <ScrollSceneCanvas
            scrollProgress={scrollProgress}
            low={low}
            onLoadingChange={({ progress, loaded: isLoaded }) => {
              setLoadProgress(progress);
              if (isLoaded) setLoaded(true);
            }}
          />
        )}

        {/* Loader visible mientras descarga + parsea el .glb (1.6 MB) */}
        <SceneLoader visible={!loaded} progress={loadProgress} />

        {/* Overlay con paneles superpuestos */}
        <div className="pointer-events-none absolute inset-0 flex items-center">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-end px-4 sm:px-8">
            <div className="pointer-events-auto w-full max-w-lg">
              {panels.map((p, i) => {
                const Icon = p.icon;
                const isActive = activePanel === i;
                return (
                  <article
                    key={i}
                    aria-hidden={!isActive}
                    className={[
                      "absolute right-4 top-1/2 max-w-lg -translate-y-1/2 sm:right-8",
                      "transition-all duration-700 ease-out",
                      isActive
                        ? "translate-x-0 opacity-100"
                        : "pointer-events-none translate-x-6 opacity-0",
                    ].join(" ")}
                    style={{ willChange: "transform, opacity" }}
                  >
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-md sm:p-8">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zs-tennis-300">
                        <Icon className="h-3.5 w-3.5" />
                        {p.eyebrow}
                      </span>
                      <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                        {p.title}
                      </h2>
                      <p className="mt-3 max-w-md text-balance text-sm leading-relaxed text-white/80 sm:text-base">
                        {p.copy}
                      </p>
                      <div className="mt-6">
                        {p.cta.href.startsWith("#") || p.cta.href.startsWith("/") ? (
                          <Link
                            href={p.cta.href}
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-zs-blue-900 transition hover:bg-zs-surface"
                          >
                            {p.cta.label} <ArrowRight className="h-4 w-4" />
                          </Link>
                        ) : (
                          <a
                            href={p.cta.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-zs-blue-900 transition hover:bg-zs-surface"
                          >
                            {p.cta.label} <ArrowRight className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {panels.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={[
                "h-1 w-8 rounded-full transition-colors duration-500",
                activePanel === i ? "bg-zs-tennis-300" : "bg-white/20",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Hint scroll inicial */}
        <div
          className={[
            "pointer-events-none absolute bottom-3 right-1/2 hidden translate-x-1/2 text-[11px] uppercase tracking-[0.2em] text-white/60 transition-opacity duration-500 sm:block",
            activePanel === 0 ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          Desliza para descubrir
        </div>
      </div>
    </section>
  );
}
