"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Edit, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BrandSchema } from "@/lib/validators";
import { slugifyEs } from "@/lib/seo/slug";
import {
  createBrandAction,
  deleteBrandAction,
  updateBrandAction,
} from "./_actions";

type FormValues = z.infer<typeof BrandSchema>;

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isFeatured: boolean;
  position: number;
  productsCount: number;
}

export function BrandsManager({ brands }: { brands: BrandRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<BrandRow | "new" | null>(null);
  const [confirmDel, setConfirmDel] = React.useState<BrandRow | null>(null);
  const [q, setQ] = React.useState("");

  const filtered = brands.filter((b) =>
    !q ? true : b.name.toLowerCase().includes(q.toLowerCase()) || b.slug.includes(q.toLowerCase()),
  );

  async function handleDelete(id: string) {
    const res = await deleteBrandAction(id);
    if (res.ok) {
      toast.success("Marca eliminada");
      setConfirmDel(null);
      router.refresh();
    } else {
      toast.error(res.error ?? "Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar marca…"
          className="max-w-sm"
        />
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Nueva marca
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zs-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead>Posición</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-zs-muted">
                  No hay marcas que coincidan.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {b.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.logoUrl}
                        alt={b.name}
                        className="h-8 w-8 rounded-md border border-zs-border bg-white object-contain"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-zs-border bg-zs-surface text-xs text-zs-muted">
                        {b.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-zs-ink">{b.name}</p>
                      {b.isFeatured && (
                        <Badge variant="warning" className="mt-0.5">
                          <Star className="mr-1 h-3 w-3" />
                          Destacada
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs text-zs-muted">/marca/{b.slug}</code>
                </TableCell>
                <TableCell className="text-right tabular-nums">{b.productsCount}</TableCell>
                <TableCell className="tabular-nums">{b.position}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(b)} aria-label="Editar">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDel(b)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-zs-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <BrandDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar marca?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.productsCount
                ? `"${confirmDel.name}" tiene ${confirmDel.productsCount} producto(s) asignado(s). Antes de eliminar, reasigna esos productos a otra marca.`
                : `Se eliminará "${confirmDel?.name}" definitivamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-zs-red-600 text-white hover:bg-zs-red-700"
              disabled={(confirmDel?.productsCount ?? 0) > 0}
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

function BrandDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: BrandRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = editing !== null;
  const isNew = editing === "new";
  const initial = isNew ? null : (editing as BrandRow | null);

  const form = useForm<FormValues>({
    resolver: zodResolver(BrandSchema),
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      logoUrl: initial?.logoUrl ?? "",
      description: initial?.description ?? "",
      metaTitle: initial?.metaTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
      isFeatured: initial?.isFeatured ?? false,
      position: initial?.position ?? 0,
    },
  });

  React.useEffect(() => {
    form.reset({
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      logoUrl: initial?.logoUrl ?? "",
      description: initial?.description ?? "",
      metaTitle: initial?.metaTitle ?? "",
      metaDescription: initial?.metaDescription ?? "",
      isFeatured: initial?.isFeatured ?? false,
      position: initial?.position ?? 0,
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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await createBrandAction(values);
      else if (initial) await updateBrandAction(initial.id, values);
      toast.success(isNew ? "Marca creada" : "Marca actualizada");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nueva marca" : `Editar: ${initial?.name}`}</DialogTitle>
          <DialogDescription>Campos básicos y metadatos SEO.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="b-name">Nombre *</Label>
              <Input id="b-name" {...form.register("name")} />
            </div>
            <div>
              <Label htmlFor="b-slug">Slug *</Label>
              <Input id="b-slug" {...form.register("slug")} />
            </div>
          </div>
          <div>
            <Label htmlFor="b-logo">URL del logo</Label>
            <Input id="b-logo" type="url" {...form.register("logoUrl")} />
          </div>
          <div>
            <Label htmlFor="b-desc">Descripción</Label>
            <Textarea id="b-desc" rows={3} {...form.register("description")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="b-mt">
                Meta título <span className="text-xs text-zs-muted">({(w.metaTitle ?? "").length}/60)</span>
              </Label>
              <Input id="b-mt" maxLength={70} {...form.register("metaTitle")} />
            </div>
            <div>
              <Label htmlFor="b-mp">Posición</Label>
              <Input
                id="b-mp"
                type="number"
                {...form.register("position", { setValueAs: (v) => Number(v) })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="b-md">
              Meta descripción <span className="text-xs text-zs-muted">({(w.metaDescription ?? "").length}/155)</span>
            </Label>
            <Textarea id="b-md" rows={2} maxLength={170} {...form.register("metaDescription")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={w.isFeatured}
              onCheckedChange={(v) => form.setValue("isFeatured", v, { shouldDirty: true })}
            />
            Marca destacada (aparece en homepage)
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
