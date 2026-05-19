"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ExternalLink,
  Pencil,
  Copy,
  Archive,
  Trash2,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatDateES } from "@/lib/utils";
import { duplicatePost, archivePost, deletePost } from "./_actions";

type Row = {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  status: "DRAFT" | "PUBLISHED";
  tags: string[];
  publishedAt: Date | null;
  updatedAt: Date;
};

export function BlogTable({
  posts,
  allTags,
  initialQuery,
  initialStatus,
  initialTag,
}: {
  posts: Row[];
  allTags: string[];
  initialQuery: string;
  initialStatus: string;
  initialTag: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [tag, setTag] = useState(initialTag);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function applyFilters() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "ALL") params.set("status", status);
    if (tag && tag !== "ALL") params.set("tag", tag);
    router.push(`/admin/blog${params.toString() ? `?${params}` : ""}`);
  }

  function resetFilters() {
    setQ("");
    setStatus("ALL");
    setTag("ALL");
    router.push("/admin/blog");
  }

  async function onDuplicate(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await duplicatePost(id);
      setBusyId(null);
      if (res.ok) router.push(`/admin/blog/${res.id}`);
      else alert(res.error);
    });
  }

  async function onArchive(id: string) {
    if (!confirm("¿Pasar este post a borrador? Dejará de mostrarse en el blog público.")) return;
    setBusyId(id);
    startTransition(async () => {
      await archivePost(id);
      setBusyId(null);
      router.refresh();
    });
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar definitivamente "${title}"? Esta acción no se puede deshacer.`)) return;
    setBusyId(id);
    startTransition(async () => {
      await deletePost(id);
      setBusyId(null);
      router.refresh();
    });
  }

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "cover",
        header: "",
        cell: ({ row }) => (
          <div className="relative h-14 w-20 overflow-hidden rounded-lg bg-zs-surface">
            {row.original.coverImageUrl ? (
              <Image
                src={row.original.coverImageUrl}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-zs-muted">
                Sin imagen
              </div>
            )}
          </div>
        ),
      },
      {
        id: "title",
        header: "Título",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              href={`/admin/blog/${row.original.id}`}
              className="line-clamp-2 font-semibold text-zs-blue-900 hover:text-zs-red-600"
            >
              {row.original.title}
            </Link>
            <p className="mt-0.5 truncate text-xs text-zs-muted">/{row.original.slug}</p>
          </div>
        ),
      },
      {
        id: "author",
        header: "Autor",
        cell: ({ row }) => (
          <span className="text-sm text-zs-ink">{row.original.author}</span>
        ),
      },
      {
        id: "tags",
        header: "Etiquetas",
        cell: ({ row }) =>
          row.original.tags.length === 0 ? (
            <span className="text-xs text-zs-muted">—</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.slice(0, 4).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
              {row.original.tags.length > 4 && (
                <span className="text-xs text-zs-muted">+{row.original.tags.length - 4}</span>
              )}
            </div>
          ),
      },
      {
        id: "status",
        header: "Estado",
        cell: ({ row }) =>
          row.original.status === "PUBLISHED" ? (
            <Badge variant="success">Publicado</Badge>
          ) : (
            <Badge variant="draft">Borrador</Badge>
          ),
      },
      {
        id: "publishedAt",
        header: "Publicado",
        cell: ({ row }) => (
          <span className="text-xs text-zs-muted">
            {row.original.publishedAt ? formatDateES(row.original.publishedAt) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {row.original.status === "PUBLISHED" && (
              <Button asChild size="icon" variant="ghost" title="Ver público">
                <a
                  href={`/blog/${row.original.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ver "${row.original.title}" en el blog público`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button asChild size="icon" variant="ghost" title="Editar">
              <Link href={`/admin/blog/${row.original.id}`} aria-label="Editar">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="icon"
              variant="ghost"
              title="Duplicar"
              disabled={pending && busyId === row.original.id}
              onClick={() => onDuplicate(row.original.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            {row.original.status === "PUBLISHED" && (
              <Button
                size="icon"
                variant="ghost"
                title="Archivar"
                disabled={pending && busyId === row.original.id}
                onClick={() => onArchive(row.original.id)}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              title="Eliminar"
              disabled={pending && busyId === row.original.id}
              onClick={() => onDelete(row.original.id, row.original.title)}
            >
              <Trash2 className="h-4 w-4 text-zs-red-600" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, busyId],
  );

  const table = useReactTable({
    data: posts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zs-border bg-white p-4">
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-xs font-semibold text-zs-muted">Buscar</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Título, slug, autor…"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zs-muted">Estado</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="DRAFT">Borrador</SelectItem>
              <SelectItem value="PUBLISHED">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-zs-muted">Etiqueta</label>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters}>Aplicar</Button>
        <Button variant="outline" onClick={resetFilters}>
          Limpiar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zs-border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zs-border bg-zs-surface text-xs uppercase tracking-wide text-zs-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 font-semibold">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-zs-muted">
                  No hay artículos que coincidan con los filtros.{" "}
                  <Link href="/admin/blog/nuevo" className="font-semibold text-zs-blue-700 hover:underline">
                    Crea el primero →
                  </Link>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-zs-border last:border-0 hover:bg-zs-surface/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zs-muted">
        {posts.length} {posts.length === 1 ? "artículo" : "artículos"}{" "}
        {posts.length === 200 && "(mostrando los 200 más recientes)"}{" "}
        <MoreHorizontal className="inline h-3 w-3 align-middle" />
      </p>
    </div>
  );
}
