"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FOOTWEAR_TYPE_LABELS } from "@/lib/categories/footwear";
import {
  GARMENT_TYPE_LABELS,
  GARMENT_VARIANT_LABELS,
  VARIANT_TO_TYPE,
  TYPES_WITH_VARIANT,
  type GarmentType,
  type GarmentVariant,
} from "@/lib/categories/garment";

export type FacetItem = { value: string; label: string; count: number };

export type FiltersData = {
  brands: FacetItem[];
  genders: FacetItem[];
  colors: FacetItem[];
  sizes: FacetItem[];
  /** Bloque 3: tipos de calzado (solo presente/usado en páginas de calzado). */
  footwearTypes?: FacetItem[];
  /** Bloque 6: tipos de prenda (solo páginas de textil). */
  garmentTypes?: FacetItem[];
  /** Bloque 6 §18: variantes finas (sub-filtros de prenda). */
  garmentVariants?: FacetItem[];
  priceMin: number;
  priceMax: number;
};

type Props = {
  data: FiltersData;
  /** Resultados estimados para mostrar en el botón "Aplicar (X)". */
  resultsCount?: number;
  /** Bloque 3: muestra el FilterGroup "Tipo de calzado". Solo en páginas de calzado. */
  showFootwearFilter?: boolean;
  /** Bloque 6: muestra el FilterGroup "Tipo de prenda" (+ sub-variantes). Solo textil. */
  showGarmentFilter?: boolean;
  /** Bloque 7: muestra el filtro "Género". Default true; false en páginas ya
   * scopeadas por género (p.ej. /[seccion]/textil), donde el género es redundante. */
  showGenderFilter?: boolean;
  /**
   * Si true, en pantallas < lg (móvil/tablet, donde los filtros viven tras el
   * botón "Filtrar") abre el panel automáticamente la PRIMERA vez de la sesión.
   * Guarda un flag `zs_filters_shown` en sessionStorage para no repetirlo en
   * navegaciones posteriores. En desktop el sidebar ya está siempre visible.
   * Se activa sólo en las categorías raíz que son listados (ver páginas).
   */
  autoOpenFirstVisit?: boolean;
  /**
   * Bloque 8.4: modo compacto (páginas /[seccion]/textil). Si true: oculta el
   * grupo "Destacar", abre todos los FilterGroup cerrados por defecto y reordena
   * (Tipo de prenda → Marca → Talla → Precio → Color) vía CSS order.
   */
  compact?: boolean;
  /**
   * Bloque 9: arranca con TODOS los FilterGroup cerrados (el usuario los abre a
   * su gusto), pero SIN el resto del modo compacto — mantiene "Destacar" y el
   * orden normal. Usado en /accesorios.
   */
  startCollapsed?: boolean;
  /**
   * Bloque 9.3 (petición cliente): oculta por completo el FilterGroup
   * "Destacar" (En oferta / Novedades). Usado en /accesorios.
   */
  hideDestacar?: boolean;
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

export function ProductFilters({ data, resultsCount, autoOpenFirstVisit, showFootwearFilter, showGarmentFilter, showGenderFilter = true, compact = false, startCollapsed = false, hideDestacar = false }: Props) {
  // Estado por defecto (abierto/cerrado) de los FilterGroup colapsables: cerrados
  // en modo compacto (textil/calzado) o cuando se pide startCollapsed (accesorios).
  const groupOpen = !compact && !startCollapsed;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Auto-apertura del panel de filtros en móvil/tablet (< lg) la primera vez
  // de la sesión. En desktop el sidebar ya está siempre visible y abierto, así
  // que aquí sólo nos interesa el rango donde los filtros están escondidos
  // tras el botón "Filtrar". El flag de sesión evita ser pesado en cada visita.
  useEffect(() => {
    if (!autoOpenFirstVisit || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    try {
      if (sessionStorage.getItem("zs_filters_shown") === "1") return;
      sessionStorage.setItem("zs_filters_shown", "1");
    } catch {
      // sessionStorage no disponible: abrimos igualmente esta vez.
    }
    setOpen(true);
  }, [autoOpenFirstVisit]);

  const get = (k: string): string[] => {
    const v = searchParams.get(k);
    return v ? v.split(",").filter(Boolean) : [];
  };

  const activeBrands = get("marca");
  const activeGenders = get("genero");
  const activeColors = get("color");
  const activeSizes = get("talla");
  const activeTipo = get("tipo");
  const activePrenda = get("prenda");
  const activeVariante = get("variante");
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
      activeTipo.length +
      activePrenda.length +
      activeVariante.length +
      (activeOnSale ? 1 : 0) +
      (activeNew ? 1 : 0) +
      (priceMin ? 1 : 0) +
      (priceMax ? 1 : 0),
    [activeBrands, activeGenders, activeColors, activeSizes, activeTipo, activePrenda, activeVariante, activeOnSale, activeNew, priceMin, priceMax],
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

  // Bloque 6 §18: toggle del filtro de prenda con B2 — al DESMARCAR un padre,
  // limpiamos sus variantes asociadas (vía VARIANT_TO_TYPE) en la misma navegación.
  const togglePrenda = (prenda: string, checked: boolean) =>
    pushParams((sp) => {
      const cur = (sp.get("prenda") || "").split(",").filter(Boolean);
      const next = checked ? [...cur, prenda] : cur.filter((p) => p !== prenda);
      if (next.length) sp.set("prenda", next.join(","));
      else sp.delete("prenda");
      if (!checked) {
        const curVar = (sp.get("variante") || "").split(",").filter(Boolean);
        const nextVar = curVar.filter((v) => VARIANT_TO_TYPE[v as GarmentVariant] !== prenda);
        if (nextVar.length) sp.set("variante", nextVar.join(","));
        else sp.delete("variante");
      }
    });

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
    for (const v of activeTipo) {
      const label = FOOTWEAR_TYPE_LABELS[v as keyof typeof FOOTWEAR_TYPE_LABELS] ?? v;
      out.push({ id: `tipo:${v}`, label, onRemove: () => removeMulti("tipo", v) });
    }
    for (const v of activePrenda) {
      const label = GARMENT_TYPE_LABELS[v as GarmentType] ?? v;
      out.push({ id: `prenda:${v}`, label, onRemove: () => togglePrenda(v, false) });
    }
    for (const v of activeVariante) {
      const label = GARMENT_VARIANT_LABELS[v as GarmentVariant] ?? v;
      out.push({ id: `variante:${v}`, label, onRemove: () => removeMulti("variante", v) });
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
    activeTipo,
    activePrenda,
    activeVariante,
    priceMin,
    priceMax,
    data,
  ]);

  const body = (
    <div className="flex flex-col gap-3">
      {/* Flags — ocultos en modo compacto (textil, Bloque 8.4) y en /accesorios
          (hideDestacar, Bloque 9.3 a petición del cliente). */}
      {!compact && !hideDestacar && (
        <FilterGroup title="Destacar" defaultOpen={!startCollapsed}>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={activeOnSale} onCheckedChange={() => toggleFlag("oferta")} />
          <span>En oferta</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={activeNew} onCheckedChange={() => toggleFlag("nuevo")} />
          <span>Novedades (último mes)</span>
        </label>
        </FilterGroup>
      )}

      {data.brands.length > 0 && (
        <FilterGroup title="Marca" defaultOpen={groupOpen} className={compact ? "order-2" : undefined}>
          {/* "Sin marca" oculto del filtro a petición del cliente (los productos
              conservan su marca; solo no se ofrece como chip de filtro). */}
          {data.brands
            .filter((b) => !/^sin[\s-]?marca$/i.test(b.label))
            .sort((a, b) => a.label.localeCompare(b.label, "es"))
            .map((b) => (
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

      {showGenderFilter && data.genders.length > 0 && (
        <FilterGroup title="Género" defaultOpen={groupOpen}>
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
        <FilterGroup title="Color" defaultOpen={groupOpen} className={compact ? "order-5" : undefined}>
          <div className="flex flex-wrap gap-1.5">
            {[...data.colors].sort((a, b) => a.label.localeCompare(b.label, "es")).map((c) => {
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
        <FilterGroup title="Talla" defaultOpen={groupOpen} className={compact ? "order-3" : undefined}>
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

      {/* Bloque 3: tipo de calzado. Solo en páginas de calzado (showFootwearFilter). */}
      {showFootwearFilter && data.footwearTypes && data.footwearTypes.length > 0 && (
        <FilterGroup title="Tipo de calzado" defaultOpen={groupOpen} className={compact ? "order-1" : undefined}>
          <div className="flex flex-col gap-1.5">
            {[...data.footwearTypes]
              .sort((a, b) =>
                (FOOTWEAR_TYPE_LABELS[a.value as keyof typeof FOOTWEAR_TYPE_LABELS] ?? a.label).localeCompare(
                  FOOTWEAR_TYPE_LABELS[b.value as keyof typeof FOOTWEAR_TYPE_LABELS] ?? b.label,
                  "es",
                ),
              )
              .map((t) => {
              const on = activeTipo.includes(t.value);
              const label = FOOTWEAR_TYPE_LABELS[t.value as keyof typeof FOOTWEAR_TYPE_LABELS] ?? t.label;
              return (
                <label key={t.value} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Checkbox checked={on} onCheckedChange={() => toggleMulti("tipo", t.value)} />
                    <span>{label}</span>
                  </span>
                  {t.count > 0 && <span className="text-xs text-zs-muted">{t.count}</span>}
                </label>
              );
            })}
          </div>
        </FilterGroup>
      )}

      {/* Bloque 6 §18: tipo de prenda + sub-filtros de variante anidados. Solo textil. */}
      {showGarmentFilter && data.garmentTypes && data.garmentTypes.length > 0 && (
        <FilterGroup title="Tipo de prenda" defaultOpen={groupOpen} className={compact ? "order-1" : undefined}>
          <div className="flex flex-col gap-1">
            {/* "chaqueta" oculta del filtro a petición del cliente (los productos
                siguen en la tienda; solo no se ofrece el chip de filtro). */}
            {data.garmentTypes
              .filter((g) => g.value !== "chaqueta")
              .sort((a, b) =>
                (GARMENT_TYPE_LABELS[a.value as GarmentType] ?? a.value).localeCompare(
                  GARMENT_TYPE_LABELS[b.value as GarmentType] ?? b.value,
                  "es",
                ),
              )
              .map((g) => {
              const garmentValue = g.value as GarmentType;
              const checked = activePrenda.includes(garmentValue);
              const hasVariants = (TYPES_WITH_VARIANT as readonly string[]).includes(garmentValue);
              const variantsOfThis = hasVariants
                ? (data.garmentVariants ?? [])
                    .filter((v) => VARIANT_TO_TYPE[v.value as GarmentVariant] === garmentValue)
                    .sort((a, b) =>
                      GARMENT_VARIANT_LABELS[a.value as GarmentVariant].localeCompare(
                        GARMENT_VARIANT_LABELS[b.value as GarmentVariant],
                        "es",
                      ),
                    )
                : [];
              return (
                <div key={garmentValue}>
                  <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) => togglePrenda(garmentValue, c === true)}
                      />
                      <span>{GARMENT_TYPE_LABELS[garmentValue] ?? garmentValue}</span>
                    </span>
                    {g.count > 0 && <span className="text-xs text-zs-muted">{g.count}</span>}
                  </label>
                  {/* A1: sub-variantes SOLO visibles si el padre está marcado. */}
                  {checked && variantsOfThis.length > 0 && (
                    <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-zs-border pl-3">
                      {variantsOfThis.map((v) => {
                        const variantValue = v.value as GarmentVariant;
                        return (
                          <label
                            key={variantValue}
                            className="flex cursor-pointer items-center justify-between gap-2 text-sm"
                          >
                            <span className="flex items-center gap-2">
                              <Checkbox
                                checked={activeVariante.includes(variantValue)}
                                onCheckedChange={() => toggleMulti("variante", variantValue)}
                              />
                              <span className="text-xs">{GARMENT_VARIANT_LABELS[variantValue]}</span>
                            </span>
                            <span className="text-xs text-zs-muted">{v.count}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </FilterGroup>
      )}

      <FilterGroup title="Precio (€)" defaultOpen={groupOpen} className={compact ? "order-4" : undefined}>
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
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("border-t border-zs-border pt-3 first:border-0 first:pt-0", className)}>
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
