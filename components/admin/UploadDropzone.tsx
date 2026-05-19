"use client";

/**
 * UploadDropzone â€” drag & drop reutilizable para imágenes admin.
 *
 * - Comprime client-side con browser-image-compression antes de enviar.
 * - Subida POST multipart/form-data a /api/upload.
 * - También soporta ingesta por URL con /api/upload-from-url.
 *
 * Usado por:
 *   - app/admin/productos/[id]/edit/...  (editor de imágenes de producto)
 *   - app/admin/blog/[id]/edit/...       (cover de post)
 *   - app/admin/marcas/[id]/edit/...     (logo de marca)
 *   - app/admin/categorias/[id]/edit/... (imagen de categoría)
 *   - app/admin/imagenes/...             (galería general)
 */
import * as React from "react";
import { UploadCloud, X, Link2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export type UploadedImage = {
  url: string;
  urlMedium: string;
  urlThumb: string;
  blurDataUrl: string;
  width: number;
  height: number;
  id?: string | null;
};

export type UploadType = "product" | "blog" | "brand" | "category";

export type UploadDropzoneProps = {
  type?: UploadType;
  productId?: string;
  /** alt SEO por defecto (luego el usuario puede ajustar) */
  defaultAlt?: string;
  /** Si false, sólo permite 1 archivo a la vez */
  multiple?: boolean;
  maxFiles?: number;
  onUploaded?: (images: UploadedImage[]) => void;
  className?: string;
};

type FileTask = {
  id: string;
  file: File;
  name: string;
  status: "pending" | "compressing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  result?: UploadedImage;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

async function compressIfNeeded(file: File): Promise<File> {
  // Importación dinámica â€” la lib es pesada y sólo se necesita en cliente.
  const { default: imageCompression } = await import("browser-image-compression");
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 4,
      maxWidthOrHeight: 1600,
      initialQuality: 0.85,
      useWebWorker: true,
      fileType: file.type === "image/png" ? "image/png" : "image/webp",
    });
    // Si tras comprimir es mayor que el original, usamos el original.
    return compressed.size < file.size ? compressed : file;
  } catch {
    return file; // si falla la compresión, subimos el original
  }
}

export function UploadDropzone({
  type = "product",
  productId,
  defaultAlt = "",
  multiple = true,
  maxFiles = 20,
  onUploaded,
  className,
}: UploadDropzoneProps) {
  const [tasks, setTasks] = React.useState<FileTask[]>([]);
  const [alt, setAlt] = React.useState(defaultAlt);
  const [dragOver, setDragOver] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [urlBusy, setUrlBusy] = React.useState(false);
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const updateTask = React.useCallback((id: string, patch: Partial<FileTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const uploadOne = React.useCallback(
    async (task: FileTask, currentAlt: string) => {
      try {
        updateTask(task.id, { status: "compressing", progress: 5 });
        const compressed = await compressIfNeeded(task.file);
        updateTask(task.id, { status: "uploading", progress: 30 });

        const fd = new FormData();
        fd.append("file", compressed, task.name);
        fd.append("alt", currentAlt || task.name);
        if (productId) fd.append("productId", productId);

        const res = await fetch(`/api/upload?type=${encodeURIComponent(type)}`, {
          method: "POST",
          body: fd,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        const item = json.results?.[0];
        if (!item?.ok) {
          throw new Error(item?.error ?? "Subida fallida");
        }
        updateTask(task.id, {
          status: "done",
          progress: 100,
          result: item.data as UploadedImage,
        });
        return item.data as UploadedImage;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error";
        updateTask(task.id, { status: "error", progress: 0, error: msg });
        return null;
      }
    },
    [productId, type, updateTask],
  );

  const handleFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).slice(0, maxFiles);
      if (!arr.length) return;
      if (!multiple && arr.length > 1) arr.length = 1;

      const newTasks: FileTask[] = arr.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        status: "pending",
        progress: 0,
      }));
      setTasks((prev) => [...prev, ...newTasks]);

      const currentAlt = alt;
      const results: UploadedImage[] = [];
      // Subida secuencial para no saturar el servidor / sharp.
      for (const t of newTasks) {
        const r = await uploadOne(t, currentAlt);
        if (r) results.push(r);
      }
      if (results.length && onUploaded) onUploaded(results);
    },
    [alt, maxFiles, multiple, onUploaded, uploadOne],
  );

  const handleUrlSubmit = React.useCallback(async () => {
    setUrlError(null);
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!alt.trim()) {
      setUrlError("Introduce un alt SEO primero");
      return;
    }
    setUrlBusy(true);
    try {
      const res = await fetch("/api/upload-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmed,
          alt: alt.trim(),
          type,
          productId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const result = json.data as UploadedImage;
      setUrlInput("");
      if (onUploaded) onUploaded([result]);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Error");
    } finally {
      setUrlBusy(false);
    }
  }, [alt, onUploaded, productId, type, urlInput]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="upload-alt">Texto alternativo (alt SEO)</Label>
        <Input
          id="upload-alt"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Ej: Camiseta running John Smith roja vista frontal"
          maxLength={200}
        />
        <p className="text-xs text-zs-muted">
          Se aplicará a todas las imágenes subidas. Puedes editarlo después por imagen.
        </p>
      </div>

      <Tabs defaultValue="file">
        <TabsList>
          <TabsTrigger value="file">
            <UploadCloud className="mr-1 h-4 w-4" aria-hidden /> Archivos
          </TabsTrigger>
          <TabsTrigger value="url">
            <Link2 className="mr-1 h-4 w-4" aria-hidden /> Desde URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <div
            role="button"
            tabIndex={0}
            aria-label="Arrastra archivos aquí o haz clic para seleccionar"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.length) {
                void handleFiles(e.dataTransfer.files);
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
              dragOver
                ? "border-zs-blue-700 bg-zs-blue-50"
                : "border-zs-border bg-white hover:bg-zs-surface",
            )}
          >
            <UploadCloud className="h-8 w-8 text-zs-muted" aria-hidden />
            <p className="text-sm font-medium text-zs-ink">
              Arrastra imágenes o haz clic
            </p>
            <p className="text-xs text-zs-muted">
              JPEG, PNG, WebP o AVIF · Máx 10 MB · Hasta {maxFiles} archivos
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple={multiple}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="url">
          <div className="space-y-2 rounded-2xl border border-zs-border bg-white p-4">
            <Label htmlFor="upload-url">URL externa (Amazon, Miravia, John Smith…)</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="upload-url"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://m.media-amazon.com/images/I/…"
                disabled={urlBusy}
              />
              <Button onClick={handleUrlSubmit} disabled={urlBusy || !urlInput.trim()}>
                {urlBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                Importar
              </Button>
            </div>
            {urlError && (
              <p className="flex items-center gap-1 text-xs text-zs-red-600" role="alert">
                <AlertCircle className="h-3 w-3" aria-hidden /> {urlError}
              </p>
            )}
            <p className="text-xs text-zs-muted">
              Sólo dominios permitidos: Amazon, Miravia, John Smith, MAS 8000.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {tasks.length > 0 && (
        <ul className="space-y-2" aria-label="Progreso de subidas">
          {tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-zs-border bg-white p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zs-ink">
                    {t.name}
                  </span>
                  <span className="text-xs text-zs-muted shrink-0">
                    {t.status === "done" && (
                      <CheckCircle2
                        className="inline h-4 w-4 text-emerald-600"
                        aria-label="Completado"
                      />
                    )}
                    {t.status === "error" && (
                      <span className="text-zs-red-600" role="alert">
                        Error
                      </span>
                    )}
                    {(t.status === "uploading" || t.status === "compressing") && (
                      <>
                        <Loader2 className="inline h-3 w-3 animate-spin" aria-hidden />{" "}
                        {t.status === "compressing" ? "Comprimiendo" : "Subiendo"}…
                      </>
                    )}
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zs-surface"
                  role="progressbar"
                  aria-valuenow={t.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn(
                      "h-full transition-all",
                      t.status === "error" ? "bg-zs-red-600" : "bg-zs-blue-700",
                    )}
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
                {t.error && (
                  <p className="mt-1 text-xs text-zs-red-600" role="alert">
                    {t.error}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTasks((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded p-1 text-zs-muted hover:bg-zs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
                aria-label={`Quitar ${t.name} de la lista`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
