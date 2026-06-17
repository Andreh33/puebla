"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { MagneticButton } from "@/components/public/MagneticButton";
import { WhatsAppMessages } from "@/lib/whatsapp";

type Props = {
  primaryHref: string;
};

const TYPED_PHRASES = [
  "Running en Puebla.",
  "Pádel en Mérida.",
  "Montaña en Badajoz.",
  "Fitness, donde quieras.",
];

/**
 * HeroLuxe — versión editorial-grade del hero:
 *  - Parallax del fondo (mousemove + scroll)
 *  - H1 con split por palabras y stagger (GSAP, cargado dinámicamente)
 *  - Subtítulo con typewriter cíclico
 *  - Pelota de tenis decorativa con bounce loop
 *  - CTAs con magnetic effect
 *  - Sello "Visítanos" expandible en esquina inferior derecha
 */
export function HeroLuxe({ primaryHref }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const blobARef = useRef<HTMLDivElement | null>(null);
  const blobBRef = useRef<HTMLDivElement | null>(null);
  const ballRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  // Typewriter
  const [typed, setTyped] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const reduce = false;
    if (reduce) {
      setTyped(TYPED_PHRASES[0]!);
      return;
    }
    const full = TYPED_PHRASES[phraseIdx % TYPED_PHRASES.length]!;
    const isFull = typed === full;
    const isEmpty = typed === "";

    let delay = deleting ? 30 : 55;
    if (isFull && !deleting) delay = 1800;
    if (isEmpty && deleting) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % TYPED_PHRASES.length);
      return;
    }

    const t = window.setTimeout(() => {
      if (deleting) {
        setTyped(full.slice(0, Math.max(0, typed.length - 1)));
      } else {
        if (isFull) setDeleting(true);
        else setTyped(full.slice(0, typed.length + 1));
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [typed, deleting, phraseIdx]);

  // GSAP split words + ball bounce + parallax
  useEffect(() => {
    const reduce = false;
    if (reduce) return;
    let killed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const { gsap } = await import("gsap");
      if (killed) return;

      // Split words del H1
      const h1 = titleRef.current;
      if (h1) {
        const text = h1.textContent ?? "";
        h1.innerHTML = text
          .split(/\s+/)
          .map((w) => `<span class="zs-hero-word inline-block will-change-transform" style="opacity:0">${w}</span>`)
          .join(" ");
        const words = h1.querySelectorAll<HTMLSpanElement>(".zs-hero-word");
        gsap.fromTo(
          words,
          { yPercent: 60, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.05,
            ease: "power3.out",
            delay: 0.15,
          },
        );
      }

      // Ball bounce loop
      const ball = ballRef.current;
      if (ball) {
        gsap.to(ball, {
          y: -22,
          rotation: 18,
          duration: 1.2,
          repeat: -1,
          yoyo: true,
          ease: "power2.inOut",
        });
      }

      // Parallax: mousemove
      const section = sectionRef.current;
      if (section) {
        const onMove = (e: MouseEvent) => {
          const rect = section.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(blobARef.current, { x: x * 40, y: y * 30, duration: 0.8, ease: "power2.out" });
          gsap.to(blobBRef.current, { x: x * -55, y: y * -25, duration: 0.8, ease: "power2.out" });
          gsap.to(ballRef.current, { x: x * 18, duration: 0.8, ease: "power2.out" });
        };
        section.addEventListener("mousemove", onMove);
        cleanup = () => section.removeEventListener("mousemove", onMove);
      }
    })();

    return () => {
      killed = true;
      cleanup?.();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="zs-hero relative isolate overflow-hidden bg-zs-gradient text-white"
    >
      {/* Blobs parallax */}
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <div
          ref={blobARef}
          className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-zs-tennis-500 blur-3xl"
        />
        <div
          ref={blobBRef}
          className="absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-zs-red-500 blur-3xl"
        />
      </div>

      {/* Grain sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Tienda local · Compra online
          </p>
          <h1
            ref={titleRef}
            className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Todo lo que necesitas para tu deporte, hecho en tu barrio.
          </h1>
          <p className="min-h-[3.5rem] max-w-xl text-balance text-base text-white/85 sm:text-lg">
            <span aria-live="polite">{typed}</span>
            <span aria-hidden className="zs-caret ml-0.5 inline-block w-[2px] bg-white/80 align-baseline">
              &nbsp;
            </span>
            <br />
            Multimarca, atención cercana y consejo experto.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <MagneticButton>
              <Button
                asChild
                size="lg"
                variant="default"
                className="bg-white text-zs-blue-900 hover:bg-zs-surface"
              >
                <Link href={primaryHref} data-cursor="Catálogo">
                  Ver catálogo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </MagneticButton>
            <MagneticButton>
              <WhatsAppButton
                message={WhatsAppMessages.generic()}
                label="Pregúntanos por WhatsApp"
              />
            </MagneticButton>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-white/10 p-10 backdrop-blur">
            <Image
              src="/logo.webp"
              alt=""
              width={540}
              height={372}
              aria-hidden
              className="absolute inset-0 m-auto h-2/3 w-2/3 object-contain opacity-90"
            />
            {/* Pelota de tenis */}
            <div
              ref={ballRef}
              aria-hidden
              className="absolute -bottom-6 -right-6 h-24 w-24 will-change-transform"
            >
              <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-xl">
                <defs>
                  <radialGradient id="ball" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#eaf589" />
                    <stop offset="100%" stopColor="#a8bb34" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="46" fill="url(#ball)" />
                <path
                  d="M 8 50 Q 50 18 92 50"
                  stroke="#fff"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.85"
                />
                <path
                  d="M 8 50 Q 50 82 92 50"
                  stroke="#fff"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.85"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Sello visítanos */}
      <VisitanosSeal />

      <style>{`
        @keyframes zs-caret-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        .zs-caret { animation: zs-caret-blink 1s steps(1) infinite; height: 1em; }
      `}</style>
    </section>
  );
}

function VisitanosSeal() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 hidden sm:block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="pointer-events-auto group relative flex h-24 w-24 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur transition hover:bg-white/20"
        aria-label="Visítanos en Puebla de la Calzada"
        data-cursor="Visítanos"
      >
        <span className="absolute inset-0 animate-[spin_18s_linear_infinite]">
          <SealRing text="VISÍTANOS · PUEBLA DE LA CALZADA · " />
        </span>
        <span className="text-base">→</span>
      </button>
      <div
        className={`pointer-events-auto absolute bottom-28 right-0 w-64 rounded-2xl border border-white/20 bg-zs-blue-900/95 p-4 text-white shadow-xl backdrop-blur transition-all ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Tienda física</p>
        <p className="mt-1 text-sm font-bold">C. Silos, 3 · Puebla de la Calzada</p>
        <p className="mt-2 text-xs text-white/80">L–V 10–14h / 17–20h · S 10–14h</p>
        <a
          href="https://maps.google.com/?q=C.+Silos,+3,+06490+Puebla+de+la+Calzada,+Badajoz"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zs-tennis-300 hover:text-zs-tennis-100"
        >
          Cómo llegar <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function SealRing({ text }: { text: string }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <defs>
        <path id="zs-seal-path" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
      </defs>
      <text fill="currentColor" fontSize="10" letterSpacing="2">
        <textPath href="#zs-seal-path">{text.repeat(2)}</textPath>
      </text>
    </svg>
  );
}
