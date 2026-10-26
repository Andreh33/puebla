"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Download } from "lucide-react";
import { toast } from "sonner";

type PreviewItem = {
  asin: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  category: string | null;
  affiliateUrl: string;
};

const ASIN_REGEX = /^[A-Z0-9]{10}$/;

function parseAsins(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;\s]+/)
        .map((s) => s.trim())
        .map((s) => {
          if (ASIN_REGEX.test(s.toUpperCase())) return s.toUpperCase();
          const m =
            s.match(/\/dp\/([A-Z0-9]{10})/i) ||
            s.match(/\/gp\/product\/([A-Z0-9]{10})/i);
          return m && m[1] ? m[1].toUpperCase() : "";
        })
        .filter(Boolean),
    ),
  );
}

export function AmazonImportClient({ enabled }: { enabled: boolean }) {
  const [input, setInput] = React.useState("");
  const [single, setSingle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [items, setItems] = React.useState<PreviewItem[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  async function handlePreview() {
    const asins = parseAsins(`${single}\n${input}`);
    if (asins.length === 0) {
      toast.error("Introduce al menos un ASIN o URL válido");
      return;
    }
    if (asins.length > 10) {
      toast.error("Máximo 10 ASINs por petición (límite PA-API)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/import/amazon/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asins }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Error obteniendo preview");
        return;
      }
      setItems(json.items);
      setSelected(new Set(json.items.map((i: PreviewItem) => i.asin)));
      toast.success(`${json.items.length} producto(s) listos para importar`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    const asins = items.filter((i) => selected.has(i.asin)).map((i) => i.asin);
    if (asins.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/import/amazon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ asins }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Error importando");
        return;
      }
      toast.success(
        `Importados: ${json.created} nuevos, ${json.updated} actualizados.`,
      );
      setItems([]);
      setSelected(new Set());
      setInput("");
      setSingle("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zs-ink">
            ASIN o URL de Amazon (rápido)
          </label>
          <Input
            value={single}
            onChange={(e) => setSingle(e.target.value)}
            placeholder="B0CXYZ1234 o https://www.amazon.es/dp/B0CXYZ1234"
            disabled={!enabled || loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zs-ink">
            Lote (uno por línea, máx. 10)
          </label>
          <Textarea
            rows={5}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"B0CXYZ1234\nB0AABB2233\n..."}
            disabled={!enabled || loading}
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePreview}
            disabled={!enabled || loading}
            type="button"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Previsualizar
          </Button>
        </div>
      </Card>

      {items.length > 0 && (
        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zs-blue-900">
              {items.length} producto(s) en preview
            </h2>
            <Button onClick={handleImport} disabled={importing} type="button">
              {importing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Importar seleccionados ({selected.size})
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it) => {
              const isSelected = selected.has(it.asin);
              return (
                <div
                  key={it.asin}
                  className="flex gap-3 rounded-lg border border-zs-border p-3"
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(v) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(it.asin);
                        else next.delete(it.asin);
                        return next;
                      });
                    }}
                    aria-label={`Seleccionar ${it.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    {it.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.imageUrl}
                        alt={it.title}
                        className="mb-2 h-32 w-full rounded object-contain"
                      />
                    )}
                    <p className="line-clamp-2 text-sm font-medium text-zs-ink">
                      {it.title}
                    </p>
                    <p className="text-xs text-zs-muted">
                      {it.brand ?? "—"} · {it.category ?? "—"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zs-blue-700">
                      {it.price != null
                        ? new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: it.currency || "EUR",
                          }).format(it.price)
                        : "Sin precio"}
                    </p>
                    {it.availability && (
                      <p className="text-xs text-zs-muted">{it.availability}</p>
                    )}
                    <p className="mt-1 text-[10px] font-mono text-zs-muted">
                      {it.asin}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
