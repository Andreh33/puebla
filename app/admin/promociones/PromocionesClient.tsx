"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPromo, updatePromo, togglePromo, deletePromo, type PromoInput } from "./_actions";

export type PromoDTO = {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minSubtotal: number | null;
  maxRedemptions: number | null;
  used: number;
};

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function discountLabel(p: { discountType: string; value: number }): string {
  return p.discountType === "FIXED" ? `−${EUR.format(p.value)}` : `−${p.value}%`;
}

const EMPTY: PromoInput = {
  code: "",
  description: "",
  discountType: "PERCENT",
  value: 10,
  active: true,
  startsAt: null,
  endsAt: null,
  minSubtotal: null,
  maxRedemptions: null,
};

export function PromocionesClient({ promos }: { promos: PromoDTO[] }) {
  const [rows, setRows] = React.useState<PromoDTO[]>(promos);
  const [form, setForm] = React.useState<PromoInput>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  function set<K extends keyof PromoInput>(k: K, v: PromoInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function startEdit(p: PromoDTO) {
    setEditingId(p.id);
    setForm({
      code: p.code,
      description: p.description ?? "",
      discountType: p.discountType,
      value: p.value,
      active: p.active,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      minSubtotal: p.minSubtotal,
      maxRedemptions: p.maxRedemptions,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save() {
    setSaving(true);
    try {
      let newId = editingId;
      if (editingId) {
        const res = await updatePromo(editingId, form);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
      } else {
        const res = await createPromo(form);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        newId = res.id;
      }
      toast.success(editingId ? "Código actualizado" : "Código creado");
      // Refrescamos el estado local con lo enviado (los usos no cambian aquí).
      const norm = form.code.trim().toUpperCase();
      const patch: PromoDTO = {
        id: newId ?? "",
        code: norm,
        description: form.description?.trim() || null,
        discountType: form.discountType,
        value: Number(form.value),
        active: form.active,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
        minSubtotal: form.minSubtotal ?? null,
        maxRedemptions: form.maxRedemptions ?? null,
        used: editingId ? rows.find((r) => r.id === editingId)?.used ?? 0 : 0,
      };
      setRows((rs) => (editingId ? rs.map((r) => (r.id === editingId ? patch : r)) : [patch, ...rs]));
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active } : r)));
    const res = await togglePromo(id, active);
    if (!res.ok) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active: !active } : r)));
      toast.error(res.error);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este código de promoción?")) return;
    const snapshot = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    if (editingId === id) cancelEdit();
    const res = await deletePromo(id);
    if (!res.ok) {
      setRows(snapshot);
      toast.error(res.error);
    }
  }

  return (
    <div className="space-y-5">
      {/* Formulario crear/editar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-zs-ink">
              <Tag className="h-4 w-4" /> {editingId ? "Editar código" : "Nuevo código"}
            </p>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="inline-flex items-center gap-1 text-xs text-zs-blue-700 hover:underline">
                <X className="h-3.5 w-3.5" /> Cancelar edición
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Código</label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="VERANO10"
                className="uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Tipo</label>
              <Select value={form.discountType} onValueChange={(v) => set("discountType", v as "PERCENT" | "FIXED")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Porcentaje (%)</SelectItem>
                  <SelectItem value="FIXED">Importe fijo (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">
                Valor {form.discountType === "FIXED" ? "(€)" : "(%)"}
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.value}
                onChange={(e) => set("value", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Compra mínima (€, opcional)</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.minSubtotal ?? ""}
                onChange={(e) => set("minSubtotal", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="—"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Límite de usos (opcional)</label>
              <Input
                type="number"
                min={1}
                step="1"
                value={form.maxRedemptions ?? ""}
                onChange={(e) => set("maxRedemptions", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="ilimitado"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Desde (opcional)</label>
              <Input type="date" value={form.startsAt ?? ""} onChange={(e) => set("startsAt", e.target.value || null)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Hasta (opcional)</label>
              <Input type="date" value={form.endsAt ?? ""} onChange={(e) => set("endsAt", e.target.value || null)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zs-muted">Descripción (opcional)</label>
              <Input value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Rebajas verano" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-zs-ink">
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} /> Activo
            </label>
            <Button type="button" onClick={save} disabled={saving}>
              <Plus className="mr-1 h-4 w-4" /> {editingId ? "Guardar cambios" : "Crear código"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de códigos */}
      <div className="overflow-x-auto rounded-xl border border-zs-border bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-zs-surface text-left text-xs uppercase text-zs-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Descuento</th>
              <th className="px-3 py-2 font-medium">Condiciones</th>
              <th className="px-3 py-2 text-right font-medium">Usos</th>
              <th className="px-3 py-2 font-medium">Activo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zs-muted">
                  Aún no hay códigos. Crea el primero arriba.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-zs-border align-top">
                  <td className="px-3 py-2">
                    <span className="font-mono font-semibold text-zs-ink">{p.code}</span>
                    {p.description && <span className="block text-xs text-zs-muted">{p.description}</span>}
                  </td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">{discountLabel(p)}</td>
                  <td className="px-3 py-2 text-xs text-zs-muted">
                    {p.minSubtotal != null && <div>Mín. {EUR.format(p.minSubtotal)}</div>}
                    {p.maxRedemptions != null && <div>Máx. {p.maxRedemptions} usos</div>}
                    {(p.startsAt || p.endsAt) && (
                      <div>
                        {p.startsAt ?? "…"} → {p.endsAt ?? "…"}
                      </div>
                    )}
                    {p.minSubtotal == null && p.maxRedemptions == null && !p.startsAt && !p.endsAt && (
                      <span>Sin condiciones</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.used}</td>
                  <td className="px-3 py-2">
                    <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} aria-label="Activo" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => startEdit(p)} aria-label="Editar" className="text-zs-muted hover:text-zs-blue-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => remove(p.id)} aria-label="Borrar" className="text-zs-muted hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
