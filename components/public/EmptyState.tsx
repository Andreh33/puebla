"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type EmptyStateVariant =
  | "no-results"
  | "cart-empty"
  | "no-products"
  | "no-leads"
  | "no-posts";

type Props = {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  cta?: { label: string; href: string } | null;
  /** Acción secundaria (ej. "Limpiar filtros"). */
  secondaryCta?: { label: string; onClick?: () => void; href?: string } | null;
  className?: string;
};

const DEFAULTS: Record<EmptyStateVariant, { title: string; description: string }> = {
  "no-results": {
    title: "Sin resultados",
    description: "Prueba con otra palabra clave o relaja los filtros aplicados.",
  },
  "cart-empty": {
    title: "Tu selección está vacía",
    description: "Añade productos desde el catálogo y te asesoramos por WhatsApp.",
  },
  "no-products": {
    title: "No hay productos con esos filtros",
    description: "Quita algún filtro o explora otra categoría para inspirarte.",
  },
  "no-leads": {
    title: "Sin solicitudes todavía",
    description: "Cuando alguien te contacte, las verás aquí.",
  },
  "no-posts": {
    title: "Aún no hay artículos",
    description: "Estamos preparando contenido fresco. Vuelve pronto.",
  },
};

/**
 * EmptyState — estado vacío ilustrado, con SVG inline elegante,
 * título, descripción y CTA opcional. Animación de entrada sutil.
 */
export function EmptyState({
  variant,
  title,
  description,
  cta,
  secondaryCta,
  className,
}: Props) {
  const fallback = DEFAULTS[variant];
  return (
    <div
      role="status"
      className={cn(
        "animate-fade-in-up flex flex-col items-center justify-center gap-4 rounded-2xl border border-zs-border bg-white px-6 py-12 text-center",
        className,
      )}
    >
      <Illustration variant={variant} />
      <div className="max-w-md space-y-1.5">
        <h3 className="font-display text-xl font-bold text-zs-blue-900">
          {title ?? fallback.title}
        </h3>
        <p className="text-sm text-zs-muted">{description ?? fallback.description}</p>
      </div>
      {(cta || secondaryCta) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {cta && (
            <Link
              href={cta.href}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zs-blue-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800 active:bg-zs-blue-950"
            >
              {cta.label}
            </Link>
          )}
          {secondaryCta &&
            (secondaryCta.href ? (
              <Link
                href={secondaryCta.href}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-5 text-sm font-semibold text-zs-ink transition hover:bg-zs-surface"
              >
                {secondaryCta.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryCta.onClick}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-5 text-sm font-semibold text-zs-ink transition hover:bg-zs-surface"
              >
                {secondaryCta.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Ilustraciones                                */
/* -------------------------------------------------------------------------- */

function Illustration({ variant }: { variant: EmptyStateVariant }) {
  const common = "h-32 w-32 sm:h-36 sm:w-36";
  switch (variant) {
    case "no-results":
      return <SearchIllustration className={common} />;
    case "cart-empty":
      return <CartIllustration className={common} />;
    case "no-products":
      return <BallIllustration className={common} />;
    case "no-leads":
      return <MailIllustration className={common} />;
    case "no-posts":
      return <NewsIllustration className={common} />;
  }
}

function SearchIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="zs-search-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff3fe" />
          <stop offset="100%" stopColor="#dbe5fd" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="72" fill="url(#zs-search-bg)" />
      {/* Lupa */}
      <circle
        cx="68"
        cy="68"
        r="28"
        stroke="#14225b"
        strokeWidth="6"
        fill="white"
      />
      <line
        x1="90"
        y1="90"
        x2="112"
        y2="112"
        stroke="#14225b"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Pelota tenis dentro */}
      <circle cx="68" cy="68" r="18" fill="#c8da46" />
      <path
        d="M52 64c6 4 14 4 22 0M52 76c6-4 14-4 22 0"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Sparkles */}
      <circle cx="118" cy="42" r="3" fill="#dc2626" />
      <circle cx="40" cy="44" r="2" fill="#14225b" opacity="0.4" />
      <circle cx="120" cy="80" r="2" fill="#14225b" opacity="0.4" />
    </svg>
  );
}

function CartIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="zs-cart-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff3fe" />
          <stop offset="100%" stopColor="#f3f8c2" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="72" fill="url(#zs-cart-bg)" />
      {/* Bolsa */}
      <path
        d="M50 56h60l-6 64a8 8 0 0 1-8 7H64a8 8 0 0 1-8-7L50 56z"
        fill="white"
        stroke="#14225b"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M64 56a16 16 0 0 1 32 0"
        stroke="#14225b"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Asterisco corazón mini */}
      <path
        d="M80 88c-3-6-12-4-12 3 0 6 12 14 12 14s12-8 12-14c0-7-9-9-12-3z"
        fill="#dc2626"
      />
    </svg>
  );
}

function BallIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="zs-ball-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff3fe" />
          <stop offset="100%" stopColor="#dbe5fd" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="72" fill="url(#zs-ball-bg)" />
      {/* Balón fútbol */}
      <circle cx="80" cy="80" r="40" fill="white" stroke="#14225b" strokeWidth="4" />
      <path
        d="M80 50l-12 10v14l12 10 12-10V60l-12-10z"
        fill="#14225b"
      />
      <path
        d="M80 50v-8M68 60l-12-4M92 60l12-4M68 84l-10 8M92 84l10 8M80 104v8"
        stroke="#14225b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Pelota tenis pequeña */}
      <circle cx="124" cy="44" r="12" fill="#c8da46" stroke="white" strokeWidth="2" />
      <path
        d="M114 44c4 3 16 3 20 0"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function MailIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="zs-mail-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff3fe" />
          <stop offset="100%" stopColor="#fee2e2" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="72" fill="url(#zs-mail-bg)" />
      <rect
        x="40"
        y="56"
        width="80"
        height="56"
        rx="6"
        fill="white"
        stroke="#14225b"
        strokeWidth="4"
      />
      <path
        d="M40 60l40 30 40-30"
        stroke="#14225b"
        strokeWidth="4"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="118" cy="54" r="8" fill="#dc2626" />
    </svg>
  );
}

function NewsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 160" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="zs-news-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff3fe" />
          <stop offset="100%" stopColor="#dbe5fd" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="72" fill="url(#zs-news-bg)" />
      <rect
        x="44"
        y="46"
        width="72"
        height="76"
        rx="6"
        fill="white"
        stroke="#14225b"
        strokeWidth="4"
      />
      <line x1="56" y1="62" x2="104" y2="62" stroke="#14225b" strokeWidth="4" strokeLinecap="round" />
      <line x1="56" y1="78" x2="104" y2="78" stroke="#14225b" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="56" y1="90" x2="92" y2="90" stroke="#14225b" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <rect x="56" y="100" width="48" height="16" rx="3" fill="#c8da46" opacity="0.7" />
    </svg>
  );
}
