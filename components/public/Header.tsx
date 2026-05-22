"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, MessageCircle, Menu, X, ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import { SearchCommand } from "./SearchCommand";
import { CartIcon } from "./CartIcon";
import { MegaMenu, MegaMenuMobile } from "./MegaMenu";
import type { MegaMenuKey } from "@/lib/menu/mega-menu";

/**
 * Header estilo "pill flotante" — inspirado en latech (la forma, no los
 * colores). Estructura:
 *   1. Top strip oscuro con marquesina infinita de frases (ZS azul + texto
 *      blanco, separadores ✺ en rojo).
 *   2. Pill blanca flotante centrada con sombra azul corporativa. Dentro:
 *      logo (izq) · tabs de género + sub-nav de deportes (centro) · acciones
 *      (der: search, WhatsApp, carrito, CTA "Comprar" gradiente rojo).
 *   3. Mega-menú desktop full-width debajo de la pill (heredado).
 *   4. Drawer móvil debajo, también flotante en pill rounded-3xl.
 *
 * Cambios respecto al header anterior:
 *  - Pasa de `sticky border-b full-width` a `fixed` con pill rounded-full.
 *  - La marquesina antes vivía en el medio del home (PhrasesMarquee), ahora
 *    abre el header como top strip — más cercano al estilo del referente.
 *  - Añade `<div>` spacer al final para empujar el contenido (el contenedor
 *    es fixed y deja un hueco si no se compensa).
 *
 * A11y: focus visible, aria-labels intactos, mega-menú con aria-expanded
 * sobre los tabs trigger. Mobile drawer mantiene animaciones suaves.
 */

// Enlaces secundarios del drawer móvil. Antes incluía un sub-nav de deportes
// (Running/Pádel/Montaña/Calzado) que ya NO existe como categorías tras el
// Bloque 2; reducido a enlaces de utilidad. Los hubs (Mujer/Hombre/Niño/Niña)
// viven en GENDER_TABS y Accesorios en SUBTABS_NINOS.
const SPORT_NAV: Array<{ label: string; href: string }> = [
  { label: "Marcas", href: "/marcas" },
  { label: "Blog", href: "/blog" },
  { label: "Contacto", href: "/contacto" },
];

/**
 * Enlaces a páginas (NO son tienda). Aparecen tras un separador en la
 * pill desktop, para distinguir visualmente «aquí compras» (género) de
 * «aquí informas» (contacto, blog, instalar app).
 */
const PAGE_NAV: Array<{ label: string; href: string }> = [
  { label: "Contacto", href: "/contacto" },
  { label: "Blog", href: "/blog" },
];

/**
 * Sub-tab simple: Accesorios. Niño y Niña ahora son tabs con mega-menú
 * (viven en GENDER_TABS). Accesorios sigue como link directo porque no
 * tiene desplegable propio — lleva a la categoría root.
 */
const SUBTABS_NINOS: Array<{ label: string; href: string }> = [
  { label: "Accesorios", href: "/accesorios" },
];

const GENDER_TABS: Array<{
  key: MegaMenuKey;
  label: string;
  href: string;
  match: (path: string) => boolean;
}> = [
  {
    key: "mujer",
    label: "Mujer",
    href: "/mujer",
    match: (p) => p === "/mujer" || p.startsWith("/mujer/"),
  },
  {
    key: "hombre",
    label: "Hombre",
    href: "/hombre",
    match: (p) => p === "/hombre" || p.startsWith("/hombre/"),
  },
  // Niño y Niña: tabs con su propio mega-menú (ROPA/CALZADO/ACCESORIOS), igual
  // que Mujer/Hombre. Desde Bloque 4 son hubs reales (/nino, /nina); /ninos
  // redirige 308 a /nino, por eso el match ya no contempla "/ninos".
  {
    key: "nino",
    label: "Niño",
    href: "/nino",
    match: (p) => p === "/nino" || p.startsWith("/nino/"),
  },
  {
    key: "nina",
    label: "Niña",
    href: "/nina",
    match: (p) => p === "/nina" || p.startsWith("/nina/"),
  },
];

/** Frases para la marquesina superior. Mismas que el viejo PhrasesMarquee. */
const TICKER_PHRASES = [
  "Desde Puebla de la Calzada hasta cualquier parte del mundo",
  "Años de calidad y trato cercano",
  "John Smith · +8000 · Joma · Bullpadel · Nox · Salomon · Head · Wilson",
  "Atendemos por WhatsApp · Recogida en tienda",
  "Pádel, running, montaña, fitness — todo en una sola tienda",
  "Asesoramiento real, no postureo",
] as const;

// Delay generoso al cerrar el mega-menú: da tiempo a cruzar el gap entre
// la pill flotante y el panel sin que se cierre debajo del cursor. El
// puente invisible del MegaMenu cubre el hueco; este margen es el colchón.
const MEGA_CLOSE_DELAY_MS = 260;

export function Header() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaKey, setMegaKey] = useState<MegaMenuKey | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<MegaMenuKey | null>(null);
  const lastY = useRef(0);
  const lastDir = useRef<"up" | "down">("up");
  const closeTimer = useRef<number | null>(null);
  const triggerIdPrefix = useId();

  useEffect(() => {
    let ticking = false;
    const apply = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const delta = y - lastY.current;
      const dir: "up" | "down" = delta > 0 ? "down" : "up";

      if (Math.abs(delta) > 6) {
        if (dir === "down" && y > 96 && lastDir.current !== "down") {
          setHidden(true);
          lastDir.current = "down";
        } else if (dir === "up" && lastDir.current !== "up") {
          setHidden(false);
          lastDir.current = "up";
        }
        lastY.current = y;
      }
      if (y <= 8) setHidden(false);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(apply);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMegaKey(null);
    setMobileExpanded(null);
  }, [pathname]);

  useEffect(() => {
    if (hidden) setMegaKey(null);
  }, [hidden]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      setMegaKey(null);
      closeTimer.current = null;
    }, MEGA_CLOSE_DELAY_MS);
  }, [cancelClose]);

  const openMega = useCallback(
    (key: MegaMenuKey) => {
      cancelClose();
      setMegaKey(key);
    },
    [cancelClose],
  );

  const closeMega = useCallback(() => {
    cancelClose();
    setMegaKey(null);
  }, [cancelClose]);

  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (megaKey === null) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inNav = navRef.current?.contains(target) ?? false;
      // El panel cuelga FUERA de navRef (es hermano de la pill). Sin contemplarlo,
      // pulsar una opción del panel cierra el menú en `mousedown` y desmonta el
      // enlace ANTES de que el click navegue → el enlace no lleva a ningún sitio.
      const inPanel = document.querySelector('[role="menu"]')?.contains(target) ?? false;
      if (!inNav && !inPanel) {
        setMegaKey(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [megaKey]);

  // Cierre del mega-menú por POSICIÓN del cursor. Mientras hay un tab abierto,
  // seguimos el puntero: si está dentro de la "zona caliente" (pill + el hueco
  // + el panel) lo mantenemos abierto; si sale, programamos el cierre. Es
  // robusto frente a los problemas de mouseenter/mouseleave con el panel
  // `absolute` (el panel cuelga fuera de la caja del wrapper) y frente a los
  // reflows de la home que disparaban `mouseleave` espurios en reposo.
  useEffect(() => {
    if (megaKey === null) return;
    const onMove = (e: PointerEvent) => {
      const pill = navRef.current?.getBoundingClientRect();
      if (!pill) return;
      const panel = document
        .querySelector('[role="menu"]')
        ?.getBoundingClientRect();
      const left = panel ? Math.min(pill.left, panel.left) : pill.left;
      const right = panel ? Math.max(pill.right, panel.right) : pill.right;
      const bottom = panel && panel.bottom > pill.bottom ? panel.bottom : pill.bottom;
      const inside =
        e.clientX >= left &&
        e.clientX <= right &&
        e.clientY >= pill.top &&
        e.clientY <= bottom;
      if (inside) cancelClose();
      else scheduleClose();
    };
    document.addEventListener("pointermove", onMove);
    return () => document.removeEventListener("pointermove", onMove);
  }, [megaKey, cancelClose, scheduleClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <>
      <header
        data-hidden={hidden ? "true" : "false"}
        className={cn(
          "fixed inset-x-0 top-0 z-40 overflow-x-clip transition-transform duration-300 will-change-transform",
          hidden && !mobileOpen ? "-translate-y-[120%]" : "translate-y-0",
        )}
      >
        {/* ─────────────────────────────────────────────────────────────────
            TOP STRIP — marquesina infinita de frases sobre fondo oscuro
            ───────────────────────────────────────────────────────────────── */}
        <div className="overflow-hidden bg-zs-blue-950 text-white">
          <div
            className="zs-header-ticker flex w-max items-center gap-10 whitespace-nowrap py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/90 sm:py-2.5"
            aria-label="Argumentos de la tienda"
          >
            {[...TICKER_PHRASES, ...TICKER_PHRASES, ...TICKER_PHRASES].map((phrase, i) => (
              <span key={`${phrase}-${i}`} className="inline-flex items-center gap-10">
                <span>{phrase}</span>
                <span aria-hidden className="text-zs-red-500">
                  ✺
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            PILL FLOTANTE — logo + nav + acciones
            ───────────────────────────────────────────────────────────────── */}
        <div className="px-3 pt-3 sm:px-5 sm:pt-4">
          <div
            ref={navRef}
            className={cn(
              "mx-auto flex max-w-[1180px] items-center gap-2 rounded-full border border-zs-border/80 bg-white/95 px-3 py-2.5 backdrop-blur-md transition-shadow sm:gap-3 sm:px-4 sm:py-3",
              scrolled ? "shadow-xl" : "shadow-lg",
            )}
            style={{ boxShadow: "var(--shadow-zs-blue-glow-lg)" }}
          >
            {/* Logo */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 pl-1 pr-2"
              aria-label="Zona Sport — Inicio"
            >
              <Image
                src="/logo.webp"
                alt="Zona Sport"
                width={270}
                height={186}
                priority
                className="h-14 w-auto sm:h-16"
              />
            </Link>

            {/* Nav central desktop */}
            <nav
              aria-label="Navegación principal"
              className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            >
              {/* Tabs de género — pill activa estilo LATECH */}
              {GENDER_TABS.map((tab) => {
                const active = tab.match(pathname);
                const expanded = megaKey === tab.key;
                const triggerId = `${triggerIdPrefix}-mega-trigger-${tab.key}`;
                return (
                  <Link
                    key={tab.href}
                    id={triggerId}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    aria-haspopup="menu"
                    aria-expanded={expanded}
                    onMouseEnter={() => openMega(tab.key)}
                    onFocus={() => openMega(tab.key)}
                    onClick={() => setMegaKey(null)}
                    className={cn(
                      "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-tight transition-all",
                      active || expanded
                        ? "bg-zs-blue-950 text-white"
                        : "text-zs-ink hover:bg-zs-surface hover:text-zs-blue-900",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}

              {/* Mini-separador sutil + sub-tabs Niño / Niña / Accesorios
                  (atajos de la sección infantil). */}
              <span className="mx-1 h-4 w-px bg-zs-border/60" aria-hidden />
              {SUBTABS_NINOS.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium uppercase transition-colors",
                      active
                        ? "bg-zs-blue-950 text-white"
                        : "text-zs-ink hover:bg-zs-surface hover:text-zs-blue-900",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Separador entre TIENDA (Mujer/Hombre/Niños + sub-tabs) y
                  PÁGINA (Contacto/Blog/App). Diferenciación visual:
                  «aquí compras» vs «aquí informas». */}
              <span className="mx-3 h-5 w-px bg-zs-border" aria-hidden />

              {/* Links a páginas (no son tienda). */}
              {PAGE_NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-zs-surface text-zs-blue-900"
                        : "text-zs-muted hover:bg-zs-surface hover:text-zs-blue-700",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Botón "App" — dispara un evento custom que el
                  PwaInstallPrompt escucha y muestra el modal de instalación
                  PWA (incluso si ya fue descartado). No es un Link porque
                  no navega a una URL: invoca un overlay del propio sitio. */}
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("zs:show-pwa-install"));
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zs-muted transition-colors hover:bg-zs-surface hover:text-zs-blue-700"
                title="Instalar Zona Sport en tu dispositivo"
              >
                App
              </button>

              {/* OCULTO a petición del cliente: el sub-nav de deportes
                  (Running/Pádel/Montaña/Calzado) y su separador vertical
                  dejan la pill con solo Mujer/Hombre/Niños. Para volver
                  a verlos: descomenta el bloque siguiente.
              <span className="mx-2 h-5 w-px bg-zs-border" aria-hidden />
              {SPORT_NAV.slice(0, 4).map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-zs-surface text-zs-blue-900"
                        : "text-zs-muted hover:bg-zs-surface hover:text-zs-blue-700",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
              */}
            </nav>

            {/* Acciones derecha */}
            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              <SearchCommand
                trigger={
                  <button
                    type="button"
                    aria-label="Buscar (Ctrl+K)"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zs-ink transition-colors hover:bg-zs-surface sm:h-10 sm:w-10"
                  >
                    <Search className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </button>
                }
              />
              <a
                href={whatsappUrl(WhatsAppMessages.generic())}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="hidden h-10 w-10 items-center justify-center rounded-full text-zs-ink transition-colors hover:bg-zs-surface sm:inline-flex"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </a>
              <CartIcon />

              {/* CTA gradient — desktop */}
              <Link
                href="#catalogo"
                className="ml-1 hidden h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-zs-red-600 to-[#a01818] px-5 text-sm font-bold uppercase tracking-wide text-white transition-all hover:scale-[1.02] sm:inline-flex"
                style={{ boxShadow: "var(--shadow-zs-rojo-glow)" }}
              >
                Comprar
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-zs-ink transition-colors hover:bg-zs-surface sm:h-10 sm:w-10 lg:hidden"
                aria-label="Abrir menú"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mega-menú desktop — el panel se PORTALIZA a <body> (no vive aquí
              dentro del header). El header tiene `will-change-transform`, lo
              que lo promueve a capa GPU propia; con el panel anidado, el
              wrapper transformado de la home + el vídeo `fixed` capturaban los
              clics aunque el panel se pintara encima (bug de hit-testing entre
              capas compositadas). Al portalizarlo a <body> como hermano del
              contenido, `position:fixed` + z gana el hit-test. Le pasamos
              `navRef` (la pill) como ancla para posicionarlo donde estaba. */}
          <MegaMenu
            activeKey={megaKey}
            onClose={closeMega}
            anchorRef={navRef}
            triggerId={
              megaKey
                ? `${triggerIdPrefix}-mega-trigger-${megaKey}`
                : undefined
            }
          />
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            DRAWER MÓVIL — flotante en card rounded-3xl
            ───────────────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "mx-3 mt-2 overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 ease-out sm:mx-5 lg:hidden",
            mobileOpen
              ? "max-h-[80vh] opacity-100"
              : "pointer-events-none max-h-0 opacity-0",
          )}
          style={{ boxShadow: "var(--shadow-zs-blue-glow-lg)" }}
        >
          <nav aria-label="Menú móvil" className="overflow-hidden">
            <div className="max-h-[80vh] overflow-y-auto px-4 py-3">
              {/* Tabs de género (acordeón con mega-menú embebido).
                  Iteramos GENDER_TABS (mujer/hombre) — ya no incluimos
                  Niños porque el cliente lo separó en dos entradas
                  Niño y Niña (sin mega-menú, links directos abajo). */}
              <div className="mb-3 overflow-hidden rounded-2xl border border-zs-border bg-white">
                {GENDER_TABS.map((tabConfig) => {
                  const key = tabConfig.key;
                  const active = tabConfig.match(pathname);
                  const expanded = mobileExpanded === key;
                  const contentId = `${triggerIdPrefix}-mobile-${key}`;
                  return (
                    <div
                      key={key}
                      className="border-b border-zs-border/60 last:border-b-0"
                    >
                      <div className="flex items-stretch">
                        <Link
                          href={tabConfig.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex-1 px-3 py-3 text-sm font-extrabold uppercase tracking-wider",
                            active
                              ? "bg-zs-blue-50 text-zs-blue-900"
                              : "text-zs-ink",
                          )}
                        >
                          {tabConfig.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setMobileExpanded((prev) => (prev === key ? null : key))
                          }
                          aria-label={`Ver subcategorías de ${tabConfig.label}`}
                          aria-expanded={expanded}
                          aria-controls={contentId}
                          className="inline-flex w-12 items-center justify-center border-l border-zs-border/60 text-zs-muted transition-colors hover:bg-zs-surface"
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              expanded && "rotate-180",
                            )}
                          />
                        </button>
                      </div>
                      <MegaMenuMobile
                        tabKey={key}
                        expanded={expanded}
                        contentId={contentId}
                        onLinkClick={() => {
                          setMobileOpen(false);
                          setMobileExpanded(null);
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Niño / Niña / Accesorios (links simples, sin mega-menú) */}
              <ul className="mb-3 grid grid-cols-3 gap-2">
                {SUBTABS_NINOS.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-center text-sm font-bold uppercase tracking-wider",
                          active
                            ? "bg-zs-blue-950 text-white"
                            : "border border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <ul className="flex flex-col gap-1">
                {SPORT_NAV.map((item, i) => (
                  <li
                    key={item.href}
                    className={cn(mobileOpen && "animate-fade-in-up")}
                    style={mobileOpen ? { animationDelay: `${i * 30}ms` } : undefined}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-base font-medium text-zs-ink hover:bg-zs-surface hover:text-zs-blue-700"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className={cn(mobileOpen && "animate-fade-in-up")}>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      window.dispatchEvent(new CustomEvent("zs:show-pwa-install"));
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-base font-medium text-zs-ink hover:bg-zs-surface hover:text-zs-blue-700"
                  >
                    Instalar app
                  </button>
                </li>
              </ul>

              <a
                href={whatsappUrl(WhatsAppMessages.generic())}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-zs-red-600 to-[#a01818] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white"
                style={{ boxShadow: "var(--shadow-zs-rojo-glow)" }}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>
          </nav>
        </div>

        <style>{`
          @keyframes zs-header-ticker-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-33.333%); }
          }
          .zs-header-ticker {
            animation: zs-header-ticker-scroll 38s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .zs-header-ticker { animation: none !important; }
          }
        `}</style>
      </header>
      {/* El spacer ya no vive aquí — lo gestiona `<main>` con `pt-[136px]
          sm:pt-[148px]` para no tapar contenido. El home anula ese padding
          con `-mt-[136px]` para que la pill flote sobre la foto del hero. */}
    </>
  );
}
