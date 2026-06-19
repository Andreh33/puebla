"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  ImageOff,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductSchema, ProductSizeSchema } from "@/lib/validators";
import { FOOTWEAR_TYPES, FOOTWEAR_TYPE_LABELS } from "@/lib/categories/footwear";
import { GARMENT_TYPES, GARMENT_TYPE_LABELS, GARMENT_VARIANTS, GARMENT_VARIANT_LABELS, VARIANT_TO_TYPE, type GarmentVariant } from "@/lib/categories/garment";
import { slugifyEs } from "@/lib/seo/slug";
import { formatDateTimeES } from "@/lib/utils";
import { parseNullableNumber } from "@/lib/forms/number";
import {
  createProductAction,
  updateProductAction,
} from "../_actions";
import { UploadDropzone, type UploadedImage } from "@/components/admin/UploadDropzone";
import { CategoryTreePicker, type CategoryNode } from "./CategoryTreePicker";
import { createCategoryAction } from "@/app/admin/categorias/_actions";

// Form schema: include sizes (array) and accept null/empty strings
const FormSchema = ProductSchema.extend({
  sizes: z.array(ProductSizeSchema).default([]),
  hasSizes: z.boolean().default(true),
  // categoryId NO es un campo editable del formulario: se DERIVA en onSubmit
  // desde el selector de categorías (selectedCategoryIds → primaryCategoryId) y
  // nunca se hace setValue("categoryId"). Con la validación estricta de
  // ProductSchema (cuid obligatorio), su valor por defecto "" rompe SIEMPRE la
  // validación de cliente → el formulario no se envía (Guardar/Publicar no hace
  // nada y no se ve ningún campo en rojo). Se valida aparte en onSubmit
  // ("Selecciona al menos una categoría") y el servidor la revalida con
  // ProductSchema antes de guardar.
  categoryId: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

type BrandOption = { id: string; name: string; slug: string };

// Extended image type for state (includes all DB fields)
type ImageState = {
  id: string;
  url: string;
  urlThumb: string | null;
  urlMedium: string | null;
  blurDataUrl: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  position: number;
};

interface EditorProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    name: string;
    slug: string;
    shortName: string | null;
    description: string | null;
    brandId: string;
    categoryId: string;
    source: string;
    externalId: string | null;
    externalUrl: string | null;
    modelCode: string | null;
    sku: string | null;
    colorName: string;
    colorHex: string | null;
    gender: string;
    sportUse: string | null;
    footwearType: string | null;
    garmentType: string | null;
    garmentVariant: string | null;
    primaryCategorySlug: string | null;
    composition: string | null;
    costPrice: number | null;
    retailPrice: number;
    salePrice: number | null;
    taxRate: number;
    tags: string[];
    status: string;
    stock: number;
    weight: number | null;
    isFeatured: boolean;
    isOutlet: boolean;
    isCustomized: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    mainImageUrl: string | null;
    images: Array<{
      id: string;
      url: string;
      urlThumb: string | null;
      urlMedium?: string | null;
      blurDataUrl?: string | null;
      width?: number | null;
      height?: number | null;
      alt: string;
      position: number;
    }>;
    sizes: Array<{
      id: string;
      size: string;
      ean: string | null;
      stock: number;
      costPrice: number | null;
      retailPrice: number | null;
    }>;
    audits: Array<{
      id: string;
      action: string;
      changes: unknown;
      userId: string | null;
      createdAt: string;
    }>;
    // m2m categories
    categoryIds?: string[];
    primaryCategoryId?: string | null;
  };
  brands: BrandOption[];
  categories: CategoryNode[];
  userRole: "OWNER" | "EDITOR";
}

// Derive gender label from selected category slugs
const GENDER_ROOTS: Record<string, string> = {
  hombre: "Hombre",
  mujer: "Mujer",
  nino: "Niño",
  nina: "Niña",
  bebe: "Bebé",
};

function deriveGenderLabel(selectedIds: string[], allCats: CategoryNode[]): string {
  // Walk up the tree from each selected category to find root
  const catById = new Map(allCats.map((c) => [c.id, c]));

  function rootSlug(id: string): string {
    let cur = catById.get(id);
    while (cur && cur.parentId) {
      cur = catById.get(cur.parentId);
    }
    return cur?.slug ?? "";
  }

  const rootSlugs = new Set(selectedIds.map(rootSlug).filter(Boolean));
  const matched = Object.keys(GENDER_ROOTS).filter((k) => rootSlugs.has(k));

  if (matched.length === 0) return "Sin especificar";
  if (matched.length === 1) return GENDER_ROOTS[matched[0] as keyof typeof GENDER_ROOTS] ?? "Sin especificar";
  return "Unisex";
}

// Derive gender enum value (for product.gender field in payload)
function deriveGenderValue(selectedIds: string[], allCats: CategoryNode[]): FormValues["gender"] {
  const label = deriveGenderLabel(selectedIds, allCats);
  switch (label) {
    case "Hombre": return "HOMBRE";
    case "Mujer": return "MUJER";
    case "Niño": return "NINO";
    case "Niña": return "NINA";
    case "Bebé": return "BEBE";
    case "Unisex": return "UNISEX";
    default: return "NO_ESPECIFICADO";
  }
}

export function ProductEditor({ mode, initial, brands: initialBrands, categories: initialCategories, userRole }: EditorProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [tab, setTab] = React.useState("general");
  const [brands, setBrands] = React.useState(initialBrands);
  const [cats, setCats] = React.useState<CategoryNode[]>(initialCategories);
  const [images, setImages] = React.useState<ImageState[]>(
    (initial?.images ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      urlThumb: img.urlThumb ?? null,
      urlMedium: img.urlMedium ?? null,
      blurDataUrl: img.blurDataUrl ?? null,
      width: img.width ?? null,
      height: img.height ?? null,
      alt: img.alt,
      position: img.position,
    }))
  );
  const [mainImageUrl, setMainImageUrl] = React.useState<string | null>(initial?.mainImageUrl ?? null);
  const [slugStatus, setSlugStatus] = React.useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [skuStatus, setSkuStatus] = React.useState<"idle" | "checking" | "ok" | "taken">("idle");

  // Category multi-selection state
  const [selectedCategoryIds, setSelectedCategoryIds] = React.useState<string[]>(
    initial?.categoryIds ?? []
  );
  const [primaryCategoryId, setPrimaryCategoryId] = React.useState<string | null>(
    initial?.primaryCategoryId ?? null
  );

  const defaults: FormValues = {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    shortName: initial?.shortName ?? null,
    description: initial?.description ?? null,
    brandId: initial?.brandId ?? "",
    categoryId: initial?.categoryId ?? "",
    source: (initial?.source as "LOCAL" | "MIRAVIA" | "AMAZON") ?? "LOCAL",
    externalId: initial?.externalId ?? null,
    externalUrl: initial?.externalUrl ?? null,
    modelCode: initial?.modelCode ?? null,
    sku: initial?.sku ?? null,
    colorName: initial?.colorName ?? "Único",
    colorHex: initial?.colorHex ?? null,
    gender: (initial?.gender as FormValues["gender"]) ?? "NO_ESPECIFICADO",
    sportUse: initial?.sportUse ?? null,
    footwearType: (initial?.footwearType as FormValues["footwearType"]) ?? null,
    garmentType: (initial?.garmentType as FormValues["garmentType"]) ?? null,
    garmentVariant: (initial?.garmentVariant as FormValues["garmentVariant"]) ?? null,
    composition: initial?.composition ?? null,
    costPrice: initial?.costPrice ?? null,
    retailPrice: initial?.retailPrice ?? 0,
    salePrice: initial?.salePrice ?? null,
    taxRate: initial?.taxRate ?? 21,
    tags: initial?.tags ?? [],
    status: (initial?.status as FormValues["status"]) ?? "DRAFT",
    stock: initial?.stock ?? 0,
    weight: initial?.weight ?? null,
    isFeatured: initial?.isFeatured ?? false,
    isOutlet: initial?.isOutlet ?? false,
    isCustomized: initial?.isCustomized ?? false,
    metaTitle: initial?.metaTitle ?? null,
    metaDescription: initial?.metaDescription ?? null,
    sizes: initial?.sizes?.map((s) => ({
      size: s.size,
      ean: s.ean,
      stock: s.stock,
      costPrice: s.costPrice,
      retailPrice: s.retailPrice,
    })) ?? [],
    hasSizes: (initial?.sizes?.length ?? 0) > 0 || !initial,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaults,
    mode: "onBlur",
  });

  const { register, control, handleSubmit, watch, setValue, formState } = form;
  const errors = formState.errors;

  const sizesArr = useFieldArray({ control, name: "sizes" });

  const watched = watch();

  // Auto-generate slug while creating
  React.useEffect(() => {
    if (mode === "create" && watched.name && watched.colorName && !form.formState.dirtyFields.slug) {
      const slug = slugifyEs(`${watched.name}-${watched.colorName}`);
      setValue("slug", slug, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched.name, watched.colorName, mode]);

  // Bloque 6 §18: si garmentType cambia a un tipo incompatible con la variante
  // actual, limpiar garmentVariant (evita estados inconsistentes en el form).
  React.useEffect(() => {
    if (watched.garmentVariant && watched.garmentType) {
      const expectedType = VARIANT_TO_TYPE[watched.garmentVariant as GarmentVariant];
      if (expectedType !== watched.garmentType) setValue("garmentVariant", null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched.garmentType]);

  // Slug validation debounced
  React.useEffect(() => {
    const slug = watched.slug?.trim();
    if (!slug || slug.length < 3) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const url = new URL("/api/products/slug-check", window.location.origin);
        url.searchParams.set("slug", slug);
        if (initial?.id) url.searchParams.set("excludeId", initial.id);
        const res = await fetch(url.toString());
        const data: { available: boolean } = await res.json();
        setSlugStatus(data.available ? "ok" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [watched.slug, initial?.id]);

  // SKU validation debounced — avisa si el SKU ya existe en OTRO producto (es
  // @unique en toda la tienda). Vacío = sin aviso. Excluye el propio producto.
  React.useEffect(() => {
    const sku = watched.sku?.trim();
    if (!sku) {
      setSkuStatus("idle");
      return;
    }
    setSkuStatus("checking");
    const t = setTimeout(async () => {
      try {
        const url = new URL("/api/products/sku-check", window.location.origin);
        url.searchParams.set("sku", sku);
        if (initial?.id) url.searchParams.set("excludeId", initial.id);
        const res = await fetch(url.toString());
        const data: { available: boolean } = await res.json();
        setSkuStatus(data.available ? "ok" : "taken");
      } catch {
        setSkuStatus("idle");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [watched.sku, initial?.id]);

  // Tags input
  const [tagInput, setTagInput] = React.useState("");
  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (watched.tags.includes(t)) {
      setTagInput("");
      return;
    }
    setValue("tags", [...watched.tags, t], { shouldDirty: true });
    setTagInput("");
  }
  function removeTag(t: string) {
    setValue("tags", watched.tags.filter((x) => x !== t), { shouldDirty: true });
  }

  // Image dnd ordering
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onImageDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setImages((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === e.active.id);
      const newIdx = prev.findIndex((i) => i.id === e.over!.id);
      return arrayMove(prev, oldIdx, newIdx).map((img, idx) => ({ ...img, position: idx }));
    });
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id));
    if (images.find((i) => i.id === id)?.url === mainImageUrl) {
      setMainImageUrl(null);
    }
  }

  async function createBrandInline(name: string) {
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error("No se pudo crear la marca");
        return null;
      }
      const data: { brand: { id: string; name: string; slug: string } } = await res.json();
      setBrands((prev) =>
        prev.some((b) => b.id === data.brand.id) ? prev : [...prev, data.brand],
      );
      toast.success(`Marca "${data.brand.name}" creada`);
      return { value: data.brand.id, label: data.brand.name };
    } catch {
      toast.error("Error al crear marca");
      return null;
    }
  }

  // Category tree handlers
  function handleCategoryToggle(id: string) {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        // deselecting
        const next = prev.filter((x) => x !== id);
        // if deselecting the primary, reset primary
        if (primaryCategoryId === id) {
          setPrimaryCategoryId(next[0] ?? null);
        }
        return next;
      } else {
        // selecting: if no primary yet, make this the primary
        if (!primaryCategoryId) setPrimaryCategoryId(id);
        return [...prev, id];
      }
    });
  }

  function handleSetPrimary(id: string) {
    // ensure it's selected
    if (!selectedCategoryIds.includes(id)) {
      setSelectedCategoryIds((prev) => [...prev, id]);
    }
    setPrimaryCategoryId(id);
  }

  async function handleCreateCategory(name: string, parentId: string | null) {
    const slug = slugifyEs(name);
    const res = await createCategoryAction({ name, slug, parentId: parentId ?? null });
    if (res.ok) {
      const newCat: CategoryNode = { id: res.id, name, slug, parentId: parentId ?? null };
      setCats((prev) => [...prev, newCat]);
      // auto-select the new category
      handleCategoryToggle(res.id);
      toast.success(`Categoría "${name}" creada`);
    } else {
      throw new Error("No se pudo crear la categoría");
    }
  }

  // Derived gender label
  const derivedGenderLabel = React.useMemo(
    () => deriveGenderLabel(selectedCategoryIds, cats),
    [selectedCategoryIds, cats],
  );

  // Primary category slug — for showing footwear/garment selects
  const primaryCatSlug = React.useMemo(() => {
    if (!primaryCategoryId) return null;
    return cats.find((c) => c.id === primaryCategoryId)?.slug ?? null;
  }, [primaryCategoryId, cats]);

  // Construye el input para las acciones "generar desde campos del form".
  // Resuelve brandName del brandId seleccionado contra la lista `brands`,
  // y usa el slug de la categoría principal. Funciona pre-guardado.
  function descriptionFieldsInput() {
    return {
      name: watched.name?.trim() ?? "",
      brandName: brands.find((b) => b.id === watched.brandId)?.name ?? null,
      categorySlug: primaryCatSlug,
      colorName: watched.colorName ?? null,
    };
  }

  // Submit
  const onSubmit = (publish: boolean): SubmitHandler<FormValues> => async (values) => {
    if (slugStatus === "taken") {
      toast.error("El slug ya existe. Cambia el slug.");
      setTab("general");
      return;
    }
    if (skuStatus === "taken") {
      toast.error("El SKU ya existe en otro producto. Cámbialo o déjalo vacío.");
      setTab("origen");
      return;
    }

    // Category validation
    if (selectedCategoryIds.length === 0) {
      toast.error("Selecciona al menos una categoría");
      setTab("general");
      return;
    }

    if (publish && !mainImageUrl) {
      toast.error("Para publicar es necesaria una imagen principal con alt.");
      setTab("imagenes");
      return;
    }

    const finalStatus: FormValues["status"] = publish ? "ACTIVE" : values.status;
    const sizes = values.hasSizes ? values.sizes : [];

    // Fix categoryId (legacy field) — must be set to primary or first selected
    const effectivePrimaryId = primaryCategoryId ?? selectedCategoryIds[0];

    // Auto-derive gender from categories
    const derivedGender = deriveGenderValue(selectedCategoryIds, cats);

    const payload = {
      product: {
        ...values,
        status: finalStatus,
        externalUrl: values.externalUrl || null,
        colorHex: values.colorHex || null,
        gender: derivedGender,
        categoryId: effectivePrimaryId,
        sizes: undefined,
        hasSizes: undefined,
      } as unknown as FormValues,
      sizes,
      categoryIds: selectedCategoryIds,
      primaryCategoryId: effectivePrimaryId,
      images: images
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((img) => ({
          url: img.url,
          urlThumb: img.urlThumb ?? null,
          urlMedium: img.urlMedium ?? null,
          blurDataUrl: img.blurDataUrl ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          alt: img.alt,
        })),
      mainImageUrl,
    };

    // remove fields not in ProductSchema
    delete (payload.product as Record<string, unknown>).sizes;
    delete (payload.product as Record<string, unknown>).hasSizes;

    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await createProductAction(payload as never);
        toast.success("Producto creado");
        router.push(`/admin/productos/${res.id}`);
      } else if (mode === "edit" && initial) {
        await updateProductAction(initial.id, payload as never);
        toast.success(publish ? "Producto publicado" : "Cambios guardados");
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit(false))}
      className="space-y-6"
      aria-label={mode === "create" ? "Nuevo producto" : "Editar producto"}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="imagenes">Imágenes</TabsTrigger>
          <TabsTrigger value="precios">Precios y tallas</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="origen">Origen externo</TabsTrigger>
          {mode === "edit" && <TabsTrigger value="historial">Historial</TabsTrigger>}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="name">Nombre del producto *</Label>
                  <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
                  {errors.name && <FieldError msg={errors.name.message} />}
                </div>
                <div>
                  <Label htmlFor="shortName">Nombre corto</Label>
                  <Input id="shortName" {...register("shortName")} maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="slug">
                    Slug *
                    {slugStatus === "checking" && (
                      <span className="ml-2 text-xs text-zs-muted">comprobando…</span>
                    )}
                    {slugStatus === "ok" && (
                      <span className="ml-2 text-xs text-emerald-600">disponible</span>
                    )}
                    {slugStatus === "taken" && (
                      <span className="ml-2 text-xs text-zs-red-600">ya existe</span>
                    )}
                    {slugStatus === "invalid" && (
                      <span className="ml-2 text-xs text-zs-red-600">formato inválido</span>
                    )}
                  </Label>
                  <Input id="slug" {...register("slug")} placeholder="ej: chaqueta-trekking-azul" />
                  {errors.slug && <FieldError msg={errors.slug.message} />}
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between gap-2">
                  <Label htmlFor="description">
                    Descripción{" "}
                    <span className="text-xs text-zs-muted">
                      ({watched.description?.length ?? 0} caracteres)
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!watched.name?.trim()) {
                        toast.error("Escribe primero el nombre del producto.");
                        return;
                      }
                      const { generateDescriptionFromFieldsAction } = await import("../_actions");
                      const res = await generateDescriptionFromFieldsAction(descriptionFieldsInput());
                      if (res.ok) {
                        setValue("description", res.description, { shouldDirty: true });
                        if (!(watched.metaDescription?.trim().length ?? 0)) {
                          const metaRes = await (await import("../_actions")).generateMetaFromFieldsAction(
                            descriptionFieldsInput(),
                          );
                          if (metaRes.ok) {
                            setValue("metaDescription", metaRes.metaDescription, { shouldDirty: true });
                          }
                        }
                        toast.success("Descripción generada. Edítala si quieres ajustarla.");
                      } else {
                        toast.error(res.error);
                      }
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zs-blue-300 bg-zs-blue-50 px-3 text-xs font-semibold text-zs-blue-900 transition-colors hover:bg-zs-blue-100"
                    title="Aplica una plantilla adaptada a la categoría a partir de los campos del formulario"
                  >
                    ✨ Generar descripción
                  </button>
                </div>
                <Textarea
                  id="description"
                  rows={6}
                  maxLength={20000}
                  {...register("description")}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Marca *</Label>
                  <Combobox
                    options={brands.map((b) => ({ value: b.id, label: b.name }))}
                    value={watched.brandId}
                    onChange={(v) => setValue("brandId", v ?? "", { shouldValidate: true })}
                    placeholder="Selecciona o crea una marca"
                    searchPlaceholder="Buscar marca…"
                    allowCreate
                    onCreate={(name) => createBrandInline(name)}
                  />
                  {errors.brandId && <FieldError msg="Selecciona una marca" />}
                </div>
                <div>
                  <Label htmlFor="sportUse">Uso deportivo</Label>
                  <Input id="sportUse" {...register("sportUse")} placeholder="ej: Trekking" />
                </div>

                {/* Tipo de calzado — aparece cuando la categoría principal termina en -calzado */}
                {primaryCatSlug?.endsWith("-calzado") && (
                  <div>
                    <Label htmlFor="footwearType">Tipo de calzado</Label>
                    <Select
                      value={watched.footwearType ?? "__none__"}
                      onValueChange={(v) =>
                        setValue(
                          "footwearType",
                          v === "__none__" ? null : (v as FormValues["footwearType"]),
                        )
                      }
                    >
                      <SelectTrigger id="footwearType">
                        <SelectValue placeholder="(sin asignar)" />
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

                {/* Tipo de prenda — aparece cuando la categoría principal termina en -textil */}
                {primaryCatSlug?.endsWith("-textil") && (
                  <div>
                    <Label htmlFor="garmentType">Tipo de prenda</Label>
                    <Select
                      value={watched.garmentType ?? "__none__"}
                      onValueChange={(v) =>
                        setValue(
                          "garmentType",
                          v === "__none__" ? null : (v as FormValues["garmentType"]),
                        )
                      }
                    >
                      <SelectTrigger id="garmentType">
                        <SelectValue placeholder="(sin asignar)" />
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

                {/* Variante de prenda — solo si garmentType ∈ camiseta/pantalon/mallas */}
                {watched.garmentType && ["camiseta", "pantalon", "mallas"].includes(watched.garmentType) && (
                  <div>
                    <Label htmlFor="garmentVariant">Variante de {watched.garmentType}</Label>
                    <Select
                      value={watched.garmentVariant ?? "__none__"}
                      onValueChange={(v) =>
                        setValue("garmentVariant", v === "__none__" ? null : (v as FormValues["garmentVariant"]))
                      }
                    >
                      <SelectTrigger id="garmentVariant">
                        <SelectValue placeholder="(sin asignar)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">(sin asignar)</SelectItem>
                        {GARMENT_VARIANTS.filter((v) => VARIANT_TO_TYPE[v] === watched.garmentType).map((v) => (
                          <SelectItem key={v} value={v}>
                            {GARMENT_VARIANT_LABELS[v]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Categories — full width, tree multi-select */}
              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Label>
                    Categorías *
                    {selectedCategoryIds.length > 0 && (
                      <span className="ml-2 text-xs text-zs-muted">
                        {selectedCategoryIds.length} seleccionada{selectedCategoryIds.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </Label>
                </div>
                <CategoryTreePicker
                  categories={cats}
                  selected={selectedCategoryIds}
                  primaryId={primaryCategoryId}
                  onToggle={handleCategoryToggle}
                  onSetPrimary={handleSetPrimary}
                  onCreate={handleCreateCategory}
                />
                {selectedCategoryIds.length === 0 && (
                  <p className="mt-1 text-xs text-zs-red-600" role="alert">
                    Selecciona al menos una categoría
                  </p>
                )}
                {/* Derived gender info */}
                <p className="mt-2 text-xs text-zs-muted">
                  Género (automático):{" "}
                  <strong className="text-zs-ink">{derivedGenderLabel}</strong>
                </p>
              </div>

              <div className="grid gap-4 rounded-xl border border-zs-border bg-zs-surface/50 p-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="colorName">
                    Color · nombre * <span className="text-xs text-zs-muted">(1 color = 1 producto)</span>
                  </Label>
                  <Input id="colorName" {...register("colorName")} />
                  {errors.colorName && <FieldError msg={errors.colorName.message} />}
                </div>
                <div>
                  <Label htmlFor="colorHex">Color · hex</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="colorHex"
                      type="color"
                      className="h-11 w-16 cursor-pointer p-1"
                      value={watched.colorHex ?? "#000000"}
                      onChange={(e) => setValue("colorHex", e.target.value, { shouldDirty: true })}
                    />
                    <Input
                      value={watched.colorHex ?? ""}
                      onChange={(e) => setValue("colorHex", e.target.value, { shouldDirty: true })}
                      placeholder="#000000"
                    />
                  </div>
                  {errors.colorHex && <FieldError msg={errors.colorHex.message} />}
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zs-border bg-white p-2">
                  {watched.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        aria-label={`Quitar tag ${t}`}
                        className="text-zs-muted hover:text-zs-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Añadir tag y Enter…"
                    className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:text-zs-muted"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 border-t border-zs-border pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={watched.isFeatured}
                    onCheckedChange={(v) => setValue("isFeatured", v, { shouldDirty: true })}
                  />
                  Destacado
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={watched.isOutlet}
                    onCheckedChange={(v) => setValue("isOutlet", v, { shouldDirty: true })}
                  />
                  Outlet
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={watched.status === "ACTIVE"}
                    onCheckedChange={(v) =>
                      setValue("status", v ? "ACTIVE" : "DRAFT", { shouldDirty: true })
                    }
                  />
                  Publicado
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMAGENES */}
        <TabsContent value="imagenes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Imágenes del producto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.length === 0 ? (
                <Alert variant="warning">
                  <AlertDescription>
                    Este producto no tiene imágenes. Sube al menos una imagen con texto alternativo (alt) descriptivo antes de publicar.
                  </AlertDescription>
                </Alert>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onImageDragEnd}>
                  <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {images.map((img) => (
                        <SortableImageRow
                          key={img.id}
                          image={img}
                          isMain={mainImageUrl === img.url}
                          onSetMain={() => setMainImageUrl(img.url)}
                          onRemove={() => removeImage(img.id)}
                          onAltChange={(alt) =>
                            setImages((prev) =>
                              prev.map((i) => (i.id === img.id ? { ...i, alt } : i)),
                            )
                          }
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}

              <UploadDropzone
                type="product"
                defaultAlt={watched.name || "Imagen de producto"}
                onUploaded={(uploaded: UploadedImage[]) => {
                  setImages((prev) => [
                    ...prev,
                    ...uploaded.map((u, i) => ({
                      id: u.url, // stable local id (not persisted; backend regenerates)
                      url: u.url,
                      urlThumb: u.urlThumb ?? null,
                      urlMedium: u.urlMedium ?? null,
                      blurDataUrl: u.blurDataUrl ?? null,
                      width: u.width ?? null,
                      height: u.height ?? null,
                      alt: watched.name || "Imagen de producto",
                      position: prev.length + i,
                    })),
                  ]);
                  // If no main image yet, set the first uploaded as main
                  setMainImageUrl((cur) => cur ?? uploaded[0]?.url ?? null);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRECIOS Y TALLAS */}
        <TabsContent value="precios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Precios</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-4">
              {userRole === "OWNER" && (
                <div>
                  <Label htmlFor="costPrice">Precio coste (€)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min={0}
                    {...register("costPrice", { setValueAs: parseNullableNumber })}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="retailPrice">PVP (€) *</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("retailPrice", { setValueAs: (v) => Number(v) })}
                  aria-invalid={!!errors.retailPrice}
                />
                {errors.retailPrice && <FieldError msg="Precio inválido" />}
              </div>
              <div>
                <Label htmlFor="salePrice">Precio rebajado (€)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("salePrice", { setValueAs: parseNullableNumber })}
                />
              </div>
              <div>
                <Label htmlFor="taxRate">IVA (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min={0}
                  max={50}
                  {...register("taxRate", { setValueAs: (v) => Number(v) })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Tallas y stock</CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={!watched.hasSizes}
                  onCheckedChange={(v) => setValue("hasSizes", !v, { shouldDirty: true })}
                />
                Producto sin tallas
              </label>
            </CardHeader>
            <CardContent>
              {!watched.hasSizes ? (
                <div>
                  <Label htmlFor="stock">Stock total</Label>
                  <Input
                    id="stock"
                    type="number"
                    min={0}
                    step={1}
                    className="max-w-[160px]"
                    {...register("stock", { setValueAs: (v) => Number(v) })}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-zs-muted">
                      <tr>
                        <th className="px-2 py-2">Talla</th>
                        <th className="px-2 py-2">EAN</th>
                        <th className="px-2 py-2">Stock</th>
                        <th className="px-2 py-2">PVP override (€)</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizesArr.fields.map((f, idx) => (
                        <tr key={f.id} className="border-t border-zs-border">
                          <td className="px-2 py-2">
                            <Input
                              {...register(`sizes.${idx}.size` as const)}
                              className="h-9"
                              placeholder="M, 42…"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              {...register(`sizes.${idx}.ean` as const)}
                              className="h-9 font-mono"
                              placeholder="8412345678901"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              {...register(`sizes.${idx}.stock` as const, {
                                setValueAs: (v) => Number(v),
                              })}
                              className="h-9 w-20"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              {...register(`sizes.${idx}.retailPrice` as const, {
                                setValueAs: parseNullableNumber,
                              })}
                              className="h-9 w-28"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => sizesArr.remove(idx)}
                              aria-label={`Eliminar talla ${idx + 1}`}
                            >
                              <Trash2 className="h-4 w-4 text-zs-red-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() =>
                      sizesArr.append({
                        size: "",
                        ean: "",
                        stock: 0,
                        costPrice: null,
                        retailPrice: null,
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Añadir talla
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metaTitle">
                  Meta título <span className="text-xs text-zs-muted">({(watched.metaTitle ?? "").length}/60)</span>
                </Label>
                <Input id="metaTitle" maxLength={70} {...register("metaTitle")} />
              </div>
              <div>
                <div className="flex items-end justify-between gap-2">
                  <Label htmlFor="metaDescription">
                    Meta descripción{" "}
                    <span className="text-xs text-zs-muted">
                      ({(watched.metaDescription ?? "").length}/155)
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!watched.name?.trim()) {
                        toast.error("Escribe primero el nombre del producto.");
                        return;
                      }
                      const { generateMetaFromFieldsAction } = await import("../_actions");
                      const res = await generateMetaFromFieldsAction(descriptionFieldsInput());
                      if (res.ok) {
                        setValue("metaDescription", res.metaDescription, { shouldDirty: true });
                        toast.success("Meta descripción generada.");
                      } else {
                        toast.error(res.error);
                      }
                    }}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zs-blue-300 bg-zs-blue-50 px-3 text-xs font-semibold text-zs-blue-900 transition-colors hover:bg-zs-blue-100"
                    title="Genera un meta description corto (155 chars max) a partir de los campos del formulario"
                  >
                    ✨ Generar meta
                  </button>
                </div>
                <Textarea id="metaDescription" rows={3} maxLength={170} {...register("metaDescription")} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={watched.slug} onChange={(e) => setValue("slug", e.target.value, { shouldDirty: true })} />
                <p className="mt-1 text-xs text-zs-muted">
                  URL final: <code>/producto/{watched.slug || "tu-slug"}</code>
                </p>
              </div>

              <div className="rounded-xl border border-zs-border bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zs-muted">Vista previa Google</p>
                <h3 className="mt-2 text-lg text-[#1a0dab]">
                  {watched.metaTitle || watched.name || "Título del producto"}
                </h3>
                <p className="text-xs text-emerald-700">
                  https://zonasport.es/producto/{watched.slug || "tu-slug"}
                </p>
                <p className="mt-1 text-sm text-zs-ink/80">
                  {watched.metaDescription ||
                    (watched.description ?? "").slice(0, 155) ||
                    "Descripción meta del producto…"}
                </p>
              </div>

              {mode === "edit" && watched.slug && (
                <Button asChild type="button" variant="outline" size="sm">
                  <a href={`/producto/${watched.slug}/opengraph-image`} target="_blank" rel="noreferrer">
                    Generar OG preview
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORIGEN */}
        <TabsContent value="origen" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Origen externo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-zs-ink">Fuente</legend>
                <div className="mt-2 flex flex-wrap gap-3">
                  {[
                    { value: "LOCAL", label: "Local" },
                    { value: "MIRAVIA", label: "Miravia" },
                    { value: "AMAZON", label: "Amazon" },
                  ].map((s) => (
                    <label key={s.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        value={s.value}
                        checked={watched.source === s.value}
                        onChange={() =>
                          setValue("source", s.value as FormValues["source"], {
                            shouldDirty: true,
                          })
                        }
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="externalId">External ID</Label>
                  <Input
                    id="externalId"
                    {...register("externalId")}
                    placeholder="ASIN / pricat:030501 / miravia-id"
                  />
                </div>
                <div>
                  <Label htmlFor="modelCode">Código modelo</Label>
                  <Input id="modelCode" {...register("modelCode")} placeholder="M24205" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="sku">
                    SKU / Referencia interna
                    {skuStatus === "checking" && (
                      <span className="ml-2 text-xs text-zs-muted">comprobando…</span>
                    )}
                    {skuStatus === "ok" && (
                      <span className="ml-2 text-xs text-emerald-600">disponible</span>
                    )}
                    {skuStatus === "taken" && (
                      <span className="ml-2 text-xs font-semibold text-zs-red-600">
                        ⚠ ya existe en otro producto
                      </span>
                    )}
                  </Label>
                  <Input
                    id="sku"
                    {...register("sku")}
                    placeholder="ZS-RUNN-001 (único en toda la tienda)"
                    autoComplete="off"
                    aria-invalid={skuStatus === "taken"}
                    className={skuStatus === "taken" ? "border-zs-red-600 focus-visible:ring-zs-red-600/40" : undefined}
                  />
                  <p className="mt-1 text-xs text-zs-muted">
                    Aparece en la ficha pública como «Referencia». Debe ser único.
                    Si lo dejas vacío, la ficha muestra el código modelo como fallback.
                  </p>
                  {errors.sku && <FieldError msg="SKU inválido (máx. 64 caracteres)" />}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="externalUrl">URL externa (afiliado / ficha proveedor)</Label>
                  <Input id="externalUrl" type="url" {...register("externalUrl")} />
                  {errors.externalUrl && <FieldError msg="URL inválida" />}
                </div>
              </div>

              <Alert variant={watched.isCustomized ? "info" : "warning"}>
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>
                    {watched.isCustomized
                      ? "Personalizado: los campos protegidos NO se sobrescribirán en futuras importaciones."
                      : "Importación libre: los datos pueden ser sobrescritos por el feed."}
                  </span>
                  <Switch
                    checked={watched.isCustomized}
                    onCheckedChange={(v) => setValue("isCustomized", v, { shouldDirty: true })}
                  />
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORIAL */}
        {mode === "edit" && (
          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle>Historial de cambios</CardTitle>
              </CardHeader>
              <CardContent>
                {!initial?.audits?.length ? (
                  <p className="text-sm text-zs-muted">Sin actividad registrada.</p>
                ) : (
                  <ul className="divide-y divide-zs-border">
                    {initial.audits.map((a) => (
                      <li key={a.id} className="flex flex-col gap-1 py-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline">{a.action}</Badge>
                          <span className="text-xs text-zs-muted">
                            {formatDateTimeES(a.createdAt)} {a.userId && `· ${a.userId.slice(0, 8)}`}
                          </span>
                        </div>
                        {a.changes != null && Object.keys(a.changes as object).length > 0 ? (
                          <pre className="overflow-x-auto rounded-lg bg-zs-surface p-2 text-xs">
                            {JSON.stringify(a.changes, null, 2)}
                          </pre>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Footer sticky */}
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-2 border-t border-zs-border bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="text-xs text-zs-muted">
          {Object.keys(errors).length > 0 && (
            <span className="text-zs-red-600">
              Hay {Object.keys(errors).length} error(es) en el formulario.
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "edit" && watched.slug && (
            <Button asChild variant="outline" type="button" size="sm">
              <a href={`/producto/${watched.slug}`} target="_blank" rel="noreferrer">
                Vista previa
              </a>
            </Button>
          )}
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            onClick={() => setValue("status", "DRAFT")}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar borrador
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit(onSubmit(true))}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Publicar
          </Button>
        </div>
      </div>
    </form>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-zs-red-600" role="alert">{msg}</p>;
}

function SortableImageRow({
  image,
  isMain,
  onSetMain,
  onRemove,
  onAltChange,
}: {
  image: { id: string; url: string; urlThumb: string | null; alt: string };
  isMain: boolean;
  onSetMain: () => void;
  onRemove: () => void;
  onAltChange: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="flex items-center gap-3 rounded-xl border border-zs-border bg-white p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-zs-muted hover:text-zs-ink"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zs-border bg-zs-surface">
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.urlThumb ?? image.url} alt={image.alt} className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-4 w-4 text-zs-muted" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <Input
          value={image.alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Texto alternativo (alt) — obligatorio para SEO/A11y"
          className="h-9"
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="radio" checked={isMain} onChange={onSetMain} />
        Principal
        {isMain && <Check className="h-3 w-3 text-emerald-600" />}
      </label>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="Eliminar imagen">
        <Trash2 className="h-4 w-4 text-zs-red-600" />
      </Button>
    </li>
  );
}
