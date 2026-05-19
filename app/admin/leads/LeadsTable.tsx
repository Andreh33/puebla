"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { formatDateTimeES, truncate } from "@/lib/utils";
import { toast } from "sonner";
import { exportLeadsCsv } from "./_actions";

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  sourcePage: string | null;
  status: LeadStatus;
  createdAt: Date;
};

function statusBadge(status: LeadStatus) {
  switch (status) {
    case "NEW":
      return <Badge variant="warning">Nuevo</Badge>;
    case "CONTACTED":
      return <Badge variant="default">Contactado</Badge>;
    case "CLOSED":
      return <Badge variant="secondary">Cerrado</Badge>;
    case "SPAM":
      return <Badge variant="sale">Spam</Badge>;
  }
}

export function LeadsTable({
  leads,
  total,
  page,
  pageSize,
  filters,
  counts,
}: {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: { q: string; status: LeadStatus | "ALL"; from: string; to: string };
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(filters.q);
  const [status, setStatus] = React.useState<LeadStatus | "ALL">(filters.status);
  const [from, setFrom] = React.useState(filters.from);
  const [to, setTo] = React.useState(filters.to);
  const [exporting, setExporting] = React.useState(false);

  const columns = React.useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        header: "Estado",
        accessorKey: "status",
        cell: (info) => statusBadge(info.getValue<LeadStatus>()),
      },
      { header: "Nombre", accessorKey: "name" },
      {
        header: "Email",
        accessorKey: "email",
        cell: (info) => (
          <a
            href={`mailto:${info.getValue<string>()}`}
            className="text-zs-blue-700 hover:underline"
          >
            {info.getValue<string>()}
          </a>
        ),
      },
      {
        header: "Teléfono",
        accessorKey: "phone",
        cell: (info) => info.getValue<string | null>() ?? "—",
      },
      {
        header: "Mensaje",
        accessorKey: "message",
        cell: (info) => (
          <span className="text-zs-muted">
            {truncate(info.getValue<string>(), 80)}
          </span>
        ),
      },
      {
        header: "Fecha",
        accessorKey: "createdAt",
        cell: (info) => formatDateTimeES(info.getValue<Date>()),
      },
      {
        header: "Acciones",
        id: "actions",
        cell: (info) => (
          <Link
            href={`/admin/leads/${info.row.original.id}`}
            className="text-xs text-zs-blue-700 hover:underline"
          >
            Abrir
          </Link>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  function applyFilters() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "ALL") params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/leads?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/admin/leads?${params.toString()}`);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await exportLeadsCsv({ q, status, from, to });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data!.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data!.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV descargado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Input
            placeholder="Buscar (nombre, email, mensaje)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as LeadStatus | "ALL")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos ({total})</SelectItem>
            <SelectItem value="NEW">Nuevos ({counts.NEW ?? 0})</SelectItem>
            <SelectItem value="CONTACTED">
              Contactados ({counts.CONTACTED ?? 0})
            </SelectItem>
            <SelectItem value="CLOSED">Cerrados ({counts.CLOSED ?? 0})</SelectItem>
            <SelectItem value="SPAM">Spam ({counts.SPAM ?? 0})</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Desde"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Hasta"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={applyFilters} type="button">
          <Search className="mr-2 h-4 w-4" /> Filtrar
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting}
          type="button"
        >
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exportando…" : "Exportar CSV"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zs-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-zs-surface text-left text-xs uppercase text-zs-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-2">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-zs-muted"
                  colSpan={columns.length}
                >
                  Sin leads con esos criterios.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-zs-border hover:bg-zs-surface/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zs-muted">
          <span>
            Página {page} de {totalPages} · {total} leads
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              type="button"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              type="button"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
