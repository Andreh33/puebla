"use client";

/**
 * FormErrorDialog — aviso CENTRADO y claro cuando un formulario no se puede
 * guardar. Hermano de UploadErrorDialog (subidas de archivos), pero para
 * errores de validación de formulario: muestra qué campo falla, en qué pestaña
 * está y cómo arreglarlo, y ofrece saltar a esa pestaña.
 *
 * Se alimenta de `ProductFormErrorItem[]` (lib/admin/product-form-errors.ts).
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ProductFormErrorItem } from "@/lib/admin/product-form-errors";

export type FormErrorDialogData = {
  title: string;
  items: ProductFormErrorItem[];
  /** Pie opcional con una indicación de qué hacer. */
  hint?: string;
};

export function FormErrorDialog({
  data,
  onClose,
  onGoToTab,
}: {
  data: FormErrorDialogData | null;
  onClose: () => void;
  /** Salta a la pestaña indicada (clave de Tabs). */
  onGoToTab?: (tab: string) => void;
}) {
  const first = data?.items[0];
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        {data && (
          <>
            <DialogHeader>
              <div
                className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-zs-red-50 ring-1 ring-zs-red-200"
                aria-hidden
              >
                <AlertTriangle className="h-7 w-7 text-zs-red-600" />
              </div>
              <DialogTitle className="text-center text-lg">{data.title}</DialogTitle>
            </DialogHeader>

            <ul
              className="max-h-[50vh] space-y-2 overflow-y-auto"
              aria-label="Detalle de los problemas del formulario"
            >
              {data.items.map((it, i) => (
                <li
                  key={`${it.field}-${i}`}
                  className="rounded-lg border border-zs-red-200 bg-zs-red-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-zs-ink">{it.label}</span>
                    {it.tabLabel && (
                      <span className="shrink-0 rounded-full border border-zs-border bg-white px-2 py-0.5 text-[11px] text-zs-muted">
                        {it.tabLabel}
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-zs-ink/80">{it.message}</span>
                </li>
              ))}
            </ul>

            {data.hint && <p className="text-center text-xs text-zs-muted">{data.hint}</p>}

            <div className="flex gap-2">
              {onGoToTab && first && first.tabLabel && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onGoToTab(first.tab);
                    onClose();
                  }}
                >
                  Ir a «{first.tabLabel}»
                </Button>
              )}
              <Button type="button" className="flex-1" onClick={onClose} autoFocus>
                Entendido
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
