"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "@/lib/cart/use-cart";
import { cn } from "@/lib/utils";

/**
 * Botón del header con contador dinámico que abre el CartDrawer.
 * Aplica un "pop" CSS al cambiar el contador para feedback visible.
 */
export function CartIcon() {
  const { count, ready } = useCart();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(0);
  const [prevCount, setPrevCount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (count > prevCount) setBump((b) => b + 1);
    setPrevCount(count);
  }, [count, ready, prevCount]);

  const visibleCount = ready ? count : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          visibleCount > 0
            ? `Tu carrito (${visibleCount} ${visibleCount === 1 ? "producto" : "productos"})`
            : "Tu carrito (vacío)"
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-zs-ink transition-colors hover:bg-zs-surface"
      >
        <ShoppingBag className="h-5 w-5" />
        {visibleCount > 0 && (
          <span
            key={bump}
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zs-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white tabular-nums",
              "animate-[zsBump_280ms_ease-out]",
            )}
          >
            {visibleCount > 99 ? "99+" : visibleCount}
          </span>
        )}
      </button>
      <CartDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
