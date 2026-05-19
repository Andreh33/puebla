"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, MessageCircle, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import { SearchCommand } from "./SearchCommand";
import { CartIcon } from "./CartIcon";

const NAV_ITEMS: Array<{ label: string; href: string }> = [
  { label: "Running", href: "/running" },
  { label: "Pádel", href: "/padel" },
  { label: "Montaña", href: "/montana" },
  { label: "Calzado", href: "/calzado" },
  { label: "Marcas", href: "/marcas" },
  { label: "Blog", href: "/blog" },
  { label: "Contacto", href: "/contacto" },
];

/**
 * Top-nav editorial de género (estilo Nike / Decathlon). Los 3 tabs aparecen
 * por encima de los deportes y se destacan visualmente cuando el pathname
 * empieza por uno de ellos.
 */
const GENDER_TABS: Array<{
  label: string;
  href: string;
  /** Match estricto en el pathname público. */
  match: (path: string) => boolean;
}> = [
  {
    label: "Mujer",
    href: "/mujer",
    match: (p) => p === "/mujer" || p.startsWith("/mujer/"),
  },
  {
    label: "Hombre",
    href: "/hombre",
    match: (p) => p === "/hombre" || p.startsWith("/hombre/"),
  },
  {
    label: "Niños",
    href: "/ninos",
    match: (p) => p === "/ninos" || p.startsWith("/ninos/"),
  },
];

export function Header() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);
  const lastDir = useRef<"up" | "down">("up");

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

  // Cerrar drawer mobile al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        data-hidden={hidden ? "true" : "false"}
        className={cn(
          "sticky top-0 z-40 w-full border-b transition-all duration-300 will-change-transform",
          scrolled
            ? "border-zs-border bg-white/95 backdrop-blur shadow-sm"
            : "border-transparent bg-white",
          hidden && !mobileOpen ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Zona Sport — Inicio"
          >
            <Image
              src="/logo.webp"
              alt="Zona Sport"
              width={270}
              height={186}
              priority
              className="h-10 w-auto sm:h-14"
            />
          </Link>

          {/* Top-nav de género (desktop) — el switch principal estilo Nike */}
          <nav
            aria-label="Cambio de género"
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          >
            {GENDER_TABS.map((tab) => {
              const active = tab.match(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative inline-flex items-center px-4 py-2 text-base font-semibold tracking-tight transition-colors sm:text-lg",
                    active
                      ? "text-zs-blue-900"
                      : "text-zs-ink hover:text-zs-blue-700",
                  )}
                >
                  <span>{tab.label}</span>
                  {/* Underline animado */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-zs-blue-900 transition-transform duration-300",
                      active
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100 group-hover:bg-zs-red-600",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Search fake input (mobile y tablet — antes del nav) */}
          <SearchCommand
            trigger={
              <button
                type="button"
                aria-label="Buscar productos"
                className="hidden h-10 flex-1 items-center gap-2 rounded-xl border border-zs-border bg-zs-surface/80 px-3 text-left text-sm text-zs-muted transition-colors hover:border-zs-blue-300 hover:bg-zs-surface sm:flex lg:hidden"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">Buscar productos…</span>
              </button>
            }
          />

          {/* Acciones */}
          <div className="flex items-center gap-1 sm:gap-2">
            <SearchCommand
              trigger={
                <button
                  type="button"
                  aria-label="Buscar (Ctrl+K)"
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-zs-ink transition-colors hover:bg-zs-surface sm:hidden lg:inline-flex lg:border lg:border-zs-border lg:bg-zs-surface/60 lg:px-3"
                >
                  <Search className="h-5 w-5 lg:h-4 lg:w-4" />
                  <span className="hidden lg:inline lg:text-sm lg:text-zs-muted">
                    Buscar
                  </span>
                  <kbd className="ml-1 hidden rounded border border-zs-border bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zs-muted lg:inline-block">
                    ⌘K
                  </kbd>
                </button>
              }
            />
            <a
              href={whatsappUrl(WhatsAppMessages.generic())}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="hidden h-10 w-10 items-center justify-center rounded-lg text-zs-ink transition-colors hover:bg-zs-surface sm:inline-flex"
            >
              <MessageCircle className="h-5 w-5" />
            </a>
            <CartIcon />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zs-ink transition-colors hover:bg-zs-surface lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Segunda fila desktop: enlaces de deporte (subordinados al género) */}
        <div className="hidden border-t border-zs-border/60 bg-white lg:block">
          <nav
            aria-label="Navegación por deporte"
            className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-4 py-2"
          >
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-zs-surface text-zs-blue-900"
                      : "text-zs-ink hover:bg-zs-surface hover:text-zs-blue-700",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Nav mobile (drawer animado) */}
        <div
          className={cn(
            "grid overflow-hidden bg-white transition-[grid-template-rows,border] duration-300 ease-out lg:hidden",
            mobileOpen
              ? "grid-rows-[1fr] border-t border-zs-border"
              : "grid-rows-[0fr] border-t border-t-transparent",
          )}
        >
          <nav aria-label="Menú móvil" className="overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 py-3">
              {/* Tabs de género — destacados también en mobile */}
              <div
                role="tablist"
                aria-label="Cambio de género"
                className="mb-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-zs-surface p-1.5"
              >
                {GENDER_TABS.map((tab) => {
                  const active = tab.match(pathname);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition-colors",
                        active
                          ? "bg-white text-zs-blue-900 shadow-sm"
                          : "text-zs-ink hover:text-zs-blue-700",
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>

              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item, i) => (
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
              </ul>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
