"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ScanLine,
  Plus,
  Search,
  ShoppingCart,
  Package,
  Maximize2,
  Minimize2,
  LogOut,
  X,
  MapPin,
  Sparkles,
} from "lucide-react";
import { cn, formatPriceEUR } from "@/lib/utils";
import { ProductCatalog } from "./ProductCatalog";
import { TicketPanel } from "./TicketPanel";
import { CheckoutDialog } from "./CheckoutDialog";
import {
  cartTotals,
  emptyCart,
  type Cart,
  type CartLine,
  type CartMeta,
  type PaymentMethod,
  type PosCatalogItem,
  type PosFilters,
} from "./pos-shared";

const STORAGE_KEY = "zs:tpv:state:v1";
const FIRST_ID = "ticket-1";

type User = { name?: string | null; email?: string | null; role?: string };

export function PosTerminal({
  user,
  filters,
  initialProducts,
}: {
  user: User;
  filters: PosFilters;
  initialProducts: PosCatalogItem[];
}) {
  const router = useRouter();
  const [carts, setCarts] = React.useState<Cart[]>(() => [{ ...emptyCart(FIRST_ID), createdAt: 0 }]);
  const [activeId, setActiveId] = React.useState<string>(FIRST_ID);
  const [hydrated, setHydrated] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const focusSearch = React.useRef<(() => void) | null>(null);

  // carts nunca está vacío (siempre garantizamos ≥1); el último fallback es por
  // seguridad de tipos (noUncheckedIndexedAccess).
  const active = carts.find((c) => c.id === activeId) ?? carts[0] ?? emptyCart(FIRST_ID);

  /* ---- Hidratación + persistencia (por caja, en localStorage) ---------- */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { carts?: Cart[]; activeId?: string };
        if (saved.carts?.length) {
          setCarts(saved.carts);
          setActiveId(
            saved.activeId && saved.carts.some((c) => c.id === saved.activeId)
              ? saved.activeId
              : (saved.carts[0]?.id ?? FIRST_ID),
          );
        }
      }
    } catch {
      /* localStorage no disponible */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ carts, activeId }));
    } catch {
      /* sin persistencia */
    }
  }, [carts, activeId, hydrated]);

  /* ---- Bloqueo de scroll del body mientras el TPV está montado --------- */
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* ---- Flash verde de la línea recién añadida -------------------------- */
  React.useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 750);
    return () => clearTimeout(t);
  }, [flash]);

  /* ---- Mutadores del carrito activo ------------------------------------ */
  const updateActive = React.useCallback(
    (updater: (c: Cart) => Cart) =>
      setCarts((cs) => cs.map((c) => (c.id === activeId ? updater(c) : c))),
    [activeId],
  );

  function addToCart(item: PosCatalogItem, size: string | null) {
    const s = size ?? null;
    const existing = active.lines.find((l) => l.productId === item.id && l.size === s);
    const key = existing ? existing.key : `${item.id}-${s ?? "u"}-${Date.now()}`;
    setCarts((cs) =>
      cs.map((c) => {
        if (c.id !== activeId) return c;
        const idx = c.lines.findIndex((l) => l.productId === item.id && l.size === s);
        if (idx >= 0) {
          return {
            ...c,
            lines: c.lines.map((l, i) => (i === idx ? { ...l, quantity: l.quantity + 1 } : l)),
          };
        }
        const line: CartLine = {
          key,
          productId: item.id,
          name: item.name,
          baseSku: item.baseSku,
          mainImageUrl: item.mainImageUrl,
          family: item.family,
          size: s,
          sizes: item.sizes,
          productStock: item.productStock,
          quantity: 1,
          unitPrice: item.unitPrice,
          lineDiscount: 0,
        };
        return { ...c, lines: [...c.lines, line] };
      }),
    );
    setFlash(key);
    toast.success(`${item.name}${s ? ` · talla ${s}` : ""} añadido al carrito`);
  }

  const patchLine = (key: string, data: Partial<CartLine>) =>
    updateActive((c) => ({ ...c, lines: c.lines.map((l) => (l.key === key ? { ...l, ...data } : l)) }));
  const removeLine = (key: string) =>
    updateActive((c) => ({ ...c, lines: c.lines.filter((l) => l.key !== key) }));
  const setCustomer = (name: string, phone: string) =>
    updateActive((c) => ({ ...c, customerName: name, customerPhone: phone }));
  const setNote = (note: string) => updateActive((c) => ({ ...c, note }));
  const setMeta = (meta: CartMeta[]) => updateActive((c) => ({ ...c, meta }));
  const setTotalDiscount = (n: number) => updateActive((c) => ({ ...c, totalDiscount: n }));
  const setPayment = (m: PaymentMethod) => updateActive((c) => ({ ...c, payment: m }));
  const anular = () => updateActive((c) => emptyCart(c.id));

  function newCart() {
    const id = makeId();
    setCarts((cs) => [...cs, emptyCart(id)]);
    setActiveId(id);
  }

  function closeCart(id: string) {
    setCarts((cs) => {
      const next = cs.filter((c) => c.id !== id);
      return next.length ? next : [emptyCart(FIRST_ID)];
    });
    setActiveId((prev) => {
      if (prev !== id) return prev;
      const remaining = carts.filter((c) => c.id !== id);
      return remaining[0]?.id ?? FIRST_ID;
    });
  }

  function saveServer() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ carts, activeId }));
      toast.success("Carrito guardado en esta caja");
    } catch {
      toast.error("No se pudo guardar el carrito");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex overflow-hidden bg-zs-blue-950 font-sans text-zs-ink">
      <Rail
        onNewCart={newCart}
        onFocusSearch={() => focusSearch.current?.()}
        onExit={() => router.push("/admin/pedidos")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={user} hydrated={hydrated} onExit={() => router.push("/admin/pedidos")} />
        <BrandStrip />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ProductCatalog
            initialProducts={initialProducts}
            filters={filters}
            onAdd={addToCart}
            onFocusSearchRef={focusSearch}
          />

          <div className="hidden w-px bg-zs-border md:block" />

          <div className="flex w-full max-w-[26rem] shrink-0 flex-col border-l border-zs-border md:w-[24rem] 2xl:w-[27rem]">
            <div className="min-h-0 flex-1">
              <TicketPanel
                cart={active}
                flashLineKey={flash}
                onPatchLine={patchLine}
                onRemoveLine={removeLine}
                onSetCustomer={setCustomer}
                onSetNote={setNote}
                onSetMeta={setMeta}
                onSetTotalDiscount={setTotalDiscount}
                onSetPayment={setPayment}
                onAnular={anular}
                onNewCart={newCart}
                onSaveServer={saveServer}
                onCheckout={() => setCheckoutOpen(true)}
              />
            </div>
            <CartTabs
              carts={carts}
              activeId={activeId}
              onSwitch={setActiveId}
              onNew={newCart}
              onClose={closeCart}
            />
          </div>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={active}
        onCompleted={anular}
      />
    </div>
  );
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `ticket-${Date.now()}`;
  }
}

/* ------------------------------------------------------------------ Rail -- */

function RailButton({
  icon,
  label,
  active,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = cn(
    "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
    active
      ? "bg-white/15 text-white"
      : "text-white/55 hover:bg-white/10 hover:text-white",
  );
  const inner = (
    <>
      {active && (
        <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-zs-yellow-400" />
      )}
      {icon}
      <span className="pointer-events-none absolute left-full z-10 ml-2 whitespace-nowrap rounded-md bg-zs-ink px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} aria-label={label}>
      {inner}
    </button>
  );
}

function Rail({
  onNewCart,
  onFocusSearch,
  onExit,
}: {
  onNewCart: () => void;
  onFocusSearch: () => void;
  onExit: () => void;
}) {
  return (
    <aside className="z-10 flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-white/10 bg-gradient-to-b from-zs-blue-950 to-[#070d24] py-3">
      <Link
        href="/admin"
        aria-label="Volver al panel"
        className="mb-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-zs-blue-600 to-zs-red-600 text-sm font-black text-white shadow-lg"
      >
        ZS
      </Link>
      <div className="my-1 h-px w-8 bg-white/10" />
      <RailButton icon={<ScanLine className="h-5 w-5" />} label="Caja (TPV)" active />
      <RailButton icon={<Plus className="h-5 w-5" />} label="Nuevo carrito" onClick={onNewCart} />
      <RailButton icon={<Search className="h-5 w-5" />} label="Buscar producto" onClick={onFocusSearch} />
      <RailButton icon={<ShoppingCart className="h-5 w-5" />} label="Pedidos" href="/admin/pedidos" />
      <RailButton icon={<Package className="h-5 w-5" />} label="Productos" href="/admin/productos" />

      <div className="mt-auto flex flex-col items-center gap-1.5">
        <FullscreenButton />
        <button
          type="button"
          onClick={onExit}
          aria-label="Salir del TPV"
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-zs-red-600 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          <span className="pointer-events-none absolute left-full z-10 ml-2 whitespace-nowrap rounded-md bg-zs-ink px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Salir del TPV
          </span>
        </button>
      </div>
    </aside>
  );
}

function FullscreenButton() {
  const [fs, setFs] = React.useState(false);
  React.useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* el navegador puede bloquearlo */
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={fs ? "Salir de pantalla completa" : "Pantalla completa"}
      className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white"
    >
      {fs ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
    </button>
  );
}

/* --------------------------------------------------------------- Top bar -- */

function TopBar({
  user,
  hydrated,
  onExit,
}: {
  user: User;
  hydrated: boolean;
  onExit: () => void;
}) {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const initials = (user.name ?? user.email ?? "ZS")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-zs-blue-950 via-zs-blue-900 to-zs-blue-950 px-4 text-white">
      <div className="flex items-center gap-2.5">
        <ScanLine className="h-5 w-5 text-zs-yellow-400" />
        <div className="leading-tight">
          <p className="font-display text-base font-bold tracking-tight">
            Zona Sport <span className="text-white/50">· TPV</span>
          </p>
          <p className="text-[11px] text-white/45">Punto de venta en tienda</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 sm:inline-flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          En línea
        </span>
        <span className="hidden font-display text-sm font-semibold tabular-nums text-white/80 md:inline">
          {hydrated && now
            ? now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
            : "--:--:--"}
        </span>
        <div className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 sm:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-zs-blue-500 to-zs-red-500 text-xs font-bold">
            {initials || "ZS"}
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-semibold">{user.name ?? "Cajero"}</span>
            <span className="block text-[10px] text-white/50">{user.role === "OWNER" ? "Propietario" : "Cajero"}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-sm font-semibold text-white transition-colors hover:bg-zs-red-600"
        >
          <X className="h-4 w-4" /> <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}

function BrandStrip() {
  return (
    <div className="flex h-7 shrink-0 items-center justify-center gap-2 bg-gradient-to-r from-zs-yellow-400 via-amber-300 to-zs-yellow-400 px-4 text-[11px] font-semibold text-zs-blue-950">
      <Sparkles className="h-3.5 w-3.5" />
      <span>Zona Sport — tu tienda deportiva multimarca</span>
      <span className="hidden items-center gap-1 opacity-80 sm:inline-flex">
        <MapPin className="h-3 w-3" /> Puebla de la Calzada (Badajoz)
      </span>
      <span className="hidden opacity-70 md:inline">· Escribe el SKU o EAN y pulsa la talla para añadir al instante</span>
    </div>
  );
}

/* ------------------------------------------------------------- Cart tabs -- */

function CartTabs({
  carts,
  activeId,
  onSwitch,
  onNew,
  onClose,
}: {
  carts: Cart[];
  activeId: string;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto scrollbar-thin border-t border-zs-border bg-white px-2 py-1.5">
      {carts.map((c, i) => {
        const total = cartTotals(c).total;
        const isActive = c.id === activeId;
        return (
          <div
            key={c.id}
            className={cn(
              "group flex shrink-0 items-center gap-1 rounded-lg border pl-2.5 text-xs font-semibold transition-colors",
              isActive
                ? "border-zs-blue-700 bg-zs-blue-700 text-white"
                : "border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
            )}
          >
            <button type="button" onClick={() => onSwitch(c.id)} className="py-1.5">
              <span className="opacity-70">Carrito {i + 1}</span>{" "}
              <span className="tabular-nums">{formatPriceEUR(total)}</span>
            </button>
            <button
              type="button"
              onClick={() => onClose(c.id)}
              aria-label={`Cerrar carrito ${i + 1}`}
              className={cn(
                "mr-1 rounded p-0.5 transition-colors",
                isActive ? "hover:bg-white/20" : "text-zs-muted hover:bg-zs-border hover:text-zs-red-600",
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onNew}
        aria-label="Nuevo carrito"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-zs-border text-zs-muted transition-colors hover:border-zs-blue-700 hover:text-zs-blue-700"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
