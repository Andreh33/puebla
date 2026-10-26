"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search, Trash2, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Reference = {
  type: "product" | "blog" | "brand" | "category";
  id: string;
  label: string;
  field: string;
};

type BlobItem = {
  url: string;
  pathname: string;
  uploadedAt: string;
  size: number;
  isReferenced: boolean;
  references: Reference[];
  folder: string;
};

type Filter = "" | "orphans" | "product" | "blog" | "brand" | "category";

export function GalleryClient() {
  const [items, setItems] = React.useState<BlobItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [detail, setDetail] = React.useState<BlobItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(
    async (opts: { reset?: boolean } = {}) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (filter) sp.set("filter", filter);
        if (!opts.reset && cursor) sp.set("cursor", cursor);
        const res = await fetch(`/api/blob/list?${sp.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Error");
        setItems(opts.reset ? json.items : [...items, ...json.items]);
        setCursor(json.cursor);
        setHasMore(Boolean(json.hasMore));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error cargando");
      } finally {
        setLoading(false);
      }
    },
    [cursor, filter, items, q],
  );

  React.useEffect(() => {
    setCursor(null);
    void load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const toggleSelect = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/blob/list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Algunas imágenes siguen referenciadas. Desasocia primero.");
        } else {
          toast.error(json.error ?? "Error");
        }
        return;
      }
      toast.success(`${json.deleted} imágenes eliminadas`);
      setSelected(new Set());
      setCursor(null);
      void load({ reset: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setDeleting(false);
    }
  };

  const onSearch = () => {
    setCursor(null);
    void load({ reset: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="gallery-search">Buscar por nombre</Label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
            <Input
              id="gallery-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="ej: m24205-rojo…"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="gallery-filter">Filtro</Label>
          <select
            id="gallery-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="mt-1 h-11 rounded-xl border border-zs-border bg-white px-3 text-sm text-zs-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
          >
            <option value="">Todas</option>
            <option value="orphans">Huérfanas (sin referencias)</option>
            <option value="product">Productos</option>
            <option value="blog">Blog</option>
            <option value="brand">Marcas</option>
            <option value="category">Categorías</option>
          </select>
        </div>
        <Button variant="outline" onClick={onSearch}>
          <RefreshCw className="mr-1 h-4 w-4" aria-hidden /> Refrescar
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-zs-border bg-zs-blue-50 p-3">
          <p className="text-sm font-medium text-zs-blue-900">
            {selected.size} {selected.size === 1 ? "imagen seleccionada" : "imágenes seleccionadas"}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-4 w-4" />
                )}
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar {selected.size} imágenes?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción es irreversible. Las imágenes referenciadas en productos/blog/marcas
                  no se podrán eliminar — desasocialas primero.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSelected}
                  className="bg-zs-red-600 hover:bg-zs-red-700"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        aria-label="Galería de imágenes"
      >
        {items.map((it) => (
          <li
            key={it.url}
            className={cn(
              "group relative overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all",
              selected.has(it.url) ? "border-zs-blue-700" : "border-zs-border",
              !it.isReferenced && "ring-1 ring-amber-300",
            )}
          >
            <div className="absolute left-2 top-2 z-10">
              <Checkbox
                checked={selected.has(it.url)}
                onCheckedChange={() => toggleSelect(it.url)}
                aria-label={`Seleccionar ${it.pathname}`}
                className="bg-white"
              />
            </div>
            {!it.isReferenced && (
              <Badge
                variant="secondary"
                className="absolute right-2 top-2 z-10 bg-amber-100 text-amber-800"
              >
                Huérfana
              </Badge>
            )}
            <button
              type="button"
              onClick={() => setDetail(it)}
              className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
              aria-label={`Ver detalles de ${it.pathname}`}
            >
              <div className="relative aspect-square">
                <Image
                  src={it.url}
                  alt={it.pathname}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="border-t border-zs-border px-2 py-1.5">
                <p className="truncate text-xs text-zs-ink" title={it.pathname}>
                  {it.pathname.split("/").pop()}
                </p>
                <p className="text-[10px] text-zs-muted">
                  {formatBytes(it.size)} · {formatDate(it.uploadedAt)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {!loading && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-zs-border p-12 text-center text-sm text-zs-muted">
          No hay imágenes que coincidan con el filtro.
        </p>
      )}

      <div className="flex justify-center pt-2">
        {loading ? (
          <span className="inline-flex items-center gap-1 text-sm text-zs-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </span>
        ) : hasMore ? (
          <Button variant="outline" onClick={() => load()}>
            Cargar más
          </Button>
        ) : null}
      </div>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto sm:max-w-md">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="break-words text-base">
                  {detail.pathname.split("/").pop()}
                </SheetTitle>
                <SheetDescription className="break-all">{detail.pathname}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-zs-border">
                  <Image
                    src={detail.url}
                    alt={detail.pathname}
                    fill
                    sizes="400px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="font-medium text-zs-muted">Tamaño</dt>
                  <dd>{formatBytes(detail.size)}</dd>
                  <dt className="font-medium text-zs-muted">Subida</dt>
                  <dd>{formatDate(detail.uploadedAt)}</dd>
                  <dt className="font-medium text-zs-muted">Carpeta</dt>
                  <dd>{detail.folder}</dd>
                  <dt className="font-medium text-zs-muted">Estado</dt>
                  <dd>
                    {detail.isReferenced ? (
                      <Badge>Referenciada</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Huérfana
                      </Badge>
                    )}
                  </dd>
                </dl>
                <div>
                  <h3 className="text-sm font-semibold text-zs-ink">URL pública</h3>
                  <code className="mt-1 block break-all rounded bg-zs-surface p-2 text-xs">
                    {detail.url}
                  </code>
                </div>
                {detail.references.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zs-ink">
                      Usada en ({detail.references.length})
                    </h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      {detail.references.map((r, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Badge variant="outline">{r.type}</Badge>
                          <Link
                            href={hrefForRef(r)}
                            className="truncate text-zs-blue-700 hover:underline"
                          >
                            {r.label}
                          </Link>
                          <span className="text-xs text-zs-muted">({r.field})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!detail.isReferenced && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p className="flex items-center gap-1 font-medium">
                      <Info className="h-4 w-4" aria-hidden /> Sin referencias
                    </p>
                    <p className="mt-1">Esta imagen no se usa en ningún contenido. Puedes eliminarla.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function hrefForRef(r: Reference): string {
  switch (r.type) {
    case "product":
      return `/admin/productos/${r.id}`;
    case "blog":
      return `/admin/blog/${r.id}`;
    case "brand":
      return `/admin/marcas/${r.id}`;
    case "category":
      return `/admin/categorias/${r.id}`;
  }
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}
