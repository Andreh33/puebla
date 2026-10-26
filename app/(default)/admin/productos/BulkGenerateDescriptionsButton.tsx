"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { bulkGenerateDescriptionsAction } from "./_actions";

/**
 * Botón que aplica una descripción genérica a TODOS los productos que no
 * tengan una. Confirmación previa con dos opciones:
 *   - "Solo los vacíos" (mode: missing) → recomendado.
 *   - "Sobreescribir todos" (mode: all) → respeta `isCustomized = true`.
 */
export function BulkGenerateDescriptionsButton() {
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const run = async (mode: "missing" | "all") => {
    setOpen(false);
    setPending(true);
    const id = toast.loading(
      mode === "all"
        ? "Sobreescribiendo descripciones de todos los productos…"
        : "Generando descripciones que faltaban…",
    );
    try {
      const res = await bulkGenerateDescriptionsAction(mode);
      toast.dismiss(id);
      if (res.ok) {
        toast.success(
          `${res.updated} producto${res.updated === 1 ? "" : "s"} actualizado${res.updated === 1 ? "" : "s"}. ${res.skipped} sin cambios.`,
        );
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.dismiss(id);
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zs-blue-300 bg-zs-blue-50 px-3 text-sm font-semibold text-zs-blue-900 transition-colors hover:bg-zs-blue-100 disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          Generar descripciones
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generar descripciones para todos</AlertDialogTitle>
          <AlertDialogDescription>
            Aplica una plantilla genérica (del banco de ~264 descripciones) al
            campo descripción y meta description de los productos. Cada
            producto coge una plantilla aleatoria de su categoría y
            sustituye marca, color y nombre.
            <br />
            <br />
            Los productos marcados como{" "}
            <strong>«customizado» (isCustomized)</strong> nunca se tocan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              run("all");
            }}
            className="bg-zs-red-600 hover:bg-zs-red-700"
          >
            Sobreescribir todos
          </AlertDialogAction>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              run("missing");
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Solo los vacíos
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
