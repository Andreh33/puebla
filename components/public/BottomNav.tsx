"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, User, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SearchCommand } from "./SearchCommand";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "@/lib/cart/use-cart";

type Item = {
  key: "home" | "search" | "cart" | "account";
  label: string;
  href?: string;
  icon: LucideIcon;
  match?: (pathname: string) => boolean;
};

const ITEMS: Item[] = [
  { key: "home", label: "Inicio", href: "/", icon: Home, match: (p) => p === "/" },
  { key: "search", label: "Buscar", icon: Search },
  { key: "cart", label: "Selección", icon: ShoppingBag, match: (p) => p.startsWith("/carrito") },
  {
    key: "account",
    label: "Cuenta",
    href: "/contacto",
    icon: User,
    match: (p) => p.startsWith("/contacto"),
  },
];

/**
 * BottomNav — barra de navegación fija inferior visible solo en mobile.
 *
 * - Iconos: Inicio · Buscar · Carrito · Cuenta.
 * - "Buscar" abre el SearchCommand (⌘K).
 * - "Carrito" abre el CartDrawer.
 * - Estado activo según pathname.
 * - Animación slide-up al cargar.
 * - Respeta safe-area iOS via pb-[env(safe-area-inset-bottom)].
 */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { count, ready } = useCart();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Spacer para que el contenido no quede tapado por la barra */}
      <div aria-hidden className="h-16 md:hidden" />

      <nav
        aria-label="Navegación principal mobile"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-zs-border bg-white/95 backdrop-blur md:hidden",
          "pb-[env(safe-area-inset-bottom)]",
          "transition-transform duration-500 will-change-transform",
          mounted ? "translate-y-0" : "translate-y-full",
          "shadow-[0_-8px_24px_-12px_rgba(20,34,91,0.18)]",
        )}
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ITEMS.map((item) => {
            const active = item.match
              ? item.match(pathname)
              : item.href
                ? pathname === item.href
                : false;
            const Icon = item.icon;
            const showBadge = item.key === "cart" && ready && count > 0;

            const inner = (
              <span
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-semibold transition-colors",
                  active ? "text-zs-blue-900" : "text-zs-muted hover:text-zs-blue-700",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-zs-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm tabular-nums">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
                <span
                  aria-hidden
                  className={cn(
                    "h-0.5 w-6 rounded-full transition-all",
                    active ? "bg-zs-blue-900" : "bg-transparent",
                  )}
                />
              </span>
            );

            if (item.key === "search") {
              return (
                <li key={item.key} className="contents">
                  <SearchCommand
                    trigger={
                      <button
                        type="button"
                        aria-label="Buscar"
                        className="h-full w-full text-left"
                      >
                        {inner}
                      </button>
                    }
                  />
                </li>
              );
            }
            if (item.key === "cart") {
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    aria-label={
                      ready && count > 0
                        ? `Tu carrito (${count} ${count === 1 ? "producto" : "productos"})`
                        : "Tu carrito (vacío)"
                    }
                    className="block h-full w-full text-left"
                  >
                    {inner}
                  </button>
                </li>
              );
            }
            return (
              <li key={item.key}>
                <Link
                  href={item.href ?? "/"}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className="block h-full w-full"
                >
                  {inner}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
