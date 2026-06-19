"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Archive,
  Copy,
  ExternalLink,
  ImageOff,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriceEUR } from "@/lib/utils";
import { FOOTWEAR_TYPES, FOOTWEAR_TYPE_LABELS, type FootwearType } from "@/lib/categories/footwear";
import { GARMENT_TYPES, GARMENT_TYPE_LABELS, GARMENT_VARIANTS, GARMENT_VARIANT_LABELS, VARIANT_TO_TYPE, type GarmentType, type GarmentVariant } from "@/lib/categories/garment";
import type { ProductListResult } from "@/lib/products/queries";
import {
  archiveProductAction,
  bulkAction,
  deleteProductAction,
  duplicateProductAction,
  updateProductPriceAction,
  updateProductSkuAction,
  updateProductStatusAction,
  updateProductStockAction,
  type BulkActionType,
} from "./_actions";

type Row = ProductListResult["rows"][number];

// SOURCE_VARIANT: estilos del badge "Origen". Ocultado a petición del cliente
// (2026-05-24) en tabla y tarjeta móvil; se conserva comentado para recuperar.
/*
const SOURCE_VARIANT: Record<string, { label: string; cls: string }> = {
  LOCAL: { label: "Local", cls: "border-zs-blue-200 bg-zs-blue-50 text-zs-blue-900" },
  MIRAVIA: { label: "Miravia", cls: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  AMAZON: { label: "Amazon", cls: "border-amber-300 bg-amber-50 text-amber-900" },
};
*/

const STATUS_VARIANT: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Borrador", cls: "border-zs-border bg-white text-zs-muted" },
  ACTIVE: { label: "Activo", cls: "border-transparent bg-emerald-600 text-white" },
  INACTIVE: { label: "Inactivo", cls: "border-transparent bg-zs-red-600 text-white" },
  OUT_OF_STOCK: { label: "Sin stock", cls: "border-transparent bg-amber-500 text-white" },
};

const GENDER_LABEL: Record<string, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  UNISEX: "Unisex",
  NINO: "Niño",
  NINA: "Niña",
  BEBE: "Bebé",
  NO_ESPECIFICADO: "—",
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Borrador" },
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "OUT_OF_STOCK", label: "Sin stock" },
] as const;

/**
 * Visibilidad responsive por columna (clave = `column.id`). Por debajo de
 * `md` dejamos sólo lo esencial — producto (thumbnail + nombre), estado, PVP
 * y acciones — y ocultamos las secundarias (SKU, marca, categoría, género,
 * tallas, origen, stock). Por debajo de `sm` la tabla entera se sustituye por
 * tarjetas apiladas (ver render más abajo), así que estas clases sólo afectan
 * al rango sm–lg.
 */
const COLUMN_RESPONSIVE: Record<string, string> = {
  select: "",
  name: "",
  sku: "hidden lg:table-cell",
  brand: "hidden md:table-cell",
  category: "hidden xl:table-cell",
  gender: "hidden lg:table-cell",
  footwearType: "hidden xl:table-cell",
  garmentType: "hidden xl:table-cell",
  garmentVariant: "hidden xl:table-cell",
  // "sizes" y "source" ocultadas a petición del cliente (2026-05-24).
  costPrice: "hidden lg:table-cell",
  status: "",
  retailPrice: "",
  stock: "hidden md:table-cell",
  actions: "",
};

type RowConfirm = { type: "delete" | "archive" | "duplicate"; id: string; name: string };

/**
 * Acciones por producto. En `variant="row"` (tabla desktop) muestra los
 * botones sueltos ver/editar + menú "···"; en `variant="menu"` (tarjeta
 * móvil) colapsa todo en un único botón "···" con editar/ver/duplicar/
 * archivar/eliminar. Una sola fuente de verdad para no duplicar la lógica
 * de confirmación entre la tabla y las tarjetas.
 */
function RowActions({
  r,
  onConfirm,
  variant = "row",
}: {
  r: Row;
  onConfirm: (c: RowConfirm) => void;
  variant?: "row" | "menu";
}) {
  if (variant === "menu") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Acciones del producto">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <Link
            href={`/admin/productos/${r.id}`}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
          >
            <Pencil className="h-4 w-4" /> Editar
          </Link>
          <Link
            href={`/producto/${r.slug}`}
            target="_blank"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
          >
            <ExternalLink className="h-4 w-4" /> Ver público
          </Link>
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
            onClick={() => onConfirm({ type: "duplicate", id: r.id, name: r.name })}
          >
            <Copy className="h-4 w-4" /> Duplicar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
            onClick={() => onConfirm({ type: "archive", id: r.id, name: r.name })}
          >
            <Archive className="h-4 w-4" /> Archivar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zs-red-700 hover:bg-zs-red-50"
            onClick={() => onConfirm({ type: "delete", id: r.id, name: r.name })}
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="ghost" size="icon" aria-label="Ver público" title="Ver público">
        <Link href={`/producto/${r.slug}`} target="_blank">
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="icon" aria-label="Editar" title="Editar">
        <Link href={`/admin/productos/${r.id}`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Más acciones">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-44 p-1">
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
            onClick={() => onConfirm({ type: "duplicate", id: r.id, name: r.name })}
          >
            <Copy className="h-4 w-4" /> Duplicar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
            onClick={() => onConfirm({ type: "archive", id: r.id, name: r.name })}
          >
            <Archive className="h-4 w-4" /> Archivar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zs-red-700 hover:bg-zs-red-50"
            onClick={() => onConfirm({ type: "delete", id: r.id, name: r.name })}
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * Celda SKU editable inline. Click para editar, blur o Enter para guardar.
 * Si está vacío, persiste null y la ficha pública usa el fallback
 * (modelCode → externalId → id corto).
 */
function EditableSkuCell({
  id,
  initialSku,
  fallback,
}: {
  id: string;
  initialSku: string | null;
  fallback: string;
}) {
  const [value, setValue] = React.useState(initialSku ?? "");
  const [saved, setSaved] = React.useState(initialSku ?? "");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const isFallback = !saved;

  const commit = React.useCallback(async () => {
    const trimmed = value.trim();
    if (trimmed === (saved ?? "")) return;
    setSaving(true);
    const res = await updateProductSkuAction(id, trimmed);
    setSaving(false);
    if (res.ok) {
      setSaved(res.sku ?? "");
      toast.success(res.sku ? `SKU guardado: ${res.sku}` : "SKU borrado");
    } else {
      // Rollback
      setValue(saved);
      toast.error(res.error);
    }
  }, [id, value, saved]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            setValue(saved);
            inputRef.current?.blur();
          }
        }}
        placeholder={fallback}
        disabled={saving}
        maxLength={64}
        className={`h-7 w-32 rounded-md border border-transparent bg-transparent px-2 font-mono text-xs transition-colors hover:border-zs-border focus:border-zs-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zs-blue-100 ${
          isFallback ? "text-zs-muted placeholder:text-zs-muted/60" : "font-semibold text-zs-ink"
        }`}
        title={isFallback ? `SKU no definido (fallback: ${fallback})` : `SKU: ${saved}`}
      />
      {saving && (
        <span aria-hidden className="absolute right-1 top-1.5 h-3 w-3 animate-pulse rounded-full bg-zs-blue-300" />
      )}
    </div>
  );
}

/**
 * Celda PVP editable. Acepta coma o punto como decimal. Persiste al blur
 * o Enter. Muestra con formato es-ES (€), pero al editar deja el número
 * sin formato. Si el producto tiene salePrice, aquí solo editamos el PVP
 * base (retailPrice). Para gestionar la oferta hay que entrar a la ficha.
 */
function EditablePriceCell({
  id,
  initialRetailPrice,
  initialSalePrice,
}: {
  id: string;
  initialRetailPrice: string;
  initialSalePrice: string | null;
}) {
  const [value, setValue] = React.useState(initialRetailPrice);
  const [saved, setSaved] = React.useState(initialRetailPrice);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const commit = React.useCallback(async () => {
    if (value === saved) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await updateProductPriceAction(id, value);
    setSaving(false);
    setEditing(false);
    if (res.ok) {
      setSaved(res.retailPrice);
      setValue(res.retailPrice);
      toast.success(`PVP guardado: ${formatPriceEUR(res.retailPrice)}`);
    } else {
      setValue(saved);
      toast.error(res.error);
    }
  }, [id, value, saved]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="block w-full rounded-md px-1 py-1 text-right font-mono text-sm transition-colors hover:bg-zs-blue-50"
        title="Click para editar PVP"
      >
        {initialSalePrice ? (
          <span>
            <span className="text-zs-red-600">{formatPriceEUR(initialSalePrice)}</span>{" "}
            <span className="text-xs text-zs-muted line-through">{formatPriceEUR(saved)}</span>
          </span>
        ) : (
          formatPriceEUR(saved)
        )}
      </button>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            setValue(saved);
            setEditing(false);
          }
        }}
        disabled={saving}
        className="h-7 w-24 rounded-md border border-zs-blue-700 bg-white px-2 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zs-blue-100"
      />
      <span aria-hidden className="absolute right-2 top-1.5 text-xs text-zs-muted">€</span>
    </div>
  );
}

/**
 * Celda de stock editable. Acepta enteros >= 0.
 */
function EditableStockCell({ id, initialStock }: { id: string; initialStock: number }) {
  const [value, setValue] = React.useState(String(initialStock));
  const [saved, setSaved] = React.useState(initialStock);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const commit = React.useCallback(async () => {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed === saved) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await updateProductStockAction(id, value);
    setSaving(false);
    setEditing(false);
    if (res.ok) {
      setSaved(res.stock);
      setValue(String(res.stock));
      toast.success(`Stock: ${res.stock}`);
    } else {
      setValue(String(saved));
      toast.error(res.error);
    }
  }, [id, value, saved]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={`block w-full rounded-md px-1 py-1 text-right font-mono text-sm transition-colors hover:bg-zs-blue-50 ${
          saved === 0 ? "text-zs-red-600 font-semibold" : "text-zs-ink"
        }`}
        title="Click para editar stock"
      >
        {saved}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          setValue(String(saved));
          setEditing(false);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      className="h-7 w-20 rounded-md border border-zs-blue-700 bg-white px-2 text-right font-mono text-sm focus:outline-none focus:ring-2 focus:ring-zs-blue-100"
    />
  );
}

/**
 * Celda de estado editable inline. Select que persiste el cambio al instante.
 * Cambia a Borrador, Activo, Inactivo o Sin stock con una sola interacción.
 */
function EditableStatusCell({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = React.useState(initialStatus);
  const [saving, setSaving] = React.useState(false);
  const variant = STATUS_VARIANT[status] ?? STATUS_VARIANT.DRAFT!;

  const onChange = async (next: string) => {
    if (next === status) return;
    const prev = status;
    setStatus(next); // optimistic
    setSaving(true);
    const res = await updateProductStatusAction(id, next);
    setSaving(false);
    if (res.ok) {
      toast.success(`Estado: ${STATUS_OPTIONS.find((o) => o.value === next)?.label ?? next}`);
    } else {
      setStatus(prev); // rollback
      toast.error(res.error);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <Select value={status} onValueChange={onChange} disabled={saving}>
        <SelectTrigger
          className={`h-7 min-h-0 rounded-full border px-2.5 py-0 text-xs font-semibold ${variant.cls} [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-70`}
        >
          <SelectValue>{variant.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProductsTable({
  initialData,
  brands,
  categories,
  popularTags,
}: {
  initialData: ProductListResult;
  brands: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; parentId: string | null }>;
  popularTags: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [confirm, setConfirm] = React.useState<RowConfirm | null>(null);
  const [keepStockOnDuplicate, setKeepStockOnDuplicate] = React.useState(false);
  const [newColorOnDuplicate, setNewColorOnDuplicate] = React.useState("");
  const [bulkConfirm, setBulkConfirm] = React.useState<null | "delete" | "draftZeroStock">(null);
  const [footwearOpen, setFootwearOpen] = React.useState(false);
  const [footwearValue, setFootwearValue] = React.useState<string>("__none__");
  const [garmentOpen, setGarmentOpen] = React.useState(false);
  const [garmentValue, setGarmentValue] = React.useState<string>("__none__");
  const [variantOpen, setVariantOpen] = React.useState(false);
  const [variantValue, setVariantValue] = React.useState<string>("__none__");

  const qInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync URL â€” debounce search
  const updateParams = React.useCallback(
    (mutate: (sp: URLSearchParams) => void, opts: { resetPage?: boolean } = {}) => {
      const sp = new URLSearchParams(searchParams?.toString() ?? "");
      mutate(sp);
      if (opts.resetPage) sp.delete("page");
      startTransition(() => {
        router.replace(`/admin/productos?${sp.toString()}`, { scroll: false });
      });
    },
    [router, searchParams],
  );

  const q = searchParams?.get("q") ?? "";
  const source = (searchParams?.get("source") ?? "").split(",").filter(Boolean);
  const status = (searchParams?.get("status") ?? "").split(",").filter(Boolean);
  const brandSel = (searchParams?.get("brand") ?? "").split(",").filter(Boolean);
  const categorySel = (searchParams?.get("category") ?? "").split(",").filter(Boolean);
  const gender = (searchParams?.get("gender") ?? "").split(",").filter(Boolean);
  const noImage = searchParams?.get("noImage") === "1";
  const sinTipoCalzado = searchParams?.get("sinTipoCalzado") === "1";
  const sinTipoPrenda = searchParams?.get("sinTipoPrenda") === "1";
  const sinVarianteTipoPrenda = searchParams?.get("sinVarianteTipoPrenda") === "1";
  const pageSize = Number(searchParams?.get("pageSize") ?? 50);
  const page = Number(searchParams?.get("page") ?? 1);
  const sort = searchParams?.get("sort") ?? "createdAt_desc";

  // Search debounced
  const [qLocal, setQLocal] = React.useState(q);
  React.useEffect(() => setQLocal(q), [q]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (qLocal === q) return;
      updateParams((sp) => {
        if (qLocal) sp.set("q", qLocal);
        else sp.delete("q");
      }, { resetPage: true });
    }, 300);
    return () => clearTimeout(t);
  }, [qLocal, q, updateParams]);

  function toggleMulti(key: string, value: string) {
    const current = (searchParams?.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateParams((sp) => {
      if (next.length) sp.set(key, next.join(","));
      else sp.delete(key);
    }, { resetPage: true });
  }

  function clearAll() {
    updateParams((sp) => {
      ["q", "source", "status", "brand", "category", "gender", "noImage", "sinTipoCalzado", "sinTipoPrenda", "sinVarianteTipoPrenda", "minPrice", "maxPrice", "tag", "page"].forEach(
        (k) => sp.delete(k),
      );
    });
  }

  const totalPages = Math.max(1, Math.ceil(initialData.total / initialData.pageSize));

  const columns = React.useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            aria-label="Seleccionar todo"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Seleccionar fila"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        size: 32,
      },
      {
        accessorKey: "name",
        header: "Producto",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <Link
              href={`/admin/productos/${r.id}`}
              className="flex items-center gap-3"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zs-border bg-zs-surface">
                {r.mainImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.mainImageUrl}
                    alt={r.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zs-muted">
                    <ImageOff className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="w-36 shrink-0 sm:w-40 xl:w-48 2xl:w-56">
                {/* Nombre en columna estrecha y RESPONSIVE: el nombre envuelve en
                    varias líneas (sin recortes, sin scroll, sin flechas) para
                    verse entero y adaptarse a cualquier ancho de pantalla — en
                    pantallas anchas la columna crece y ocupa menos líneas.
                    title = tooltip nativo de apoyo. */}
                <p
                  title={r.name}
                  className="whitespace-normal break-words text-sm font-semibold leading-snug text-zs-ink group-hover:text-zs-blue-700"
                >
                  {r.name}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-zs-muted">
                  {r.colorHex && (
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-full border border-zs-border"
                      style={{ backgroundColor: r.colorHex }}
                    />
                  )}
                  <span>{r.colorName}</span>
                </div>
              </div>
            </Link>
          );
        },
      },
      {
        id: "sku",
        header: "SKU",
        cell: ({ row }) => {
          const r = row.original;
          const fallback = r.modelCode || r.externalId || r.id.slice(0, 8).toUpperCase();
          return <EditableSkuCell id={r.id} initialSku={r.sku} fallback={fallback} />;
        },
      },
      {
        id: "brand",
        accessorKey: "brand.name",
        header: "Marca",
        cell: ({ row }) => (
          <span className="text-sm text-zs-ink">{row.original.brand.name}</span>
        ),
      },
      {
        id: "category",
        accessorKey: "category.name",
        header: "Categoría",
        cell: ({ row }) => (
          <span className="text-sm text-zs-muted">{row.original.category.name}</span>
        ),
      },
      {
        accessorKey: "gender",
        header: "Género",
        cell: ({ row }) => (
          <span className="text-xs text-zs-muted">{GENDER_LABEL[row.original.gender] ?? "â€”"}</span>
        ),
      },
      {
        id: "footwearType",
        header: "Tipo",
        cell: ({ row }) => {
          const r = row.original;
          if (r.footwearType) {
            return (
              <Badge variant="secondary" className="text-[11px]">
                {FOOTWEAR_TYPE_LABELS[r.footwearType as FootwearType] ?? r.footwearType}
              </Badge>
            );
          }
          if (r.isCalzado) return <span className="text-xs text-zs-muted/60">Sin tipo</span>;
          return null;
        },
      },
      {
        id: "garmentType",
        header: "Prenda",
        cell: ({ row }) => {
          const r = row.original;
          if (r.garmentType) {
            return (
              <Badge variant="secondary" className="text-[11px]">
                {GARMENT_TYPE_LABELS[r.garmentType as GarmentType] ?? r.garmentType}
              </Badge>
            );
          }
          if (r.isTextil) return <span className="text-xs text-zs-muted/60">Sin tipo</span>;
          return null;
        },
      },
      {
        id: "garmentVariant",
        header: "Variante",
        cell: ({ row }) => {
          const r = row.original;
          if (r.garmentVariant) {
            return (
              <Badge variant="secondary" className="text-[11px]">
                {GARMENT_VARIANT_LABELS[r.garmentVariant as GarmentVariant] ?? r.garmentVariant}
              </Badge>
            );
          }
          if (r.garmentType && ["camiseta", "pantalon", "mallas"].includes(r.garmentType)) {
            return <span className="text-xs text-zs-muted/60">Sin variante</span>;
          }
          return null;
        },
      },
      // Columnas "Tallas" y "Origen" ocultadas a petición del cliente
      // (2026-05-24). NO borradas — descomentar este bloque para recuperarlas.
      /*
      {
        id: "sizes",
        header: "Tallas",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.original.sizesCount}
          </Badge>
        ),
      },
      {
        accessorKey: "source",
        header: "Origen",
        cell: ({ row }) => {
          const s = SOURCE_VARIANT[row.original.source] ?? SOURCE_VARIANT.LOCAL!;
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
            >
              {s.label}
            </span>
          );
        },
      },
      */
      // Coste (lo que le cuesta a la tienda) — solo lectura. Editar el coste
      // sigue disponible en la ficha del producto. Petición cliente 2026-05-24.
      {
        id: "costPrice",
        header: () => <div className="text-right">Coste</div>,
        cell: ({ row }) => (
          <div className="px-1 py-1 text-right font-mono text-sm text-zs-muted">
            {row.original.costPrice ? formatPriceEUR(row.original.costPrice) : "—"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
          <EditableStatusCell id={row.original.id} initialStatus={row.original.status} />
        ),
      },
      {
        accessorKey: "retailPrice",
        header: () => <div className="text-right">PVP</div>,
        cell: ({ row }) => (
          <EditablePriceCell
            id={row.original.id}
            initialRetailPrice={row.original.retailPrice}
            initialSalePrice={row.original.salePrice}
          />
        ),
      },
      {
        accessorKey: "stock",
        header: () => <div className="text-right">Stock</div>,
        cell: ({ row }) => (
          <EditableStockCell id={row.original.id} initialStock={row.original.stock} />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <RowActions r={row.original} onConfirm={setConfirm} />,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: initialData.rows,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getRowId: (r) => r.id,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const selectedIds = Object.keys(rowSelection);

  async function handleRowAction(c: NonNullable<typeof confirm>) {
    try {
      if (c.type === "delete") {
        const res = await deleteProductAction(c.id);
        if (res.ok) toast.success("Producto eliminado");
      } else if (c.type === "archive") {
        const res = await archiveProductAction(c.id);
        if (res.ok) toast.success("Producto archivado");
      } else if (c.type === "duplicate") {
        const res = await duplicateProductAction(
          c.id,
          keepStockOnDuplicate,
          newColorOnDuplicate.trim() || undefined,
        );
        if (res.ok) {
          toast.success("Producto duplicado");
          router.push(`/admin/productos/${res.id}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setConfirm(null);
      setKeepStockOnDuplicate(false);
      setNewColorOnDuplicate("");
    }
  }

  async function handleBulk(action: BulkActionType) {
    try {
      const res = await bulkAction(selectedIds, action);
      if (res.ok) {
        toast.success(`${res.count} producto(s) actualizado(s)`);
        setRowSelection({});
      } else {
        toast.error(res.error ?? "Error");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
    setBulkConfirm(null);
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-2xl border border-zs-border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
            <Input
              ref={qInputRef}
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Buscar por nombre, modelo, EAN, marca…"
              className="pl-9"
              aria-label="Búsqueda"
            />
          </div>

          <FilterChip
            label="Origen"
            options={[
              { value: "LOCAL", label: "Local" },
              { value: "MIRAVIA", label: "Miravia" },
              { value: "AMAZON", label: "Amazon" },
            ]}
            selected={source}
            onToggle={(v) => toggleMulti("source", v)}
          />
          <FilterChip
            label="Estado"
            options={[
              { value: "DRAFT", label: "Borrador" },
              { value: "ACTIVE", label: "Activo" },
              { value: "INACTIVE", label: "Inactivo" },
              { value: "OUT_OF_STOCK", label: "Sin stock" },
            ]}
            selected={status}
            onToggle={(v) => toggleMulti("status", v)}
          />
          <FilterChip
            label="Marca"
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            selected={brandSel}
            onToggle={(v) => toggleMulti("brand", v)}
            searchable
          />
          <FilterChip
            label="Categoría"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            selected={categorySel}
            onToggle={(v) => toggleMulti("category", v)}
            searchable
          />
          <FilterChip
            label="Género"
            options={[
              { value: "HOMBRE", label: "Hombre" },
              { value: "MUJER", label: "Mujer" },
              { value: "UNISEX", label: "Unisex" },
              { value: "NINO", label: "Niño" },
              { value: "NINA", label: "Niña" },
              { value: "BEBE", label: "Bebé" },
            ]}
            selected={gender}
            onToggle={(v) => toggleMulti("gender", v)}
          />
          <label className="flex items-center gap-2 rounded-xl border border-zs-border bg-white px-3 py-2 text-xs font-medium text-zs-ink">
            <Checkbox
              checked={noImage}
              onCheckedChange={(v) =>
                updateParams((sp) => {
                  if (v) sp.set("noImage", "1");
                  else sp.delete("noImage");
                }, { resetPage: true })
              }
            />
            Sin imagen
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-zs-border bg-white px-3 py-2 text-xs font-medium text-zs-ink">
            <Checkbox
              checked={sinTipoCalzado}
              onCheckedChange={(v) =>
                updateParams((sp) => {
                  if (v) sp.set("sinTipoCalzado", "1");
                  else sp.delete("sinTipoCalzado");
                }, { resetPage: true })
              }
            />
            Sin tipo de calzado
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-zs-border bg-white px-3 py-2 text-xs font-medium text-zs-ink">
            <Checkbox
              checked={sinTipoPrenda}
              onCheckedChange={(v) =>
                updateParams((sp) => {
                  if (v) sp.set("sinTipoPrenda", "1");
                  else sp.delete("sinTipoPrenda");
                }, { resetPage: true })
              }
            />
            Sin tipo de prenda
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-zs-border bg-white px-3 py-2 text-xs font-medium text-zs-ink">
            <Checkbox
              checked={sinVarianteTipoPrenda}
              onCheckedChange={(v) =>
                updateParams((sp) => {
                  if (v) sp.set("sinVarianteTipoPrenda", "1");
                  else sp.delete("sinVarianteTipoPrenda");
                }, { resetPage: true })
              }
            />
            Sin variante de prenda
          </label>

          {(q || source.length || status.length || brandSel.length || categorySel.length || gender.length || noImage || sinTipoCalzado || sinTipoPrenda || sinVarianteTipoPrenda) && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-zs-muted">Orden</span>
            <Select
              value={sort}
              onValueChange={(v) =>
                updateParams((sp) => sp.set("sort", v), { resetPage: true })
              }
            >
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt_desc">Más recientes</SelectItem>
                <SelectItem value="createdAt_asc">Más antiguos</SelectItem>
                <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                <SelectItem value="price_asc">Precio ascendente</SelectItem>
                <SelectItem value="price_desc">Precio descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {popularTags.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-zs-border pt-3">
            <span className="mr-2 text-xs text-zs-muted">Tags:</span>
            {popularTags.slice(0, 15).map((t) => {
              const tagSel = (searchParams?.get("tag") ?? "").split(",").filter(Boolean);
              const active = tagSel.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleMulti("tag", t)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    active
                      ? "border-zs-blue-700 bg-zs-blue-700 text-white"
                      : "border-zs-border bg-white text-zs-muted hover:border-zs-blue-300"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-zs-blue-200 bg-zs-blue-50 p-3 shadow-sm">
          <span className="text-sm font-semibold text-zs-blue-900">
            {selectedIds.length} seleccionado(s)
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulk({ kind: "publish" })}>
              Publicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk({ kind: "unpublish" })}>
              Despublicar
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulk({ kind: "archive" })}>
              Archivar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFootwearValue("__none__");
                setFootwearOpen(true);
              }}
            >
              Tipo de calzado
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setGarmentValue("__none__");
                setGarmentOpen(true);
              }}
            >
              Tipo de prenda
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setVariantValue("__none__");
                setVariantOpen(true);
              }}
            >
              Variante
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkConfirm("draftZeroStock")}
            >
              Pasar a borrador (sin stock)
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkConfirm("delete")}>
              Eliminar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla (≥ sm) / tarjetas apiladas (< sm) */}
      {isPending ? (
        <div className="space-y-2 rounded-2xl border border-zs-border bg-white p-4 shadow-sm">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full sm:h-12" />
          ))}
        </div>
      ) : initialData.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zs-border bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-zs-muted">
            No hay productos que coincidan con los filtros.
          </p>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <>
          {/* Vista tarjeta — sólo móvil (< sm). Cada fila se apila: thumbnail
              + nombre, badges marca/origen, estado + PVP editables y un único
              menú "···" con todas las acciones. */}
          <ul className="space-y-3 sm:hidden">
            {table.getRowModel().rows.map((row) => {
              const r = row.original;
              // Origen oculto a petición del cliente (2026-05-24).
              // const src = SOURCE_VARIANT[r.source] ?? SOURCE_VARIANT.LOCAL!;
              return (
                <li
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="rounded-2xl border border-zs-border bg-white p-3 shadow-sm data-[state=selected]:border-zs-blue-300 data-[state=selected]:bg-zs-blue-50/40"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      aria-label="Seleccionar fila"
                      checked={row.getIsSelected()}
                      onCheckedChange={(v) => row.toggleSelected(!!v)}
                      className="mt-1"
                    />
                    <Link
                      href={`/admin/productos/${r.id}`}
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zs-border bg-zs-surface"
                      aria-label={`Editar ${r.name}`}
                    >
                      {r.mainImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.mainImageUrl}
                          alt={r.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-zs-muted">
                          <ImageOff className="h-5 w-5" />
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/productos/${r.id}`}>
                        <p className="line-clamp-2 text-sm font-semibold text-zs-ink">
                          {r.name}
                        </p>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zs-muted">
                        {r.colorHex && (
                          <span
                            aria-hidden
                            className="inline-block h-3 w-3 rounded-full border border-zs-border"
                            style={{ backgroundColor: r.colorHex }}
                          />
                        )}
                        {r.colorName && <span>{r.colorName}</span>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-zs-border bg-white px-2 py-0.5 text-xs font-medium text-zs-ink">
                          {r.brand.name}
                        </span>
                        {/* Origen oculto a petición del cliente (2026-05-24):
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${src.cls}`}
                        >
                          {src.label}
                        </span>
                        */}
                      </div>
                    </div>
                    <RowActions r={r} onConfirm={setConfirm} variant="menu" />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-zs-border pt-3">
                    <EditableStatusCell id={r.id} initialStatus={r.status} />
                    <EditablePriceCell
                      id={r.id}
                      initialRetailPrice={r.retailPrice}
                      initialSalePrice={r.salePrice}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Vista tabla — sm en adelante. `overflow-x-auto` permite scroll
              horizontal cuando reaparecen columnas; las clases por columna
              (COLUMN_RESPONSIVE) van ocultando las secundarias al estrechar. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-zs-border bg-white shadow-sm sm:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} className={COLUMN_RESPONSIVE[h.column.id] ?? ""}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={COLUMN_RESPONSIVE[cell.column.id] ?? ""}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Paginación */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zs-muted">
        <div className="flex items-center gap-2">
          <span>Por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              updateParams((sp) => sp.set("pageSize", v), { resetPage: true })
            }
          >
            <SelectTrigger className="h-9 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs">
            Página {page} de {totalPages} · {initialData.total.toLocaleString("es-ES")} resultados
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page <= 1}
              onClick={() => updateParams((sp) => sp.set("page", String(page - 1)))}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={page >= totalPages}
              onClick={() => updateParams((sp) => sp.set("page", String(page + 1)))}
              aria-label="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmaciones */}
      <AlertDialog
        open={!!confirm}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null);
            setKeepStockOnDuplicate(false);
            setNewColorOnDuplicate("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "delete" && "¿Eliminar producto?"}
              {confirm?.type === "archive" && "¿Archivar producto?"}
              {confirm?.type === "duplicate" && "¿Duplicar producto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "delete" &&
                `Se eliminará permanentemente "${confirm.name}" junto con sus imágenes y tallas. Esta acción no se puede deshacer.`}
              {confirm?.type === "archive" &&
                `"${confirm?.name}" pasará a estado Inactivo y dejará de mostrarse en la web.`}
              {confirm?.type === "duplicate" &&
                `Se creará una copia de "${confirm.name}" como borrador (hereda el árbol de categorías y el tipo del original). Tendrás que ajustar EAN y datos únicos.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm?.type === "duplicate" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 rounded-lg border border-zs-border bg-zs-surface/50 p-3 text-sm">
                <Checkbox
                  checked={keepStockOnDuplicate}
                  onCheckedChange={(v) => setKeepStockOnDuplicate(v === true)}
                />
                <span>Mantener el stock actual en la copia (si no, se crea con stock 0).</span>
              </label>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zs-ink">Color de la copia (opcional)</label>
                <Input
                  value={newColorOnDuplicate}
                  onChange={(e) => setNewColorOnDuplicate(e.target.value)}
                  placeholder="Vacío = mismo color. Escribe uno para crear otro color."
                  className="h-9"
                />
                <p className="text-xs text-zs-muted">
                  Si lo rellenas, la copia se crea con ese color (1 color = 1 producto) y se ajusta el nombre.
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm?.type === "delete"
                  ? "bg-zs-red-600 text-white hover:bg-zs-red-700"
                  : undefined
              }
              onClick={() => confirm && handleRowAction(confirm)}
            >
              {confirm?.type === "delete" && "Eliminar"}
              {confirm?.type === "archive" && "Archivar"}
              {confirm?.type === "duplicate" && "Duplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkConfirm} onOpenChange={(o) => !o && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm === "delete"
                ? `¿Eliminar ${selectedIds.length} productos?`
                : "¿Pasar a borrador los productos sin stock?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm === "delete"
                ? "Se eliminarán permanentemente junto con sus imágenes y tallas. Acción irreversible."
                : `De los ${selectedIds.length} seleccionados, los que tengan stock total = 0 pasarán a estado BORRADOR (DRAFT) y dejarán de mostrarse en la tienda hasta reponer y reactivar manualmente. Los que tengan stock no se tocan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {bulkConfirm === "delete" ? (
              <AlertDialogAction
                className="bg-zs-red-600 text-white hover:bg-zs-red-700"
                onClick={() => handleBulk({ kind: "delete" })}
              >
                Eliminar todo
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => handleBulk({ kind: "draftZeroStock" })}>
                Pasar a borrador
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk: asignar tipo de calzado (doble validación — cliente bloquea si hay
          no-calzado; el server action vuelve a validar de forma autoritativa). */}
      <Dialog open={footwearOpen} onOpenChange={setFootwearOpen}>
        <DialogContent>
          {(() => {
            const selRows = initialData.rows.filter((r) => selectedIds.includes(r.id));
            const nonCalzado = selRows.filter((r) => !r.isCalzado);
            const allCalzado = selRows.length > 0 && nonCalzado.length === 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Asignar tipo de calzado a {selectedIds.length} producto(s)</DialogTitle>
                  <DialogDescription>Solo aplica a productos de familia calzado.</DialogDescription>
                </DialogHeader>
                {!allCalzado ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {nonCalzado.length} de los seleccionados no son de calzado (p.ej.{" "}
                    {nonCalzado.slice(0, 3).map((r) => `"${r.name}"`).join(", ")}
                    {nonCalzado.length > 3 ? " …" : ""}). Selecciona solo productos de calzado para esta acción.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zs-ink">Tipo de calzado</label>
                    <Select value={footwearValue} onValueChange={setFootwearValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">(sin asignar)</SelectItem>
                        {FOOTWEAR_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {FOOTWEAR_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFootwearOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={!allCalzado}
                    onClick={async () => {
                      await handleBulk({
                        kind: "footwearType",
                        footwearType: footwearValue === "__none__" ? null : (footwearValue as FootwearType),
                      });
                      setFootwearOpen(false);
                    }}
                  >
                    Aplicar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bulk: asignar tipo de prenda (doble validación — cliente bloquea si hay
          no-textil; el server action vuelve a validar de forma autoritativa). */}
      <Dialog open={garmentOpen} onOpenChange={setGarmentOpen}>
        <DialogContent>
          {(() => {
            const selRows = initialData.rows.filter((r) => selectedIds.includes(r.id));
            const nonTextil = selRows.filter((r) => !r.isTextil);
            const allTextil = selRows.length > 0 && nonTextil.length === 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Asignar tipo de prenda a {selectedIds.length} producto(s)</DialogTitle>
                  <DialogDescription>Solo aplica a productos de familia textil.</DialogDescription>
                </DialogHeader>
                {!allTextil ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {nonTextil.length} de los seleccionados no son de textil (p.ej.{" "}
                    {nonTextil.slice(0, 3).map((r) => `"${r.name}"`).join(", ")}
                    {nonTextil.length > 3 ? " …" : ""}). Selecciona solo productos de textil para esta acción.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zs-ink">Tipo de prenda</label>
                    <Select value={garmentValue} onValueChange={setGarmentValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">(sin asignar)</SelectItem>
                        {GARMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {GARMENT_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setGarmentOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={!allTextil}
                    onClick={async () => {
                      await handleBulk({
                        kind: "garmentType",
                        garmentType: garmentValue === "__none__" ? null : (garmentValue as GarmentType),
                      });
                      setGarmentOpen(false);
                    }}
                  >
                    Aplicar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bulk: asignar variante de prenda (Bloque 6 §18). Guard de familia: todos
          los seleccionados deben tener el MISMO garmentType compatible. */}
      <Dialog open={variantOpen} onOpenChange={setVariantOpen}>
        <DialogContent>
          {(() => {
            const selRows = initialData.rows.filter((r) => selectedIds.includes(r.id));
            const validFamilies = ["camiseta", "pantalon", "mallas"];
            const nonValid = selRows.filter((r) => !r.garmentType || !validFamilies.includes(r.garmentType));
            const distinctTypes = Array.from(new Set(selRows.map((r) => r.garmentType).filter(Boolean)));
            const singleFamily = distinctTypes.length === 1 && nonValid.length === 0;
            const targetType = singleFamily ? (distinctTypes[0] as string) : null;
            const availableVariants = targetType
              ? GARMENT_VARIANTS.filter((v) => VARIANT_TO_TYPE[v] === targetType)
              : [];
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Asignar variante a {selectedIds.length} producto(s)</DialogTitle>
                  <DialogDescription>
                    Solo aplica a camiseta, pantalón o mallas. Todos los seleccionados deben ser del mismo tipo.
                  </DialogDescription>
                </DialogHeader>
                {nonValid.length > 0 ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {nonValid.length} de los seleccionados no admiten variante (tipo de prenda incompatible
                    o sin asignar). Ejemplos: {nonValid.slice(0, 3).map((r) => `"${r.name}"`).join(", ")}
                    {nonValid.length > 3 ? " …" : ""}
                  </div>
                ) : !singleFamily ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    La selección incluye distintos tipos de prenda ({distinctTypes.join(", ")}). Selecciona
                    productos del mismo tipo para asignar variante.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zs-ink">Variante de {targetType}</label>
                    <Select value={variantValue} onValueChange={setVariantValue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">(sin asignar)</SelectItem>
                        {availableVariants.map((v) => (
                          <SelectItem key={v} value={v}>
                            {GARMENT_VARIANT_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setVariantOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    disabled={!singleFamily}
                    onClick={async () => {
                      await handleBulk({
                        kind: "garmentVariant",
                        garmentVariant: variantValue === "__none__" ? null : (variantValue as GarmentVariant),
                      });
                      setVariantOpen(false);
                    }}
                  >
                    Aplicar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  label,
  options,
  selected,
  onToggle,
  searchable,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-xs">
          {label}
          {selected.length > 0 && (
            <Badge variant="default" className="ml-1 h-5 px-1.5">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {searchable && (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="mb-2 h-8 text-xs"
          />
        )}
        <div className="max-h-64 space-y-1 overflow-auto">
          {filtered.length === 0 && (
            <p className="px-2 py-1 text-xs text-zs-muted">Sin opciones</p>
          )}
          {filtered.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => onToggle(o.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-zs-surface"
              >
                <Checkbox checked={active} aria-hidden tabIndex={-1} />
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
