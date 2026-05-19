"use client";

/**
 * ImagePicker — modal con 2 pestañas:
 *   1. Subir nueva (UploadDropzone embebido).
 *   2. Seleccionar de la galería existente (lista paginada desde /api/blob/list).
 *
 * Usado por editores de marca, categoría, post blog: seleccionar cover/logo/image
 * sin tener que salir del formulario.
 */
import * as React from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadDropzone, type UploadedImage, type UploadType } from "./UploadDropzone";
import { cn } from "@/lib/utils";

export type ImagePickerProps = {
  /** Tipo de subida si el usuario sube nueva */
  type?: UploadType;
  productId?: string;
  defaultAlt?: string;
  /** Llamado cuando el usuario confirma una imagen. Recibe la URL "large" */
  onSelect: (image: UploadedImage | { url: string }) => void;
  trigger?: React.ReactNode;
  /** Filtrar galería por carpeta */
  galleryFilter?: "product" | "blog" | "brand" | "category" | "";
};

type BlobItem = {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  folder: string;
};

export function ImagePicker({
  type = "product",
  productId,
  defaultAlt = "",
  onSelect,
  trigger,
  galleryFilter = "",
}: ImagePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"upload" | "gallery">("upload");

  const handleSelect = (img: UploadedImage | { url: string }) => {
    onSelect(img);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline">
            <ImageIcon className="mr-1 h-4 w-4" aria-hidden /> Seleccionar imagen
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seleccionar imagen</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "upload" | "gallery")}>
          <TabsList>
            <TabsTrigger value="upload">Subir nueva</TabsTrigger>
            <TabsTrigger value="gallery">Galería</TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <UploadDropzone
              type={type}
              productId={productId}
              defaultAlt={defaultAlt}
              multiple={false}
              onUploaded={(imgs) => imgs[0] && handleSelect(imgs[0])}
            />
          </TabsContent>
          <TabsContent value="gallery">
            <GalleryPicker filter={galleryFilter} onSelect={(url) => handleSelect({ url })} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function GalleryPicker({
  filter,
  onSelect,
}: {
  filter: "product" | "blog" | "brand" | "category" | "";
  onSelect: (url: string) => void;
}) {
  const [items, setItems] = React.useState<BlobItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

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
        // Sólo mostramos "large" (no medium/thumb) para evitar duplicados visuales.
        const filtered = (json.items as BlobItem[]).filter((b) =>
          b.pathname.endsWith("-large.webp"),
        );
        setItems(opts.reset ? filtered : [...items, ...filtered]);
        setCursor(json.cursor);
        setHasMore(Boolean(json.hasMore));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [cursor, filter, items, q],
  );

  React.useEffect(() => {
    void load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setCursor(null);
                void load({ reset: true });
              }
            }}
            placeholder="Buscar por nombre…"
            className="pl-9"
            aria-label="Buscar imagen"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setCursor(null);
            void load({ reset: true });
          }}
        >
          Buscar
        </Button>
      </div>
      <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5">
        {items.map((b) => (
          <button
            key={b.url}
            type="button"
            onClick={() => setSelected(b.url)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
              selected === b.url
                ? "border-zs-blue-700 ring-2 ring-zs-blue-700"
                : "border-zs-border hover:border-zs-blue-500",
            )}
            aria-label={`Seleccionar ${b.pathname}`}
            aria-pressed={selected === b.url}
          >
            <Image
              src={b.url}
              alt={b.pathname}
              fill
              sizes="120px"
              className="object-cover"
              unoptimized
            />
          </button>
        ))}
        {!loading && items.length === 0 && (
          <p className="col-span-full p-6 text-center text-sm text-zs-muted">
            No hay imágenes todavía.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div>
          {loading && (
            <span className="inline-flex items-center text-sm text-zs-muted">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Cargando…
            </span>
          )}
          {hasMore && !loading && (
            <Button variant="outline" size="sm" onClick={() => load()}>
              Cargar más
            </Button>
          )}
        </div>
        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
        >
          Usar imagen
        </Button>
      </div>
    </div>
  );
}
