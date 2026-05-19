"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Plus,
  Upload,
  ImagePlus,
  PencilLine,
  ShoppingBag,
  MessageSquare,
  Tags,
  FolderTree,
  Newspaper,
  Search,
  ArrowRight,
} from "lucide-react";

/**
 * QuickActions — botón "+ Crear" en la Topbar admin con un mini-menú
 * desplegable de accesos rápidos a las acciones más usadas. Optimizado para
 * que el cliente no tenga que pensar dónde están las cosas.
 *
 * Atajo de teclado: tecla `c` (focus libre) abre el menú; `n` abre "Nuevo
 * producto" directo.
 */

type QuickItem = {
  href: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
};

const ITEMS: { group: string; items: QuickItem[] }[] = [
  {
    group: "Crear",
    items: [
      {
        href: "/admin/productos/nuevo",
        label: "Producto",
        hint: "Añadir un producto al catálogo",
        icon: ShoppingBag,
        shortcut: "N",
      },
      {
        href: "/admin/blog/nuevo",
        label: "Artículo de blog",
        hint: "Publicar una entrada",
        icon: Newspaper,
        shortcut: "B",
      },
      {
        href: "/admin/marcas",
        label: "Marca",
        hint: "Añadir marca al catálogo",
        icon: Tags,
      },
      {
        href: "/admin/categorias",
        label: "Categoría",
        hint: "Crear o reorganizar",
        icon: FolderTree,
      },
    ],
  },
  {
    group: "Importar / subir",
    items: [
      {
        href: "/admin/importar/xlsx",
        label: "Importar PRICAT (xlsx)",
        hint: "Carga masiva desde el proveedor",
        icon: Upload,
      },
      {
        href: "/admin/imagenes",
        label: "Subir imágenes",
        hint: "Galería de productos y blog",
        icon: ImagePlus,
      },
    ],
  },
  {
    group: "Atajos",
    items: [
      {
        href: "/admin/productos?status=DRAFT",
        label: "Productos en borrador",
        hint: "Pendientes de publicar",
        icon: PencilLine,
      },
      {
        href: "/admin/leads",
        label: "Leads recientes",
        hint: "Consultas por WhatsApp / formulario",
        icon: MessageSquare,
      },
      {
        href: "/admin/productos?noImage=1",
        label: "Productos sin imagen",
        hint: "Hay que asignarles foto",
        icon: Search,
      },
    ],
  },
];

export function QuickActions() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Atajos de teclado globales (solo cuando no hay un input enfocado).
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "c") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "n") {
        e.preventDefault();
        router.push("/admin/productos/nuevo");
      } else if (e.key === "b") {
        e.preventDefault();
        router.push("/admin/blog/nuevo");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Acciones rápidas (tecla c)"
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-zs-blue-900 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zs-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700 focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crear</span>
          <kbd className="ml-1 hidden rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/85 sm:inline">
            C
          </kbd>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[320px] overflow-hidden rounded-2xl border border-zs-border bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {ITEMS.map((group, gi) => (
            <div key={group.group}>
              <DropdownMenu.Label className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zs-muted">
                {group.group}
              </DropdownMenu.Label>
              {group.items.map((it) => {
                const Icon = it.icon;
                return (
                  <DropdownMenu.Item key={it.href} asChild>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="group flex cursor-pointer items-center gap-3 px-3 py-2 outline-none transition-colors data-[highlighted]:bg-zs-surface focus-visible:bg-zs-surface"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zs-blue-50 text-zs-blue-700 transition-colors group-hover:bg-zs-blue-900 group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zs-ink">
                          {it.label}
                        </p>
                        {it.hint && (
                          <p className="truncate text-xs text-zs-muted">{it.hint}</p>
                        )}
                      </div>
                      {it.shortcut && (
                        <kbd className="rounded border border-zs-border bg-zs-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zs-muted">
                          {it.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-zs-muted opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </DropdownMenu.Item>
                );
              })}
              {gi < ITEMS.length - 1 && (
                <DropdownMenu.Separator className="my-1 h-px bg-zs-border" />
              )}
            </div>
          ))}
          <div className="border-t border-zs-border bg-zs-surface/50 px-3 py-2 text-[11px] text-zs-muted">
            Pulsa <kbd className="rounded bg-white px-1 font-mono">C</kbd> para abrir
            esto · <kbd className="rounded bg-white px-1 font-mono">N</kbd> = nuevo
            producto · <kbd className="rounded bg-white px-1 font-mono">B</kbd> =
            nuevo blog
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
