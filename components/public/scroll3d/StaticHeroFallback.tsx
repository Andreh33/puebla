import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, MessageCircle, Mountain, Compass } from "lucide-react";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";

/**
 * Hero estático para navegadores sin WebGL o con `prefers-reduced-motion`.
 * Reemplaza al ScrollSceneCanvas conservando el look-and-feel editorial.
 *
 * Composición:
 *   - Fondo zs-blue-950 con gradient acentos tenis/red.
 *   - Una imagen real de zapatilla del demo (bota +8000) en grande a la izq.
 *   - Tres tiles narrativos a la derecha (Running / Montaña / Tienda).
 *   - CTA principal a /running y WhatsApp.
 *
 * Sin Three.js, sin Lenis, 100% CSS. Funciona en cualquier navegador.
 */
export function StaticHeroFallback() {
  return (
    <section className="relative overflow-hidden bg-zs-blue-950 text-white">
      {/* Acentos de color en el fondo */}
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden>
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-zs-tennis-500 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-zs-red-500 blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-zs-blue-700 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:py-28">
        {/* Imagen producto */}
        <div className="relative">
          <div className="absolute -inset-6 rounded-3xl bg-white/5 blur-2xl" aria-hidden />
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <Image
              src="/sample-products/bota-alta-8000-tovir-negro.webp"
              alt="Bota alta +8000 Tovir — selección Zona Sport"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-contain p-10 sm:p-14"
            />
            {/* Etiqueta superpuesta */}
            <div className="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zs-tennis-300 backdrop-blur">
              <Compass className="h-3.5 w-3.5" />
              Tu deporte, tu sitio
            </div>
          </div>
        </div>

        {/* Contenido editorial */}
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
            Multimarca · Puebla de la Calzada
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Hecho para correr en Extremadura.
          </h1>
          <p className="max-w-xl text-balance text-base leading-relaxed text-white/85 sm:text-lg">
            Running, pádel, montaña y calzado. Te asesoramos en tienda como llevamos haciéndolo
            años: cara a cara, sin postureo. Reservas por WhatsApp con un clic.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/running"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-zs-blue-900 shadow-lg shadow-black/30 transition hover:bg-zs-surface"
            >
              Ver catálogo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappUrl(WhatsAppMessages.generic())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-semibold text-white shadow-lg shadow-black/30 transition hover:bg-[#1ebe57]"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </div>

          {/* Tiles narrativos */}
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Tile icon={Compass} title="Running" copy="Trail y urban" href="/running" />
            <Tile icon={Mountain} title="Montaña" copy="+8000 trekking" href="/montana" />
            <Tile icon={MapPin} title="Tienda" copy="C. Silos, 3" href="/contacto" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({
  icon: Icon,
  title,
  copy,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  copy: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur transition hover:border-white/30 hover:bg-white/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-zs-tennis-300">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-white/65">{copy}</p>
      </div>
      <ArrowRight className="ml-auto h-4 w-4 self-center text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
    </Link>
  );
}
