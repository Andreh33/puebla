"use client";

import * as React from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createAdminUser } from "../_actions";
import { useRouter } from "next/navigation";

export function NewUserDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createAdminUser(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear nuevo administrador</DialogTitle>
          <DialogDescription>
            La contraseña deberá compartirse por un canal seguro. El usuario podrá
            cambiarla tras el primer acceso.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-zs-red-200 bg-zs-red-50 p-3 text-sm text-zs-red-700"
            >
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-name">Nombre</Label>
            <Input id="new-name" name="name" required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" name="email" type="email" required autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-role">Rol</Label>
            <select
              id="new-role"
              name="role"
              defaultValue="EDITOR"
              className="h-10 w-full rounded-lg border border-zs-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
            >
              <option value="EDITOR">EDITOR — solo contenido</option>
              <option value="OWNER">OWNER — acceso total</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Contraseña temporal</Label>
            <Input
              id="new-password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              placeholder="Mínimo 10 caracteres"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando…" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
