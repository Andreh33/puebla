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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPriceEUR } from "@/lib/utils";
import type { ProductListResult } from "@/lib/products/queries";
import {
  archiveProductAction,
  bulkAction,
  deleteProductAction,
  duplicateProductAction,
  type BulkActionType,
} from "./_actions";

type Row = ProductListResult["rows"][number];

const SOURCE_VARIANT: Record<string, { label: string; cls: string }> = {
  LOCAL: { label: "Local", cls: "border-zs-blue-200 bg-zs-blue-50 text-zs-blue-900" },
  MIRAVIA: { label: "Miravia", cls: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  AMAZON: { label: "Amazon", cls: "border-amber-300 bg-amber-50 text-amber-900" },
};

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
  NINO: "NiÃ±o",
  NINA: "NiÃ±a",
  BEBE: "BebÃ©",
  NO_ESPECIFICADO: "â€”",
};

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
  const [confirm, setConfirm] = React.useState<{
    type: "delete" | "archive" | "duplicate";
    id: string;
    name: string;
  } | null>(null);
  const [bulkConfirm, setBulkConfirm] = React.useState<null | "delete">(null);

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
      ["q", "source", "status", "brand", "category", "gender", "noImage", "minPrice", "maxPrice", "tag", "page"].forEach(
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
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zs-ink group-hover:text-zs-blue-700">
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
        accessorKey: "brand.name",
        header: "Marca",
        cell: ({ row }) => (
          <span className="text-sm text-zs-ink">{row.original.brand.name}</span>
        ),
      },
      {
        accessorKey: "category.name",
        header: "CategorÃ­a",
        cell: ({ row }) => (
          <span className="text-sm text-zs-muted">{row.original.category.name}</span>
        ),
      },
      {
        accessorKey: "gender",
        header: "GÃ©nero",
        cell: ({ row }) => (
          <span className="text-xs text-zs-muted">{GENDER_LABEL[row.original.gender] ?? "â€”"}</span>
        ),
      },
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
      {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
          const s = STATUS_VARIANT[row.original.status] ?? STATUS_VARIANT.DRAFT!;
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
            >
              {s.label}
            </span>
          );
        },
      },
      {
        accessorKey: "retailPrice",
        header: () => <div className="text-right">PVP</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm">
            {row.original.salePrice ? (
              <div>
                <div className="text-zs-red-600">
                  {formatPriceEUR(row.original.salePrice)}
                </div>
                <div className="text-xs text-zs-muted line-through">
                  {formatPriceEUR(row.original.retailPrice)}
                </div>
              </div>
            ) : (
              formatPriceEUR(row.original.retailPrice)
            )}
          </div>
        ),
      },
      {
        accessorKey: "stock",
        header: () => <div className="text-right">Stock</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm tabular-nums">{row.original.stock}</div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Ver pÃºblico"
                title="Ver pÃºblico"
              >
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
                  <Button variant="ghost" size="icon" aria-label="MÃ¡s acciones">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-44 p-1">
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
                    onClick={() =>
                      setConfirm({ type: "duplicate", id: r.id, name: r.name })
                    }
                  >
                    <Copy className="h-4 w-4" /> Duplicar
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zs-surface"
                    onClick={() =>
                      setConfirm({ type: "archive", id: r.id, name: r.name })
                    }
                  >
                    <Archive className="h-4 w-4" /> Archivar
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zs-red-700 hover:bg-zs-red-50"
                    onClick={() =>
                      setConfirm({ type: "delete", id: r.id, name: r.name })
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          );
        },
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
        const res = await duplicateProductAction(c.id);
        if (res.ok) {
          toast.success("Producto duplicado");
          router.push(`/admin/productos/${res.id}`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setConfirm(null);
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
              placeholder="Buscar por nombre, modelo, EAN, marcaâ€¦"
              className="pl-9"
              aria-label="BÃºsqueda"
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
            label="CategorÃ­a"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            selected={categorySel}
            onToggle={(v) => toggleMulti("category", v)}
            searchable
          />
          <FilterChip
            label="GÃ©nero"
            options={[
              { value: "HOMBRE", label: "Hombre" },
              { value: "MUJER", label: "Mujer" },
              { value: "UNISEX", label: "Unisex" },
              { value: "NINO", label: "NiÃ±o" },
              { value: "NINA", label: "NiÃ±a" },
              { value: "BEBE", label: "BebÃ©" },
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

          {(q || source.length || status.length || brandSel.length || categorySel.length || gender.length || noImage) && (
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
                <SelectItem value="createdAt_desc">MÃ¡s recientes</SelectItem>
                <SelectItem value="createdAt_asc">MÃ¡s antiguos</SelectItem>
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
            <Button size="sm" variant="destructive" onClick={() => setBulkConfirm("delete")}>
              Eliminar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm">
        {isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : initialData.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <p className="text-sm text-zs-muted">
              No hay productos que coincidan con los filtros.
            </p>
            <Button variant="outline" size="sm" onClick={clearAll}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
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
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* PaginaciÃ³n */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zs-muted">
        <div className="flex items-center gap-2">
          <span>Por pÃ¡gina</span>
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
            PÃ¡gina {page} de {totalPages} Â· {initialData.total.toLocaleString("es-ES")} resultados
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
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "delete" && "Â¿Eliminar producto?"}
              {confirm?.type === "archive" && "Â¿Archivar producto?"}
              {confirm?.type === "duplicate" && "Â¿Duplicar producto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "delete" &&
                `Se eliminarÃ¡ permanentemente "${confirm.name}" junto con sus imÃ¡genes y tallas. Esta acciÃ³n no se puede deshacer.`}
              {confirm?.type === "archive" &&
                `"${confirm?.name}" pasarÃ¡ a estado Inactivo y dejarÃ¡ de mostrarse en la web.`}
              {confirm?.type === "duplicate" &&
                `Se crearÃ¡ una copia de "${confirm.name}" como borrador. TendrÃ¡s que ajustar EAN y datos Ãºnicos.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
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
            <AlertDialogTitle>Â¿Eliminar {selectedIds.length} productos?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarÃ¡n permanentemente junto con sus imÃ¡genes y tallas. AcciÃ³n irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-zs-red-600 text-white hover:bg-zs-red-700"
              onClick={() => handleBulk({ kind: "delete" })}
            >
              Eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
            placeholder="Buscarâ€¦"
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
