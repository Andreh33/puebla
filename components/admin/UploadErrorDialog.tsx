"use client";

/**
 * UploadErrorDialog — aviso CENTRADO y claro cuando un archivo no se puede
 * añadir (formato no válido, vacío, demasiado grande…). Reutilizable por todas
 * las subidas del admin: imágenes (UploadDropzone) e importaciones (XLSX/Woo).
 *
 * Se alimenta de `UploadError` (lib/admin/upload-validation.ts), que ya trae el
 * texto específico de qué pasa y cómo resolverlo.
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
import type { UploadError } from "@/lib/admin/upload-validation";

export function UploadErrorDialog({
  error,
  onClose,
}: {
  error: UploadError | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!error} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        {error && (
          <>
            <DialogHeader>
              <div
                className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-zs-red-50 ring-1 ring-zs-red-200"
                aria-hidden
              >
                <AlertTriangle className="h-7 w-7 text-zs-red-600" />
              </div>
              <DialogTitle className="text-center text-lg">{error.title}</DialogTitle>
            </DialogHeader>

            <ul className="space-y-2" aria-label="Detalle del problema">
              {error.issues.map((it, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zs-red-200 bg-zs-red-50 p-3 text-sm"
                >
                  {it.fileName && (
                    <span className="block break-all font-semibold text-zs-ink">
                      {it.fileName}
                    </span>
                  )}
                  <span className="text-zs-ink/80">{it.message}</span>
                </li>
              ))}
            </ul>

            {error.hint && (
              <p className="text-center text-xs text-zs-muted">{error.hint}</p>
            )}

            <Button type="button" className="w-full" onClick={onClose} autoFocus>
              Entendido
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
