"use client";

import * as React from "react";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { setStoredPromo } from "@/lib/cart/promo-code";

/**
 * Campo "¿Tienes un código de descuento?" para el carrito. Valida contra el
 * servidor con el `subtotal` actual y, si vale, lo guarda (se aplicará al pagar).
 * `appliedCode`/`discount` los pasa el carrito (vía useCartPromo) para mostrar el
 * estado y el total ya rebajado.
 */
export function PromoCodeField({
  subtotal,
  appliedCode,
  discount,
}: {
  subtotal: number;
  appliedCode: string | null;
  discount: number;
}) {
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function apply() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, subtotal }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        toast.error(data.error ?? "Código no válido.");
        return;
      }
      setStoredPromo(c);
      setCode("");
      toast.success("Código aplicado");
    } catch {
      toast.error("No se pudo validar el código.");
    } finally {
      setBusy(false);
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
        <span className="flex items-center gap-1.5 text-emerald-800">
          <Tag className="h-4 w-4" />
          <span className="font-mono font-semibold">{appliedCode}</span>
          {discount > 0 && <span className="text-emerald-700">aplicado</span>}
        </span>
        <button
          type="button"
          onClick={() => setStoredPromo(null)}
          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
        >
          <X className="h-3.5 w-3.5" /> Quitar
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void apply();
          }
        }}
        placeholder="¿Tienes un código de descuento?"
        aria-label="Código de descuento"
        className="h-11 w-full rounded-xl border border-zs-border px-3 text-sm uppercase outline-none placeholder:normal-case placeholder:text-zs-muted focus:border-zs-blue-700"
      />
      <button
        type="button"
        onClick={apply}
        disabled={busy || !code.trim()}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-zs-border bg-white px-4 text-sm font-semibold text-zs-ink hover:bg-zs-surface disabled:opacity-50"
      >
        {busy ? "…" : "Aplicar"}
      </button>
    </div>
  );
}
