"use client";

import * as React from "react";
import {
  Search,
  X,
  List,
  LayoutGrid,
  Star,
  BadgePercent,
  FolderTree,
  Bookmark,
  Tags,
  ImageOff,
  Check,
  RotateCcw,
  RefreshCw,
  PackageSearch,
  Loader2,
  ChevronDown,
  FileText,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatPriceEUR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPosOpenItemBySku, type PosOpenItemDefinition } from "@/lib/pos/open-items";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchPosCatalog } from "./tpv-actions";
import {
  stockFor,
  type PosCatalogItem,
  type PosFilters,
  type PosOpenLineDraft,
} from "./pos-shared";

type Filters = {
  inStock: boolean;
  featured: boolean;
  onSale: boolean;
  categorySlug: string | null;
  brandSlug: string | null;
  tag: string | null;
};

const DEFAULT_FILTERS: Filters = {
  // TPV físico: mostramos TODO por defecto (también sin stock) para poder vender
  // lo que hay en la mano aunque el sistema marque 0. El chip "En stock" sigue
  // disponible para filtrar a solo-disponibles.
  inStock: false,
  featured: false,
  onSale: false,
  categorySlug: null,
  brandSlug: null,
  tag: null,
};

export function ProductCatalog({
  initialProducts,
  filters: lists,
  onAdd,
  onAddOpenItem,
  onFocusSearchRef,
}: {
  initialProducts: PosCatalogItem[];
  filters: PosFilters;
  onAdd: (item: PosCatalogItem, size: string | null) => void;
  onAddOpenItem: (item: PosOpenLineDraft) => boolean;
  /** PosTerminal guarda aquí un focuser para el atajo "Buscar" del rail. */
  onFocusSearchRef?: React.MutableRefObject<(() => void) | null>;
}) {
  const [q, setQ] = React.useState("");
  const [filters, setFilters] = React.useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [products, setProducts] = React.useState<PosCatalogItem[]>(initialProducts);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reqId = React.useRef(0);
  const openItem = React.useMemo(() => getPosOpenItemBySku(q), [q]);

  React.useEffect(() => {
    if (onFocusSearchRef) onFocusSearchRef.current = () => inputRef.current?.focus();
  }, [onFocusSearchRef]);

  // Búsqueda/filtrado (debounce 280ms). Un id incremental descarta respuestas
  // obsoletas si llegan desordenadas.
  React.useEffect(() => {
    const id = ++reqId.current;
    if (openItem) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPosCatalog({
          q,
          inStock: filters.inStock,
          featured: filters.featured,
          onSale: filters.onSale,
          categorySlug: filters.categorySlug,
          brandSlug: filters.brandSlug,
          tag: filters.tag,
          take: 60,
        });
        if (id === reqId.current) setProducts(res);
      } catch {
        if (id === reqId.current) toast.error("Error cargando el catálogo");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q, filters, openItem]);

  const activeCount =
    (filters.featured ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.categorySlug ? 1 : 0) +
    (filters.brandSlug ? 1 : 0) +
    (filters.tag ? 1 : 0);
  const anyFilterTouched =
    !filters.inStock ||
    filters.featured ||
    filters.onSale ||
    !!filters.categorySlug ||
    !!filters.brandSlug ||
    !!filters.tag;

  const categoryName = lists.categories.find((c) => c.slug === filters.categorySlug)?.name;
  const brandName = lists.brands.find((b) => b.slug === filters.brandSlug)?.name;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-white">
      {/* Toolbar: buscador + vista */}
      <div className="flex items-center gap-2 border-b border-zs-border px-3 py-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, SKU, modelo o EAN…"
            className="h-11 w-full rounded-xl border border-zs-border bg-zs-surface/60 pl-9 pr-9 text-sm text-zs-ink shadow-inner outline-none transition-colors placeholder:text-zs-muted focus:border-zs-blue-700 focus:bg-white focus:ring-2 focus:ring-zs-blue-700/30"
            autoComplete="off"
            spellCheck={false}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zs-muted hover:bg-zs-surface hover:text-zs-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center rounded-xl border border-zs-border bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView("list")}
            aria-label="Vista en lista"
            aria-pressed={view === "list"}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              view === "list" ? "bg-zs-blue-900 text-white" : "text-zs-muted hover:bg-zs-surface",
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Vista en cuadrícula"
            aria-pressed={view === "grid"}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              view === "grid" ? "bg-zs-blue-900 text-white" : "text-zs-muted hover:bg-zs-surface",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chips de filtro */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zs-border px-3 py-2">
        <ToggleChip
          active={filters.inStock}
          icon={<PackageSearch className="h-3.5 w-3.5" />}
          label="En stock"
          onToggle={() => setFilters((f) => ({ ...f, inStock: !f.inStock }))}
        />
        <ToggleChip
          active={filters.featured}
          icon={<Star className="h-3.5 w-3.5" />}
          label="Destacado"
          onToggle={() => setFilters((f) => ({ ...f, featured: !f.featured }))}
        />
        <ToggleChip
          active={filters.onSale}
          icon={<BadgePercent className="h-3.5 w-3.5" />}
          label="En oferta"
          onToggle={() => setFilters((f) => ({ ...f, onSale: !f.onSale }))}
        />
        <SelectChip
          icon={<FolderTree className="h-3.5 w-3.5" />}
          label="Categoría"
          activeLabel={categoryName}
          options={lists.categories.map((c) => ({ value: c.slug, label: c.name }))}
          value={filters.categorySlug}
          onChange={(v) => setFilters((f) => ({ ...f, categorySlug: v }))}
        />
        <SelectChip
          icon={<Bookmark className="h-3.5 w-3.5" />}
          label="Etiqueta"
          activeLabel={filters.tag ?? undefined}
          options={lists.tags.map((t) => ({ value: t, label: t }))}
          value={filters.tag}
          onChange={(v) => setFilters((f) => ({ ...f, tag: v }))}
        />
        <SelectChip
          icon={<Tags className="h-3.5 w-3.5" />}
          label="Marca"
          activeLabel={brandName}
          options={lists.brands.map((b) => ({ value: b.slug, label: b.name }))}
          value={filters.brandSlug}
          onChange={(v) => setFilters((f) => ({ ...f, brandSlug: v }))}
        />
        {anyFilterTouched && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-zs-red-600 hover:bg-zs-red-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* Resultados */}
      <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin bg-zs-surface/40 p-3">
        {loading && (
          <div className="pointer-events-none absolute right-4 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs text-zs-muted shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
          </div>
        )}

        {openItem ? (
          <OpenItemEditor
            key={openItem.kind}
            definition={openItem}
            onAdd={onAddOpenItem}
          />
        ) : products.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zs-muted">
            <PackageSearch className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">
              {q || activeCount > 0 ? "Sin resultados" : "Empieza a buscar un producto"}
            </p>
            <p className="text-xs">Escribe un SKU, EAN, modelo o nombre, o ajusta los filtros.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} item={p} onAdd={onAdd} />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {products.map((p) => (
              <ProductRow key={p.id} item={p} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-zs-border px-3 py-1.5 text-xs text-zs-muted">
        <span>
          IVA incluido · Caja basada en <strong className="text-zs-ink">tienda física</strong>
        </span>
        {openItem ? (
          <span>SKU especial {openItem.sku} · exclusivo de este ticket</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            Mostrando {products.length}
            {products.length >= 60 ? "+" : ""} artículos
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </span>
        )}
      </div>
    </div>
  );
}

function OpenItemEditor({
  definition,
  onAdd,
}: {
  definition: PosOpenItemDefinition;
  onAdd: (item: PosOpenLineDraft) => boolean;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsedPrice = Number(price.replace(",", "."));
    const normalizedPrice = Math.round((parsedPrice + Number.EPSILON) * 100) / 100;
    if (!name.trim() || !description.trim() || !price.trim()) {
      toast.error("Rellena el nombre, la descripción y el precio");
      return;
    }
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < 0.01) {
      toast.error("Indica un precio válido de al menos 0,01 €");
      return;
    }
    const added = onAdd({
      kind: definition.kind,
      name: name.trim(),
      description: description.trim(),
      unitPrice: normalizedPrice,
    });
    if (added) {
      setName("");
      setDescription("");
      setPrice("");
    }
  }

  const Icon = definition.kind === "invoice" ? FileText : Store;

  return (
    <div className="mx-auto min-h-full w-full max-w-xl py-6">
      <form
        onSubmit={submit}
        className="w-full space-y-4 rounded-2xl border border-zs-border bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zs-blue-50 text-zs-blue-800">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-zs-ink">{definition.label}</p>
            <p className="text-xs text-zs-muted">SKU {definition.sku} · solo TPV físico</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`open-name-${definition.kind}`} className="text-xs font-semibold text-zs-ink">
            Nombre
          </label>
          <input
            id={`open-name-${definition.kind}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={160}
            required
            placeholder="Escribe el nombre"
            className="h-11 w-full rounded-xl border border-zs-border px-3 text-sm outline-none focus:border-zs-blue-700 focus:ring-2 focus:ring-zs-blue-700/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`open-description-${definition.kind}`} className="text-xs font-semibold text-zs-ink">
            Descripción
          </label>
          <textarea
            id={`open-description-${definition.kind}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            required
            rows={3}
            placeholder="Escribe la descripción"
            className="w-full resize-none rounded-xl border border-zs-border px-3 py-2.5 text-sm outline-none focus:border-zs-blue-700 focus:ring-2 focus:ring-zs-blue-700/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`open-price-${definition.kind}`} className="text-xs font-semibold text-zs-ink">
            Precio
          </label>
          <div className="relative">
            <input
              id={`open-price-${definition.kind}`}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="text"
              inputMode="decimal"
              required
              placeholder="0,00"
              className="h-11 w-full rounded-xl border border-zs-border px-3 pr-9 text-right text-sm tabular-nums outline-none focus:border-zs-blue-700 focus:ring-2 focus:ring-zs-blue-700/20"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zs-muted">€</span>
          </div>
        </div>

        <Button type="submit" className="h-11 w-full">
          Añadir {definition.label.toLowerCase()} al ticket
        </Button>
        <p className="text-center text-xs text-zs-muted">
          Se guardará como línea del pedido, no como producto del catálogo.
        </p>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ Chips -- */

function ToggleChip({
  active,
  icon,
  label,
  onToggle,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-zs-blue-700 bg-zs-blue-700 text-white shadow-sm"
          : "border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
      )}
    >
      {icon}
      {label}
      {active && <X className="h-3 w-3 opacity-80" />}
    </button>
  );
}

function SelectChip({
  icon,
  label,
  activeLabel,
  options,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  activeLabel?: string;
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const active = value != null;
  const shown = filter
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
            active
              ? "border-zs-blue-700 bg-zs-blue-700 text-white shadow-sm"
              : "border-zs-border bg-white text-zs-ink hover:bg-zs-surface",
          )}
        >
          {icon}
          <span className="max-w-[10rem] truncate">{active ? activeLabel ?? label : label}</span>
          {active ? (
            <X
              className="h-3 w-3 opacity-80"
              role="button"
              aria-label={`Quitar filtro ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            />
          ) : (
            <ChevronDown className="h-3 w-3 opacity-70" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0">
        <div className="border-b border-zs-border p-2">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Filtrar ${label.toLowerCase()}…`}
            className="h-8 w-full rounded-lg border border-zs-border px-2.5 text-xs outline-none focus:border-zs-blue-700"
          />
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-thin py-1">
          {shown.length === 0 && (
            <p className="px-3 py-2 text-xs text-zs-muted">Sin opciones</p>
          )}
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(value === o.value ? null : o.value);
                setOpen(false);
                setFilter("");
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-zs-surface",
                value === o.value && "font-semibold text-zs-blue-900",
              )}
            >
              <span className="truncate">{o.label}</span>
              {value === o.value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------------------------------------------- Productos -- */

function ProductImage({ item, className }: { item: PosCatalogItem; className?: string }) {
  if (item.mainImageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.mainImageUrl} alt={item.name} className={className} loading="lazy" />;
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-zs-surface text-zs-muted">
      <ImageOff className="h-6 w-6" />
    </span>
  );
}

/** Contenido del popover de tallas reutilizado por card y fila. */
function SizePicker({
  item,
  onAdd,
  close,
}: {
  item: PosCatalogItem;
  onAdd: (item: PosCatalogItem, size: string | null) => void;
  close: () => void;
}) {
  const hasSizes = item.sizes.length > 0;
  const [size, setSize] = React.useState<string | null>(null);
  const canAdd = !hasSizes || size != null;

  function add() {
    if (!canAdd) return;
    onAdd(item, hasSizes ? size : null);
    close();
  }

  return (
    <div className="w-[16.5rem]">
      {item.colorName && item.colorName !== "Único" && (
        <p className="mb-1.5 inline-flex rounded-md bg-zs-blue-50 px-2 py-0.5 text-xs font-semibold text-zs-blue-800">
          Color: {item.colorName}
        </p>
      )}
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zs-muted">
        {hasSizes ? "Talla" : "Producto sin tallas"}
      </p>
      {hasSizes && (
        <div className="flex flex-wrap gap-1.5">
          {item.sizes.map((s) => {
            const out = s.stock <= 0;
            const sel = size === s.size;
            return (
              <button
                key={s.size}
                type="button"
                onClick={() => setSize(s.size)}
                title={out ? `Sin stock (${s.stock}) — se vende igual` : `${s.stock} en stock`}
                className={cn(
                  "min-w-[2.5rem] rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                  sel
                    ? "border-zs-blue-700 bg-zs-blue-50 text-zs-blue-900 ring-1 ring-zs-blue-700"
                    : out
                      ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "border-zs-border bg-white text-zs-ink hover:border-zs-blue-300 hover:bg-zs-surface",
                )}
              >
                {s.size}
              </button>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        onClick={add}
        disabled={!canAdd}
        className="mt-2.5 h-10 w-full"
      >
        Añadir al carrito: {formatPriceEUR(item.unitPrice)}
      </Button>
    </div>
  );
}

function PriceTag({ item, className }: { item: PosCatalogItem; className?: string }) {
  return (
    <span className={cn("tabular-nums", className)}>
      {item.onSale && item.salePrice != null ? (
        <>
          <span className="font-bold text-zs-red-600">{formatPriceEUR(item.salePrice)}</span>{" "}
          <span className="text-xs font-normal text-zs-muted line-through">
            {formatPriceEUR(item.retailPrice)}
          </span>
        </>
      ) : (
        <span className="font-bold text-zs-blue-900">{formatPriceEUR(item.unitPrice)}</span>
      )}
    </span>
  );
}

function ProductCard({
  item,
  onAdd,
}: {
  item: PosCatalogItem;
  onAdd: (item: PosCatalogItem, size: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasVariants = item.sizes.length > 0;
  const out = stockFor(item, null) <= 0 && !item.sizes.some((s) => s.stock > 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex flex-col overflow-hidden rounded-xl border border-zs-border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-zs-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
            open && "ring-2 ring-zs-blue-700",
          )}
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-zs-surface">
            <ProductImage
              item={item}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {hasVariants && (
              <span className="absolute right-1.5 top-1.5 rounded-md bg-zs-blue-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                Variantes
              </span>
            )}
            {item.onSale && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-zs-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                Oferta
              </span>
            )}
            {out && (
              <span className="absolute inset-x-0 bottom-0 bg-zs-ink/70 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
                Sin stock
              </span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-2">
            <p className="line-clamp-2 text-xs font-semibold leading-snug text-zs-ink">
              {item.name}
            </p>
            <p className="text-[10px] text-zs-muted">
              {item.baseSku}
              {item.colorName && item.colorName !== "Único" && (
                <span className="ml-1 font-semibold text-zs-blue-700">· {item.colorName}</span>
              )}
            </p>
            <PriceTag item={item} className="mt-auto text-sm" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-auto p-3">
        <SizePicker item={item} onAdd={onAdd} close={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function ProductRow({
  item,
  onAdd,
}: {
  item: PosCatalogItem;
  onAdd: (item: PosCatalogItem, size: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const hasVariants = item.sizes.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border border-zs-border bg-white p-1.5 pr-3 text-left shadow-sm transition-colors hover:border-zs-blue-300 hover:bg-zs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
            open && "ring-2 ring-zs-blue-700",
          )}
        >
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zs-surface">
            <ProductImage item={item} className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-zs-ink">{item.name}</span>
            <span className="block truncate text-xs text-zs-muted">
              {item.baseSku}
              {item.colorName && item.colorName !== "Único" ? ` · ${item.colorName}` : ""}
              {hasVariants ? ` · ${item.sizes.length} tallas` : ""}
            </span>
          </span>
          <PriceTag item={item} className="shrink-0 text-sm" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-auto p-3">
        <SizePicker item={item} onAdd={onAdd} close={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
