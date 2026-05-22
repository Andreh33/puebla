"use client";

import * as React from "react";
import { toast } from "sonner";
import { Archive } from "lucide-react";
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
import { draftAllZeroStockAction } from "./_actions";

/**
 * Botón global "Sin stock → borrador": pasa a BORRADOR todos los productos
 * ACTIVE con stock total 0, sin necesidad de seleccionarlos en la tabla.
 * (La versión por selección sigue en la barra de acciones masivas.)
 */
export function DraftZeroStockButton() {
  const [pending, setPending] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const run = async () => {
    setOpen(false);
    setPending(true);
    const id = toast.loading("Pasando a borrador los productos sin stock…");
    try {
      const res = await draftAllZeroStockAction();
      toast.dismiss(id);
      if (res.ok) {
        toast.success(
          res.count === 0
            ? "No había productos activos sin stock."
            : `${res.count} producto${res.count === 1 ? "" : "s"} sin stock pasaron a borrador.`,
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
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
        >
          <Archive className="h-4 w-4" />
          Sin stock → borrador
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Pasar a borrador los productos sin stock?</AlertDialogTitle>
          <AlertDialogDescription>
            Todos los productos <strong>activos</strong> cuyo stock total sea 0
            pasarán a estado <strong>Borrador</strong> y dejarán de mostrarse en
            la tienda hasta reponer stock y reactivarlos. No se modifica el stock
            ni se borra nada; es reversible a mano.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              run();
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Pasar a borrador
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
