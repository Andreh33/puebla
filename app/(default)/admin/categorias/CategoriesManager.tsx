"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  DndContext,
  PointerSensor,
  closestCenter,
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
  ChevronDown,
  ChevronRight,
  Edit,
  GripVertical,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CategorySchema } from "@/lib/validators";
import { slugifyEs } from "@/lib/seo/slug";
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategories,
  updateCategoryAction,
} from "./_actions";

type FormValues = z.infer<typeof CategorySchema>;

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  position: number;
  isFeatured: boolean;
  productsCount: number;
  childrenCount: number;
}

export function CategoriesManager({ categories }: { categories: CategoryNode[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<CategoryNode | "new" | null>(null);
  const [confirmDel, setConfirmDel] = React.useState<CategoryNode | null>(null);
  const [items, setItems] = React.useState(categories);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => setItems(categories), [categories]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byParent = React.useMemo(() => {
    const m = new Map<string | null, CategoryNode[]>();
    for (const c of items) {
      const list = m.get(c.parentId) ?? [];
      list.push(c);
      m.set(c.parentId, list);
    }
    for (const [, list] of m) list.sort((a, b) => a.position - b.position);
    return m;
  }, [items]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSiblingReorder(parentId: string | null, oldId: string, newId: string) {
    const siblings = byParent.get(parentId) ?? [];
    const oldIdx = siblings.findIndex((s) => s.id === oldId);
    const newIdx = siblings.findIndex((s) => s.id === newId);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(siblings, oldIdx, newIdx);
    const updates = reordered.map((s, i) => ({ id: s.id, parentId, position: i }));
    setItems((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      for (const u of updates) {
        const cur = map.get(u.id);
        if (cur) map.set(u.id, { ...cur, position: u.position });
      }
      return Array.from(map.values());
    });
    const res = await reorderCategories(updates);
    if (!res.ok) toast.error("No se pudo guardar el orden");
  }

  async function handleDelete(id: string) {
    const res = await deleteCategoryAction(id);
    if (res.ok) {
      toast.success("Categoría eliminada");
      setConfirmDel(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zs-muted">
          Arrastra dentro del mismo nivel para reordenar. Para anidar/mover, edita la categoría y cambia el padre.
        </p>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="rounded-2xl border border-zs-border bg-white p-2 shadow-sm">
        <CategoryLevel
          parentId={null}
          byParent={byParent}
          expanded={expanded}
          onToggle={toggleExpand}
          onEdit={(c) => setEditing(c)}
          onDelete={(c) => setConfirmDel(c)}
          onReorder={handleSiblingReorder}
          depth={0}
          sensors={sensors}
        />
      </div>

      <CategoryDialog
        editing={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel &&
                (confirmDel.productsCount > 0 || confirmDel.childrenCount > 0
                  ? `Tiene ${confirmDel.productsCount} producto(s) y ${confirmDel.childrenCount} subcategoría(s). Reasigna primero.`
                  : `Se eliminará "${confirmDel.name}" definitivamente.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-zs-red-600 text-white hover:bg-zs-red-700"
              disabled={!confirmDel || confirmDel.productsCount > 0 || confirmDel.childrenCount > 0}
              onClick={() => confirmDel && handleDelete(confirmDel.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryLevel({
  parentId,
  byParent,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onReorder,
  depth,
  sensors,
}: {
  parentId: string | null;
  byParent: Map<string | null, CategoryNode[]>;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onEdit: (c: CategoryNode) => void;
  onDelete: (c: CategoryNode) => void;
  onReorder: (parentId: string | null, oldId: string, newId: string) => void;
  depth: number;
  sensors: ReturnType<typeof useSensors>;
}) {
  const list = byParent.get(parentId) ?? [];
  if (list.length === 0) {
    return depth === 0 ? (
      <p className="px-3 py-6 text-center text-sm text-zs-muted">No hay categorías aún.</p>
    ) : null;
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(parentId, String(e.active.id), String(e.over.id));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={list.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className={depth === 0 ? "space-y-1" : "ml-6 space-y-1 border-l border-zs-border pl-2"}>
          {list.map((c) => (
            <SortableCategoryNode
              key={c.id}
              node={c}
              hasChildren={(byParent.get(c.id)?.length ?? 0) > 0}
              isExpanded={expanded.has(c.id)}
              onToggle={() => onToggle(c.id)}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
            >
              {expanded.has(c.id) && (
                <CategoryLevel
                  parentId={c.id}
                  byParent={byParent}
                  expanded={expanded}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReorder={onReorder}
                  depth={depth + 1}
                  sensors={sensors}
                />
              )}
            </SortableCategoryNode>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableCategoryNode({
  node,
  hasChildren,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  children,
}: {
  node: CategoryNode;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zs-surface">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar"
          className="cursor-grab text-zs-muted hover:text-zs-ink"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isExpanded ? "Colapsar" : "Expandir"}
          className="text-zs-muted hover:text-zs-ink disabled:opacity-30"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium text-zs-ink">{node.name}</p>
          <p className="text-xs text-zs-muted">
            <code>/categoria/{node.slug}</code>
            {" · "}
            {node.productsCount} productos
            {node.childrenCount > 0 && ` · ${node.childrenCount} hijas`}
          </p>
        </div>
        {node.isFeatured && (
          <Badge variant="warning" className="text-[10px]">
            <Star className="mr-0.5 h-2.5 w-2.5" />
            Dest.
          </Badge>
        )}
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Eliminar">
          <Trash2 className="h-4 w-4 text-zs-red-600" />
        </Button>
      </div>
      {children}
    </li>
  );
}

function CategoryDialog({
  editing,
  categories,
  onClose,
  onSaved,
}: {
  editing: CategoryNode | "new" | null;
  categories: CategoryNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = editing !== null;
  const isNew = editing === "new";
  const initial = isNew ? null : (editing as CategoryNode | null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CategorySchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      parentId: initial?.parentId ?? null,
      description: initial?.description ?? "",
      imageUrl: initial?.imageUrl ?? "",
      metaTitle: initial?.metaTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
      position: initial?.position ?? 0,
      isFeatured: initial?.isFeatured ?? false,
    },
  });

  React.useEffect(() => {
    form.reset({
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      parentId: initial?.parentId ?? null,
      description: initial?.description ?? "",
      imageUrl: initial?.imageUrl ?? "",
      metaTitle: initial?.metaTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
      position: initial?.position ?? 0,
      isFeatured: initial?.isFeatured ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const w = form.watch();

  React.useEffect(() => {
    if (isNew && w.name && !form.formState.dirtyFields.slug) {
      form.setValue("slug", slugifyEs(w.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.name, isNew]);

  const parentOptions = categories.filter((c) => !initial || c.id !== initial.id);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await createCategoryAction(values);
      else if (initial) await updateCategoryAction(initial.id, values);
      toast.success(isNew ? "Categoría creada" : "Categoría actualizada");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nueva categoría" : `Editar: ${initial?.name}`}</DialogTitle>
          <DialogDescription>Define jerarquía y SEO.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-name">Nombre *</Label>
              <Input id="c-name" {...form.register("name")} />
            </div>
            <div>
              <Label htmlFor="c-slug">Slug *</Label>
              <Input id="c-slug" {...form.register("slug")} />
            </div>
          </div>
          <div>
            <Label htmlFor="c-parent">Categoría padre</Label>
            <Select
              value={w.parentId ?? "__none__"}
              onValueChange={(v) =>
                form.setValue("parentId", v === "__none__" ? null : v, { shouldDirty: true })
              }
            >
              <SelectTrigger id="c-parent">
                <SelectValue placeholder="Raíz (sin padre)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Raíz (sin padre)</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="c-desc">Descripción</Label>
            <Textarea id="c-desc" rows={2} {...form.register("description")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="c-img">URL imagen</Label>
              <Input id="c-img" type="url" {...form.register("imageUrl")} />
            </div>
            <div>
              <Label htmlFor="c-pos">Posición</Label>
              <Input
                id="c-pos"
                type="number"
                {...form.register("position", { setValueAs: (v) => Number(v) })}
              />
            </div>
            <div>
              <Label htmlFor="c-mt">
                Meta título <span className="text-xs text-zs-muted">({(w.metaTitle ?? "").length}/60)</span>
              </Label>
              <Input id="c-mt" maxLength={70} {...form.register("metaTitle")} />
            </div>
            <div>
              <Label htmlFor="c-md">
                Meta descripción <span className="text-xs text-zs-muted">({(w.metaDescription ?? "").length}/155)</span>
              </Label>
              <Input id="c-md" maxLength={170} {...form.register("metaDescription")} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={w.isFeatured}
              onCheckedChange={(v) => form.setValue("isFeatured", v, { shouldDirty: true })}
            />
            Categoría destacada
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
