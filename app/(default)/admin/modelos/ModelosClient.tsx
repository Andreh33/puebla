"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Search, Save, Package, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchModelsAction,
  saveModelGridAction,
  type ModelGroup,
} from "./_actions";

export function ModelosClient() {
  const [term, setTerm] = React.useState("");
  const [models, setModels] = React.useState<ModelGroup[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function search() {
    const t = term.trim();
    if (t.length < 2) {
      toast.error("Escribe al menos 2 caracteres (nombre, SKU o código de modelo).");
      return;
    }
    setLoading(true);
    try {
      const res = await searchModelsAction(t);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setModels(res.data);
      if (res.data.length === 0) toast("Sin resultados para ese término.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zs-muted" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Busca un modelo: nombre, SKU o código (p. ej. 7708, camiseta técnica…)"
            className="h-11 w-full rounded-xl border border-zs-border bg-white pl-9 pr-3 text-sm outline-none focus:border-zs-blue-700"
          />
        </div>
        <button
          type="button"
          onClick={search}
          disabled={loading}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-zs-blue-900 px-5 text-sm font-semibold text-white hover:bg-zs-blue-800 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </button>
      </div>

      {models === null ? (
        <p className="rounded-xl border border-dashed border-zs-border bg-zs-surface/40 p-8 text-center text-sm text-zs-muted">
          Busca un modelo para ver y editar todos sus colores y tallas en una rejilla.
        </p>
      ) : models.length === 0 ? (
        <p className="rounded-xl border border-zs-border bg-white p-8 text-center text-sm text-zs-muted">
          Sin resultados.
        </p>
      ) : (
        models.map((m) => <ModelGrid key={m.key} model={m} />)
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rejilla de un modelo (colores × tallas) editable
// ---------------------------------------------------------------------------

function ModelGrid({ model }: { model: ModelGroup }) {
  // Estado editable: stock por sizeId, stock total de productos simples y
  // precio/coste por productId.
  const [stock, setStock] = React.useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of model.colors) for (const s of c.sizes) o[s.id] = String(s.stock);
    return o;
  });
  const [productStock, setProductStock] = React.useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const c of model.colors) {
      if (c.sizes.length === 0) o[c.productId] = String(c.stock);
    }
    return o;
  });
  const [prices, setPrices] = React.useState<Record<string, { retail: string; cost: string }>>(
    () => {
      const o: Record<string, { retail: string; cost: string }> = {};
      for (const c of model.colors) {
        o[c.productId] = {
          retail: c.retailPrice ? String(c.retailPrice) : "",
          cost: c.costPrice != null ? String(c.costPrice) : "",
        };
      }
      return o;
    },
  );
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const hasProductsWithoutSizes = model.colors.some((c) => c.sizes.length === 0);

  function setStockVal(sizeId: string, v: string) {
    setStock((s) => ({ ...s, [sizeId]: v.replace(/[^\d]/g, "") }));
    setDirty(true);
  }
  function setProductStockVal(productId: string, v: string) {
    setProductStock((s) => ({ ...s, [productId]: v.replace(/[^\d]/g, "") }));
    setDirty(true);
  }
  function setPriceVal(productId: string, field: "retail" | "cost", v: string) {
    setPrices((p) => ({ ...p, [productId]: { ...p[productId]!, [field]: v.replace(",", ".") } }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const stockChanges = Object.entries(stock).map(([sizeId, value]) => ({
        sizeId,
        value: Number(value || 0),
      }));
      const productStockChanges = Object.entries(productStock).map(([productId, value]) => ({
        productId,
        value: Number(value || 0),
      }));
      const priceChanges = model.colors.map((c) => {
        const e = prices[c.productId]!;
        return {
          productId: c.productId,
          retailPrice: e.retail === "" ? undefined : Number(e.retail),
          costPrice: e.cost === "" ? null : Number(e.cost),
        };
      });
      const res = await saveModelGridAction({
        stock: stockChanges,
        productStock: productStockChanges,
        prices: priceChanges,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Modelo guardado · ${res.data.updated} productos actualizados`);
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zs-border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zs-border bg-zs-surface/60 px-3 py-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 truncate text-sm font-bold text-zs-ink">
            <Package className="h-4 w-4 shrink-0 text-zs-muted" />
            {model.name}
          </h2>
          <p className="text-[11px] text-zs-muted">
            {model.modelCode ? `Modelo ${model.modelCode} · ` : ""}
            {model.colors.length} {model.colors.length === 1 ? "color" : "colores"}
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
            dirty
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-zs-surface text-zs-muted",
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Guardando…" : dirty ? "Guardar modelo" : "Guardado"}
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-zs-muted">
              <th className="px-3 py-2">Color</th>
              {model.sizeLabels.map((s) => (
                <th key={s} className="px-2 py-2 text-center">
                  {s}
                </th>
              ))}
              {hasProductsWithoutSizes && <th className="px-2 py-2 text-center">Stock</th>}
              <th className="px-2 py-2 text-right">Precio €</th>
              <th className="px-2 py-2 text-right">Coste €</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {model.colors.map((c) => {
              const sizeById = new Map(c.sizes.map((s) => [s.size, s]));
              return (
                <tr key={c.productId} className="border-t border-zs-border align-middle">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {c.mainImageUrl ? (
                        <Image
                          src={c.mainImageUrl}
                          alt={c.colorName}
                          width={32}
                          height={32}
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span
                          className="h-8 w-8 shrink-0 rounded border border-zs-border"
                          style={c.colorHex ? { backgroundColor: c.colorHex } : undefined}
                        />
                      )}
                      <span className="whitespace-nowrap">
                        {c.colorName}
                        {c.status !== "ACTIVE" && (
                          <span className="ml-1 text-[10px] uppercase text-zs-muted">
                            ({c.status === "DRAFT" ? "borrador" : c.status.toLowerCase()})
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  {model.sizeLabels.map((label) => {
                    const sz = sizeById.get(label);
                    return (
                      <td key={label} className="px-1 py-1.5 text-center">
                        {sz ? (
                          <input
                            inputMode="numeric"
                            value={stock[sz.id] ?? ""}
                            onChange={(e) => setStockVal(sz.id, e.target.value)}
                            className="h-8 w-12 rounded-md border border-zs-border text-center text-sm outline-none focus:border-zs-blue-700"
                          />
                        ) : (
                          <span className="text-zs-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                  {hasProductsWithoutSizes && (
                    <td className="px-1 py-1.5 text-center">
                      {c.sizes.length === 0 ? (
                        <input
                          inputMode="numeric"
                          value={productStock[c.productId] ?? ""}
                          onChange={(e) => setProductStockVal(c.productId, e.target.value)}
                          aria-label={`Stock total de ${c.colorName}`}
                          className="h-8 w-12 rounded-md border border-zs-border text-center text-sm outline-none focus:border-zs-blue-700"
                        />
                      ) : (
                        <span className="text-zs-muted">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-1 py-1.5 text-right">
                    <input
                      inputMode="decimal"
                      value={prices[c.productId]?.retail ?? ""}
                      onChange={(e) => setPriceVal(c.productId, "retail", e.target.value)}
                      className="h-8 w-20 rounded-md border border-zs-border px-2 text-right text-sm outline-none focus:border-zs-blue-700"
                    />
                  </td>
                  <td className="px-1 py-1.5 text-right">
                    <input
                      inputMode="decimal"
                      value={prices[c.productId]?.cost ?? ""}
                      onChange={(e) => setPriceVal(c.productId, "cost", e.target.value)}
                      className="h-8 w-20 rounded-md border border-zs-border px-2 text-right text-sm outline-none focus:border-zs-blue-700"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Link
                      href={`/admin/productos/${c.productId}`}
                      className="text-zs-muted hover:text-zs-blue-700"
                      title="Abrir ficha completa"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
