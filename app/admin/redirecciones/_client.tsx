"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Upload, Search, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  createRedirect,
  deleteRedirect,
  importRedirectsCsv,
  toggleRedirect,
  updateRedirect,
} from "./_actions";

type Rule = {
  id: string;
  from: string;
  to: string;
  type: number;
  hits: number;
  isActive: boolean;
  notes: string | null;
  updatedAt: string;
};

export function RedirectsClient({ initialRules }: { initialRules: Rule[] }) {
  const [rules, setRules] = React.useState<Rule[]>(initialRules);
  const [filter, setFilter] = React.useState("");
  const [editing, setEditing] = React.useState<Rule | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const filtered = React.useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return rules;
    return rules.filter(
      (r) =>
        r.from.toLowerCase().includes(t) ||
        r.to.toLowerCase().includes(t) ||
        (r.notes ?? "").toLowerCase().includes(t),
    );
  }, [rules, filter]);

  function refresh() {
    startTransition(() => {
      // El endpoint solo trae reglas activas; lo más simple es recargar la
      // página y dejar que el server component traiga el snapshot completo.
      location.reload();
    });
  }

  async function onToggle(r: Rule, isActive: boolean) {
    try {
      await toggleRedirect(r.id, isActive);
      setRules((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive } : x)));
      toast.success(isActive ? "Regla activada" : "Regla desactivada");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function onDelete(r: Rule) {
    if (!confirm(`¿Eliminar la redirección ${r.from} → ${r.to}?`)) return;
    try {
      await deleteRedirect(r.id);
      setRules((prev) => prev.filter((x) => x.id !== r.id));
      toast.success("Eliminada");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted"
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por origen, destino o notas…"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Nueva redirección
        </Button>
        <Button variant="outline" onClick={() => setImporting(true)}>
          <Upload className="mr-1 h-4 w-4" aria-hidden="true" /> Importar CSV
        </Button>
        <SuggestionsButton />
      </div>

      <div className="rounded-2xl border border-zs-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Origen</TableHead>
              <TableHead className="w-[32%]">Destino</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Hits</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-zs-muted">
                  No hay reglas. Pulsa “Nueva redirección” para empezar.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.from}</TableCell>
                  <TableCell className="break-all font-mono text-xs">{r.to}</TableCell>
                  <TableCell>
                    <Badge variant={r.type === 301 ? "default" : "secondary"}>{r.type}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{r.hits}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.isActive}
                      onCheckedChange={(v) => onToggle(r, v)}
                      aria-label={`Activar/desactivar ${r.from}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(r)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(r)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-zs-red-700" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(creating || editing) && (
        <EditDialog
          rule={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={refresh}
        />
      )}

      {importing && (
        <ImportDialog onClose={() => setImporting(false)} onDone={refresh} />
      )}

      {pending && <p className="text-xs text-zs-muted">Actualizando…</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function EditDialog({
  rule,
  onClose,
  onSaved,
}: {
  rule: Rule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [from, setFrom] = React.useState(rule?.from ?? "/");
  const [to, setTo] = React.useState(rule?.to ?? "/");
  const [type, setType] = React.useState<number>(rule?.type ?? 301);
  const [isActive, setIsActive] = React.useState<boolean>(rule?.isActive ?? true);
  const [notes, setNotes] = React.useState(rule?.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        from,
        to,
        type: type as 301 | 302,
        isActive,
        notes: notes || null,
      };
      if (rule) await updateRedirect(rule.id, payload);
      else await createRedirect(payload);
      toast.success(rule ? "Regla actualizada" : "Regla creada");
      onClose();
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Editar redirección" : "Nueva redirección"}</DialogTitle>
          <DialogDescription>
            Origen siempre relativo (empieza por “/”). Destino puede ser relativo o absoluto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label htmlFor="from">Origen</Label>
            <Input
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="/url-antigua"
              required
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="to">Destino</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="/url-nueva o https://..."
              required
              className="font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(Number(e.target.value))}
                className="h-10 w-full rounded-lg border border-zs-border bg-white px-3 text-sm"
              >
                <option value={301}>301 (permanente)</option>
                <option value={302}>302 (temporal)</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <Label htmlFor="active" className="m-0">Activa</Label>
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo, ticket, etc."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await importRedirectsCsv(csv);
      toast.success(`Importadas ${res.created}, saltadas ${res.skipped}`);
      if (res.errors.length) console.warn(res.errors);
      onClose();
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Cabeceras admitidas: <code>from,to,type,isActive,notes</code>. Filas con
            errores se omiten.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"from,to,type,isActive,notes\n/old,/new,301,true,migración"}
          rows={10}
          className="font-mono text-xs"
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !csv.trim()}>
            {busy ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SuggestionsButton() {
  return (
    <Button
      variant="outline"
      onClick={() =>
        toast.info(
          "Sugerencias automáticas en construcción: cuando esté integrado el log de 404, aparecerán aquí URLs candidatas a redirigir.",
        )
      }
    >
      <Lightbulb className="mr-1 h-4 w-4" aria-hidden="true" /> Sugerencias
    </Button>
  );
}
