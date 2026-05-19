"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

interface ProductSkuProps {
  sku: string;
  /** Etiqueta visible — "REF." por defecto. */
  label?: string;
}

/**
 * Muestra la referencia (SKU) del producto con un botón de copiar al portapapeles.
 * Estilo: tipografía monospace, gris medio, click-to-copy con feedback de 1.5s.
 *
 * Se renderiza junto al CTA en la ficha de producto.
 */
export function ProductSku({ sku, label = "REF." }: ProductSkuProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sku);
      } else {
        // Fallback antiguo
        const ta = document.createElement("textarea");
        ta.value = sku;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silencioso: si el navegador bloquea, el usuario puede seleccionar a mano.
    }
  }, [sku]);

  return (
    <p
      className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zs-muted"
      aria-label={`Referencia del producto: ${sku}`}
    >
      <span>{label}</span>
      <span className="select-all font-mono text-[11px] text-zs-ink">{sku}</span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Referencia copiada" : "Copiar referencia"}
        className="inline-flex h-5 w-5 items-center justify-center rounded text-zs-muted transition hover:bg-gray-100 hover:text-zs-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
        ) : (
          <Copy className="h-3 w-3" aria-hidden="true" />
        )}
      </button>
      {copied && (
        <span className="text-[10px] font-semibold normal-case tracking-normal text-emerald-600">
          Copiada
        </span>
      )}
    </p>
  );
}
