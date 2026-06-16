"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createCategoryAction } from "@/app/admin/categorias/_actions";
import { slugifyEs } from "@/lib/seo/slug";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type Props = {
  categories: CategoryNode[];
  selected: string[];
  primaryId: string | null;
  onToggle: (id: string) => void;
  onSetPrimary: (id: string) => void;
  onCreate: (name: string, parentId: string | null) => Promise<void>;
};

// Build tree map: parentId -> children
function buildTree(cats: CategoryNode[]): Map<string | null, CategoryNode[]> {
  const map = new Map<string | null, CategoryNode[]>();
  for (const c of cats) {
    const list = map.get(c.parentId) ?? [];
    list.push(c);
    map.set(c.parentId, list);
  }
  return map;
}

// Render tree node and its children recursively
function CategoryNodeRow({
  node,
  depth,
  tree,
  selected,
  primaryId,
  onToggle,
  onSetPrimary,
}: {
  node: CategoryNode;
  depth: number;
  tree: Map<string | null, CategoryNode[]>;
  selected: string[];
  primaryId: string | null;
  onToggle: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const children = tree.get(node.id) ?? [];
  const isSelected = selected.includes(node.id);
  const isPrimary = primaryId === node.id;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 rounded px-2 py-1 text-sm",
          depth > 0 && "ml-" + (depth * 4),
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* expand/collapse toggle for nodes with children */}
        {children.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex-none text-zs-muted hover:text-zs-ink"
            aria-label={open ? "Colapsar" : "Expandir"}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-3.5 flex-none" />
        )}

        <Checkbox
          id={`cat-${node.id}`}
          checked={isSelected}
          onCheckedChange={() => onToggle(node.id)}
        />
        <label
          htmlFor={`cat-${node.id}`}
          className="cursor-pointer select-none text-zs-ink"
        >
          {node.name}
        </label>

        {isSelected && (
          <span className="ml-1 flex items-center gap-1">
            {isPrimary ? (
              <Badge
                variant="outline"
                className="h-5 border-zs-blue-300 bg-zs-blue-50 px-1.5 text-[10px] font-semibold text-zs-blue-700"
              >
                Principal
              </Badge>
            ) : (
              <button
                type="button"
                onClick={() => onSetPrimary(node.id)}
                className="text-[10px] font-medium text-zs-blue-700 underline underline-offset-2 hover:no-underline"
              >
                Hacer principal
              </button>
            )}
          </span>
        )}
      </div>

      {children.length > 0 && open && (
        <ul>
          {children.map((child) => (
            <CategoryNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              tree={tree}
              selected={selected}
              primaryId={primaryId}
              onToggle={onToggle}
              onSetPrimary={onSetPrimary}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function CategoryTreePicker({
  categories,
  selected,
  primaryId,
  onToggle,
  onSetPrimary,
  onCreate,
}: Props) {
  const tree = React.useMemo(() => buildTree(categories), [categories]);
  const roots = tree.get(null) ?? [];

  // "Añadir categoría" inline form
  const [showAdd, setShowAdd] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newParentId, setNewParentId] = React.useState<string>("__none__");
  const [creating, setCreating] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreate(name, newParentId === "__none__" ? null : newParentId);
      setNewName("");
      setNewParentId("__none__");
      setShowAdd(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Tree box */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-zs-border bg-white p-2">
        {roots.length === 0 ? (
          <p className="py-4 text-center text-xs text-zs-muted">Sin categorías</p>
        ) : (
          <ul>
            {roots.map((root) => (
              <CategoryNodeRow
                key={root.id}
                node={root}
                depth={0}
                tree={tree}
                selected={selected}
                primaryId={primaryId}
                onToggle={onToggle}
                onSetPrimary={onSetPrimary}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Add inline */}
      {!showAdd ? (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-zs-blue-700 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Añadir nueva categoría
        </button>
      ) : (
        <form
          onSubmit={handleCreate}
          className="space-y-2 rounded-xl border border-zs-border bg-zs-surface/60 p-3"
        >
          <p className="text-xs font-semibold text-zs-ink">Nueva categoría</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-cat-name" className="text-xs">
                Nombre *
              </Label>
              <Input
                id="new-cat-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: Zapatillas trail"
                autoFocus
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="new-cat-parent" className="text-xs">
                Categoría padre (opcional)
              </Label>
              <Select value={newParentId} onValueChange={setNewParentId}>
                <SelectTrigger id="new-cat-parent" className="h-8 text-sm">
                  <SelectValue placeholder="(raíz)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(raíz — sin padre)</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating || !newName.trim()}>
              {creating ? "Creando…" : "Añadir"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setNewName("");
                setNewParentId("__none__");
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
