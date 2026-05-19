"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type SizeOption = {
  id: string;
  size: string;
  stock: number;
};

type Props = {
  sizes: SizeOption[];
  defaultSize?: string;
  onChange?: (size: string | null) => void;
};

export function SizeSelector({ sizes, defaultSize, onChange }: Props) {
  const [selected, setSelected] = useState<string | null>(defaultSize ?? null);

  if (!sizes || sizes.length === 0) {
    return (
      <p className="text-sm text-zs-muted">
        Consulta disponibilidad de tallas por WhatsApp.
      </p>
    );
  }

  // Caso especial: única talla → mostrar pill informativa
  if (sizes.length === 1 && (sizes[0]!.size.toUpperCase() === "ÚNICA" || sizes[0]!.size.toUpperCase() === "UNICA")) {
    return (
      <div className="space-y-2">
        <span className="inline-flex items-center rounded-full border border-zs-border bg-zs-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zs-ink">
          Talla única
        </span>
        {sizes[0]!.stock <= 0 && (
          <p className="text-xs text-zs-red-600">Sin stock — consulta por WhatsApp.</p>
        )}
      </div>
    );
  }

  const handlePick = (s: SizeOption) => {
    if (s.stock <= 0) return;
    const next = selected === s.size ? null : s.size;
    setSelected(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sizes.map((s) => {
          const out = s.stock <= 0;
          const active = selected === s.size;
          return (
            <button
              key={s.id}
              type="button"
              disabled={out}
              onClick={() => handlePick(s)}
              aria-pressed={active}
              className={cn(
                "relative inline-flex h-10 min-w-12 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
                out
                  ? "cursor-not-allowed border-dashed border-zs-border bg-white text-zs-muted/60 line-through"
                  : active
                    ? "border-zs-blue-900 bg-zs-blue-900 text-white shadow-sm"
                    : "border-zs-border bg-white text-zs-ink hover:border-zs-blue-700 hover:text-zs-blue-700",
              )}
              aria-label={out ? `Talla ${s.size} (sin stock)` : `Talla ${s.size}`}
            >
              {s.size}
            </button>
          );
        })}
      </div>
      {selected ? (
        <p className="text-xs text-zs-muted">Talla seleccionada: <strong className="text-zs-ink">{selected}</strong></p>
      ) : (
        <p className="text-xs text-zs-muted">Selecciona una talla.</p>
      )}
    </div>
  );
}
