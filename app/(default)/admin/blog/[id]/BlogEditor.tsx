"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Save,
  Trash2,
  ChevronDown,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BlogPostSchema } from "@/lib/validators";
import { slugifyEs } from "@/lib/seo/slug";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { UploadDropzone, type UploadedImage } from "@/components/admin/UploadDropzone";
import { BLOG_TEMPLATES, getTemplateById } from "@/lib/blog/templates";
import { createPost, updatePost, deletePost } from "../_actions";

type FormValues = z.input<typeof BlogPostSchema>;

type Props = {
  postId: string | null;
  initial: Partial<FormValues> & { id?: string };
};

const AUTOSAVE_KEY_PREFIX = "zs:blog-draft:";
const AUTOSAVE_INTERVAL_MS = 30_000;

export function BlogEditor({ postId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [autosaveAt, setAutosaveAt] = useState<Date | null>(null);
  const [restoreOffer, setRestoreOffer] = useState<FormValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [imagesWarning, setImagesWarning] = useState<string | null>(null);

  const defaults: FormValues = {
    title: initial.title ?? "",
    slug: initial.slug ?? "",
    excerpt: initial.excerpt ?? "",
    contentMd: initial.contentMd ?? "",
    coverImageUrl: initial.coverImageUrl ?? "",
    ogImageUrl: initial.ogImageUrl ?? "",
    author: initial.author ?? "Equipo Zona Sport",
    tags: initial.tags ?? [],
    status: initial.status ?? "DRAFT",
    metaTitle: initial.metaTitle ?? "",
    metaDescription: initial.metaDescription ?? "",
    publishedAt: (initial.publishedAt as Date | null | undefined) ?? null,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    getValues,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(BlogPostSchema) as never,
    defaultValues: defaults,
    mode: "onBlur",
  });

  const title = watch("title");
  const slug = watch("slug");
  const contentMd = watch("contentMd");
  const status = watch("status");
  const tags = watch("tags") ?? [];

  const autosaveKey = useMemo(
    () => `${AUTOSAVE_KEY_PREFIX}${postId ?? "new"}`,
    [postId],
  );

  // --- Autoslug desde título (sólo si el slug está vacío o aún no ha sido tocado) ---
  const slugTouchedRef = useRef(!!initial.slug);
  useEffect(() => {
    if (!title) return;
    if (slugTouchedRef.current) return;
    setValue("slug", slugifyEs(title), { shouldValidate: true });
  }, [title, setValue]);

  // --- Slug uniqueness check (debounced) ---
  useEffect(() => {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const url = new URL("/api/blog/slug-check", window.location.origin);
        url.searchParams.set("slug", slug);
        if (postId) url.searchParams.set("exclude", postId);
        const res = await fetch(url.toString());
        const json = (await res.json()) as { available: boolean };
        setSlugStatus(json.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [slug, postId]);

  // --- Autosave a localStorage cada 30s ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setInterval(() => {
      try {
        const v = getValues();
        if (!v.title && !v.contentMd) return;
        localStorage.setItem(autosaveKey, JSON.stringify({ savedAt: new Date().toISOString(), values: v }));
        setAutosaveAt(new Date());
      } catch {
        // quota o privacy mode
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autosaveKey, getValues]);

  // --- Detectar borrador localStorage al montar ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(autosaveKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: string; values: FormValues };
      const isDifferent =
        parsed.values.contentMd !== defaults.contentMd ||
        parsed.values.title !== defaults.title;
      if (isDifferent && parsed.values.title) {
        setRestoreOffer(parsed.values);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveKey]);

  // --- Warning si el markdown contiene imágenes con alt vacío ---
  useEffect(() => {
    const md = contentMd ?? "";
    const emptyAlt = /!\[\s*\]\(/.test(md);
    setImagesWarning(
      emptyAlt
        ? "El contenido tiene imágenes sin texto alternativo. Añade un alt descriptivo a cada imagen para SEO y accesibilidad."
        : null,
    );
  }, [contentMd]);

  function restoreDraft() {
    if (!restoreOffer) return;
    reset(restoreOffer);
    setRestoreOffer(null);
  }

  function discardDraft() {
    try {
      localStorage.removeItem(autosaveKey);
    } catch {
      // ignore
    }
    setRestoreOffer(null);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...tags, t], { shouldDirty: true });
    setTagInput("");
  }

  function removeTag(t: string) {
    setValue(
      "tags",
      tags.filter((x) => x !== t),
      { shouldDirty: true },
    );
  }

  function applyTemplate(id: string) {
    const t = getTemplateById(id);
    if (!t) return;
    if (contentMd && contentMd.length > 80) {
      if (!confirm("Esto sustituirá el contenido actual. ¿Continuar?")) return;
    }
    setValue("contentMd", t.contentMd, { shouldDirty: true });
    if (!getValues("title")) setValue("title", t.title, { shouldDirty: true });
    if (!getValues("excerpt")) setValue("excerpt", t.suggestedExcerpt, { shouldDirty: true });
    if ((getValues("tags") ?? []).length === 0)
      setValue("tags", t.suggestedTags, { shouldDirty: true });
    if (!getValues("slug")) setValue("slug", t.suggestedSlug, { shouldDirty: true });
    setTemplateDialog(false);
  }

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = postId
        ? await updatePost(postId, values)
        : await createPost(values);
      if (!res.ok) {
        setServerError(res.error || "No se pudo guardar.");
        return;
      }
      try {
        localStorage.removeItem(autosaveKey);
      } catch {
        // ignore
      }
      if (!postId && res.id) {
        router.replace(`/admin/blog/${res.id}`);
        return;
      }
      router.refresh();
    });
  }

  function onSubmitAndPublish() {
    setValue("status", "PUBLISHED");
    handleSubmit(onSubmit)();
  }

  function onDelete() {
    if (!postId) return;
    startTransition(async () => {
      const res = await deletePost(postId);
      if (res.ok) {
        try {
          localStorage.removeItem(autosaveKey);
        } catch {
          // ignore
        }
        router.push("/admin/blog");
      }
    });
  }

  const metaTitle = watch("metaTitle") ?? "";
  const metaDescription = watch("metaDescription") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Cabecera de acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zs-border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-zs-blue-700" />
          <div>
            <p className="text-sm font-semibold text-zs-blue-900">
              {postId ? "Editar artículo" : "Nuevo artículo"}
            </p>
            <p className="text-xs text-zs-muted">
              {status === "PUBLISHED" ? (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Publicado
                </span>
              ) : (
                "Borrador"
              )}
              {autosaveAt && (
                <span className="ml-2 text-zs-muted">
                  · Autoguardado a las {autosaveAt.toLocaleTimeString("es-ES")}
                </span>
              )}
              {isDirty && <span className="ml-2 text-amber-700">· Cambios sin guardar</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTemplateDialog(true)}
          >
            <FileText className="h-4 w-4" /> Plantillas
          </Button>
          {slug && status === "PUBLISHED" && (
            <Button asChild variant="outline">
              <a href={`/blog/${slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Ver público
              </a>
            </Button>
          )}
          {postId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 text-zs-red-600" /> Eliminar
            </Button>
          )}
          <Button type="submit" disabled={pending || slugStatus === "taken"}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
          {status !== "PUBLISHED" && (
            <Button
              type="button"
              onClick={onSubmitAndPublish}
              disabled={pending || slugStatus === "taken"}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" /> Publicar
            </Button>
          )}
        </div>
      </div>

      {restoreOffer && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            Tenemos un borrador autoguardado más reciente que el servidor.
            ¿Quieres restaurarlo?
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={discardDraft}>
              Descartar
            </Button>
            <Button type="button" size="sm" onClick={restoreDraft}>
              Restaurar
            </Button>
          </div>
        </div>
      )}

      {serverError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mr-2 inline h-4 w-4" /> {serverError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* COLUMNA IZQUIERDA — METADATOS */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-zs-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zs-blue-900">Contenido principal</h2>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input id="title" {...register("title")} placeholder="Título visible del post" />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>

              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  {...register("slug", {
                    onChange: () => {
                      slugTouchedRef.current = true;
                    },
                  })}
                  placeholder="mi-articulo-en-url"
                />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-zs-muted">/blog/{slug || "…"}</span>
                  {slugStatus === "checking" && (
                    <span className="text-zs-muted">Comprobando…</span>
                  )}
                  {slugStatus === "available" && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Check className="h-3 w-3" /> Disponible
                    </span>
                  )}
                  {slugStatus === "taken" && (
                    <span className="text-red-600">Ya existe otro post con ese slug</span>
                  )}
                </div>
                {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
              </div>

              <div>
                <Label htmlFor="excerpt">Resumen / excerpt</Label>
                <textarea
                  id="excerpt"
                  {...register("excerpt")}
                  rows={3}
                  maxLength={500}
                  placeholder="Frase corta que se mostrará en listados y meta description por defecto."
                  className="flex min-h-[80px] w-full rounded-xl border border-zs-border bg-white px-4 py-2 text-sm text-zs-ink shadow-sm placeholder:text-zs-muted focus-visible:border-zs-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700/40"
                />
              </div>

              <div>
                <Label htmlFor="author">Autor</Label>
                <Input id="author" {...register("author")} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zs-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zs-blue-900">Publicación</h2>

            <div className="space-y-3">
              <div>
                <Label>Estado</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                        <SelectItem value="PUBLISHED">Publicado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="publishedAt">Fecha de publicación (programable)</Label>
                <Controller
                  control={control}
                  name="publishedAt"
                  render={({ field }) => (
                    <Input
                      id="publishedAt"
                      type="datetime-local"
                      value={
                        field.value
                          ? toLocalInput(field.value as Date | string)
                          : ""
                      }
                      onChange={(e) =>
                        field.onChange(e.target.value ? new Date(e.target.value) : null)
                      }
                    />
                  )}
                />
                <p className="mt-1 text-xs text-zs-muted">
                  Si está vacío y publicas el post, se rellenará con la fecha actual.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zs-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zs-blue-900">Etiquetas</h2>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 pr-1">
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Quitar etiqueta ${t}`}
                    className="ml-1 rounded-full p-0.5 hover:bg-zs-border"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="añade-una-etiqueta"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="h-4 w-4" /> Añadir
              </Button>
            </div>
            <p className="mt-2 text-xs text-zs-muted">
              Las etiquetas relacionan el post con productos del catálogo que compartan etiqueta.
            </p>
          </section>

          <section className="rounded-2xl border border-zs-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zs-blue-900">Imágenes</h2>
            <div className="space-y-5">
              <Controller
                control={control}
                name="coverImageUrl"
                render={({ field }) => (
                  <BlogImageField
                    label="Imagen de portada"
                    hint="Se mostrará al principio del post y en cards (recomendado 1600×900)."
                    value={field.value ?? ""}
                    onChange={(url) => field.onChange(url ?? "")}
                  />
                )}
              />
              <Controller
                control={control}
                name="ogImageUrl"
                render={({ field }) => (
                  <BlogImageField
                    label="Imagen Open Graph"
                    hint="Opcional. Si la dejas en blanco usaremos la portada y, si tampoco existe, la OG dinámica."
                    value={field.value ?? ""}
                    onChange={(url) => field.onChange(url ?? "")}
                  />
                )}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zs-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-zs-blue-900">SEO</h2>
            <div className="space-y-3">
              <div>
                <Label htmlFor="metaTitle">Meta título</Label>
                <Input id="metaTitle" {...register("metaTitle")} maxLength={70} placeholder="Si lo dejas en blanco, usamos el título." />
                <div className="mt-1 flex items-center justify-between text-xs text-zs-muted">
                  <span>Recomendado: 50-60 caracteres</span>
                  <span className={metaTitle.length > 65 ? "text-amber-700" : ""}>{metaTitle.length}/70</span>
                </div>
              </div>
              <div>
                <Label htmlFor="metaDescription">Meta descripción</Label>
                <textarea
                  id="metaDescription"
                  {...register("metaDescription")}
                  rows={3}
                  maxLength={170}
                  placeholder="Si lo dejas en blanco, usamos el excerpt."
                  className="flex min-h-[80px] w-full rounded-xl border border-zs-border bg-white px-4 py-2 text-sm text-zs-ink shadow-sm placeholder:text-zs-muted focus-visible:border-zs-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700/40"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-zs-muted">
                  <span>Recomendado: 140-160 caracteres</span>
                  <span className={metaDescription.length > 165 ? "text-amber-700" : ""}>{metaDescription.length}/170</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA — EDITOR */}
        <div className="space-y-3">
          {imagesWarning && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {imagesWarning}
            </div>
          )}
          <Controller
            control={control}
            name="contentMd"
            render={({ field }) => (
              <MarkdownEditor
                value={field.value}
                onChange={field.onChange}
                defaultAlt={title}
              />
            )}
          />
          {errors.contentMd && (
            <p className="text-xs text-red-600">{errors.contentMd.message as string}</p>
          )}
        </div>
      </div>

      {/* Dialog: plantillas */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva entrada desde plantilla</DialogTitle>
            <DialogDescription>
              Sustituye el contenido actual del editor por una plantilla editorial pre-redactada.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {BLOG_TEMPLATES.map((t) => (
              <li key={t.id} className="rounded-xl border border-zs-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-zs-blue-900">{t.title}</p>
                    <p className="mt-1 text-xs text-zs-muted">{t.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.suggestedTags.map((tg) => (
                        <Badge key={tg} variant="secondary" className="text-[10px]">
                          {tg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button type="button" size="sm" onClick={() => applyTemplate(t.id)}>
                    Usar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Dialog: eliminar */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar artículo</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El post se eliminará definitivamente y se invalidará
              su URL pública.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function toLocalInput(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Sub-componente: campo de imagen con UploadDropzone existente + URL externa
// ---------------------------------------------------------------------------

function BlogImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(value);

  function handleUploaded(images: UploadedImage[]) {
    const first = images[0];
    if (first?.url) {
      onChange(first.url);
      setUrlInput(first.url);
      setOpen(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setUrlInput("");
            }}
            className="text-xs text-zs-red-600 hover:underline"
          >
            Quitar
          </button>
        )}
      </div>
      <p className="text-xs text-zs-muted">{hint}</p>

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt={label}
          className="aspect-[16/9] w-full rounded-xl border border-zs-border bg-zs-surface object-cover"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl border-2 border-dashed border-zs-border bg-zs-surface text-xs text-zs-muted">
          Sin imagen asignada
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
          {open ? "Cerrar subida" : "Subir / desde URL"}
        </Button>
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="O pega una URL pública…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onBlur={() => {
              const v = urlInput.trim();
              if (!v) onChange(null);
              else if (/^https?:\/\//.test(v)) onChange(v);
            }}
          />
        </div>
      </div>

      {open && (
        <div className="rounded-xl border border-zs-border bg-zs-surface/40 p-3">
          <UploadDropzone
            type="blog"
            multiple={false}
            maxFiles={1}
            defaultAlt={label}
            onUploaded={handleUploaded}
          />
        </div>
      )}
    </div>
  );
}
