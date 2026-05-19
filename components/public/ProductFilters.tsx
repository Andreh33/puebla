"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FacetItem = { value: string; label: string; count: number };

export type FiltersData = {
  brands: FacetItem[];
  genders: FacetItem[];
  colors: FacetItem[];
  sizes: FacetItem[];
  priceMin: number;
  priceMax: number;
};

type Props = {
  data: FiltersData;
  /** Resultados estimados para mostrar en el botón "Aplicar (X)". */
  resultsCount?: number;
};

const GENDER_LABELS: Record<string, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  UNISEX: "Unisex",
  NINO: "Niño",
  NINA: "Niña",
  BEBE: "Bebé",
  NO_ESPECIFICADO: "Sin especificar",
};

type ActiveChip = { id: string; label: string; onRemove: () => void };

export function ProductFilters({ data, resultsCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const get = (k: string): string[] => {
    const v = searchParams.get(k);
    return v ? v.split(",").filter(Boolean) : [];
  };

  const activeBrands = get("marca");
  const activeGenders = get("genero");
  const activeColors = get("color");
  const activeSizes = get("talla");
  const activeOnSale = searchParams.get("oferta") === "1";
  const activeNew = searchParams.get("nuevo") === "1";
  const priceMin = searchParams.get("min");
  const priceMax = searchParams.get("max");

  const totalActive = useMemo(
    () =>
      activeBrands.length +
      activeGenders.length +
      activeColors.length +
      activeSizes.length +
      (activeOnSale ? 1 : 0) +
      (activeNew ? 1 : 0) +
      (priceMin ? 1 : 0) +
      (priceMax ? 1 : 0),
    [activeBrands, activeGenders, activeColors, activeSizes, activeOnSale, activeNew, priceMin, priceMax],
  );

  const pushParams = useCallback(
    (mut: (sp: URLSearchParams) => void) => {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      mut(sp);
      sp.delete("page");
      startTransition(() => {
        const qs = sp.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const toggleMulti = (key: string, value: string) =>
    pushParams((sp) => {
      const cur = (sp.get(key) || "").split(",").filter(Boolean);
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      if (next.length === 0) sp.delete(key);
      else sp.set(key, next.join(","));
    });

  const removeMulti = (key: string, value: string) => toggleMulti(key, value);

  const toggleFlag = (key: string) =>
    pushParams((sp) => {
      if (sp.get(key) === "1") sp.delete(key);
      else sp.set(key, "1");
    });

  const setPrice = (which: "min" | "max", value: string) =>
    pushParams((sp) => {
      if (!value) sp.delete(which);
      else sp.set(which, value);
    });

  const clearAll = () => {
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  // Chips activos
  const activeChips: ActiveChip[] = useMemo(() => {
    const out: ActiveChip[] = [];
    if (activeOnSale) out.push({ id: "oferta", label: "En oferta", onRemove: () => toggleFlag("oferta") });
    if (activeNew) out.push({ id: "nuevo", label: "Novedades", onRemove: () => toggleFlag("nuevo") });
    for (const v of activeBrands) {
      const label = data.brands.find((b) => b.value === v)?.label ?? v;
      out.push({ id: `marca:${v}`, label, onRemove: () => removeMulti("marca", v) });
    }
    for (const v of activeGenders) {
      const label = GENDER_LABELS[v] ?? data.genders.find((g) => g.value === v)?.label ?? v;
      out.push({ id: `genero:${v}`, label, onRemove: () => removeMulti("genero", v) });
    }
    for (const v of activeColors) {
      const label = data.colors.find((c) => c.value === v)?.label ?? v;
      out.push({ id: `color:${v}`, label, onRemove: () => removeMulti("color", v) });
    }
    for (const v of activeSizes) {
      const label = data.sizes.find((s) => s.value === v)?.label ?? v;
      out.push({ id: `talla:${v}`, label: `Talla ${label}`, onRemove: () => removeMulti("talla", v) });
    }
    if (priceMin)
      out.push({ id: "min", label: `≥ ${priceMin}€`, onRemove: () => setPrice("min", "") });
    if (priceMax)
      out.push({ id: "max", label: `≤ ${priceMax}€`, onRemove: () => setPrice("max", "") });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeOnSale,
    activeNew,
    activeBrands,
    activeGenders,
    activeColors,
    activeSizes,
    priceMin,
    priceMax,
    data,
  ]);

  const body = (
    <div className="space-y-3">
      {/* Flags */}
      <FilterGroup title="Destacar" defaultOpen>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={activeOnSale} onCheckedChange={() => toggleFlag("oferta")} />
          <span>En oferta</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={activeNew} onCheckedChange={() => toggleFlag("nuevo")} />
          <span>Novedades (último mes)</span>
        </label>
      </FilterGroup>

      {data.brands.length > 0 && (
        <FilterGroup title="Marca" defaultOpen>
          {data.brands.map((b) => (
            <label key={b.value} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={activeBrands.includes(b.value)}
                  onCheckedChange={() => toggleMulti("marca", b.value)}
                />
                <span>{b.label}</span>
              </span>
              <span className="text-xs text-zs-muted">{b.count}</span>
            </label>
          ))}
        </FilterGroup>
      )}

      {data.genders.length > 0 && (
        <FilterGroup title="Género">
          {data.genders.map((g) => (
            <label key={g.value} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={activeGenders.includes(g.value)}
                  onCheckedChange={() => toggleMulti("genero", g.value)}
                />
                <span>{GENDER_LABELS[g.value] ?? g.label}</span>
              </span>
              <span className="text-xs text-zs-muted">{g.count}</span>
            </label>
          ))}
        </FilterGroup>
      )}

      {data.colors.length > 0 && (
        <FilterGroup title="Color">
          <div className="flex flex-wrap gap-1.5">
            {data.colors.map((c) => {
              const on = activeColors.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleMulti("color", c.value)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition",
                    on
                      ? "border-zs-blue-900 bg-zs-blue-900 text-white"
                      : "border-zs-border bg-white text-zs-ink hover:border-zs-blue-700",
                  )}
                  aria-pressed={on}
                >
                  {c.label} <span className="opacity-70">({c.count})</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {data.sizes.length > 0 && (
        <FilterGroup title="Talla">
          <div className="flex flex-wrap gap-1.5">
            {data.sizes.map((s) => {
              const on = activeSizes.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleMulti("talla", s.value)}
                  className={cn(
                    "inline-flex h-8 min-w-10 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition",
                    on
                      ? "border-zs-blue-900 bg-zs-blue-900 text-white"
                      : "border-zs-border bg-white text-zs-ink hover:border-zs-blue-700",
                  )}
                  aria-pressed={on}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Precio (€)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={`${Math.floor(data.priceMin)}`}
            defaultValue={priceMin ?? ""}
            onBlur={(e) => setPrice("min", e.target.value)}
            className="h-9"
            aria-label="Precio mínimo"
          />
          <span className="text-zs-muted">—</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder={`${Math.ceil(data.priceMax)}`}
            defaultValue={priceMax ?? ""}
            onBlur={(e) => setPrice("max", e.target.value)}
            className="h-9"
            aria-label="Precio máximo"
          />
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-zs-border bg-white p-5 scrollbar-thin">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-zs-blue-900">Filtros</h2>
            {totalActive > 0 && (
              <span className="rounded-full bg-zs-blue-900 px-2 py-0.5 text-xs font-semibold text-white">
                {totalActive}
              </span>
            )}
          </div>
          {body}
          {totalActive > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="mt-4 w-full"
            >
              <X className="h-4 w-4" /> Limpiar filtros ({totalActive})
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile trigger */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full justify-center">
              <SlidersHorizontal className="h-4 w-4" /> Filtrar
              {totalActive > 0 && (
                <span className="ml-1 rounded-full bg-zs-blue-900 px-1.5 text-xs font-semibold text-white">
                  {totalActive}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="flex h-[90vh] max-h-[90vh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border-t-0 p-0"
          >
            {/* Handle visual */}
            <div className="flex w-full justify-center pt-2.5" aria-hidden>
              <span className="h-1.5 w-12 rounded-full bg-zs-border" />
            </div>
            <SheetHeader className="!border-b-0 !p-5 !pb-3">
              <SheetTitle>Filtros</SheetTitle>
              {activeChips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeChips.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={chip.onRemove}
                      className="group inline-flex items-center gap-1 rounded-full border border-zs-blue-200 bg-zs-blue-50 px-2.5 py-1 text-xs font-medium text-zs-blue-900 transition hover:bg-zs-blue-100"
                    >
                      <span>{chip.label}</span>
                      <X className="h-3 w-3 text-zs-blue-700 transition group-hover:text-zs-red-600" />
                    </button>
                  ))}
                </div>
              )}
            </SheetHeader>
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-32 pt-2">
              {body}
            </div>
            <div className="sticky inset-x-0 bottom-0 z-10 border-t border-zs-border bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAll}
                  disabled={totalActive === 0}
                  className="flex-1"
                >
                  Limpiar todo
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  {typeof resultsCount === "number"
                    ? `Aplicar (${resultsCount})`
                    : "Aplicar filtros"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function FilterGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-zs-border pt-3 first:border-0 first:pt-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${open ? "Contraer" : "Expandir"} filtro ${title}`}
        className="flex w-full items-center justify-between gap-2 py-1.5 text-left"
      >
        <h3 className="text-sm font-semibold text-zs-blue-900">{title}</h3>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-zs-muted transition-transform duration-300",
            open ? "rotate-180" : "rotate-0",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-1.5 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
