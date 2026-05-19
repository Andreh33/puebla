"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Power, Unlock } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  resetAdminPassword,
  toggleAdminActive,
  unlockAdminUser,
  type ActionResult,
} from "../_actions";

type User = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  locked: boolean;
  isSelf: boolean;
};

export function UsersTableActions({ user }: { user: User }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleResult(res: ActionResult, close?: () => void) {
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    close?.();
    router.refresh();
  }

  function onUnlock() {
    const fd = new FormData();
    fd.set("id", user.id);
    startTransition(async () => {
      const res = await unlockAdminUser(fd);
      handleResult(res);
    });
  }

  function onToggle() {
    const fd = new FormData();
    fd.set("id", user.id);
    fd.set("isActive", String(!user.isActive));
    startTransition(async () => {
      const res = await toggleAdminActive(fd);
      handleResult(res, () => setToggleOpen(false));
    });
  }

  function onResetSubmit(formData: FormData) {
    formData.set("id", user.id);
    startTransition(async () => {
      const res = await resetAdminPassword(formData);
      handleResult(res, () => setResetOpen(false));
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {user.locked && (
        <Button
          size="sm"
          variant="outline"
          onClick={onUnlock}
          disabled={pending}
          aria-label={`Desbloquear ${user.email}`}
        >
          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Desbloquear</span>
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setError(null);
          setResetOpen(true);
        }}
        aria-label={`Restablecer contraseña de ${user.email}`}
      >
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Contraseña</span>
      </Button>
      <Button
        size="sm"
        variant={user.isActive ? "destructive" : "outline"}
        onClick={() => {
          setError(null);
          setToggleOpen(true);
        }}
        disabled={user.isSelf && user.isActive}
        title={user.isSelf && user.isActive ? "No puedes deshabilitar tu propia cuenta" : undefined}
        aria-label={user.isActive ? `Deshabilitar ${user.email}` : `Reactivar ${user.email}`}
      >
        {user.isActive ? (
          <>
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Deshabilitar</span>
          </>
        ) : (
          <>
            <Power className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reactivar</span>
          </>
        )}
      </Button>

      {/* Diálogo reset password */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Vas a fijar una nueva contraseña temporal para <strong>{user.email}</strong>.
              Comparte la contraseña por un canal seguro.
            </DialogDescription>
          </DialogHeader>
          <form action={onResetSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-zs-red-200 bg-zs-red-50 p-3 text-sm text-zs-red-700"
              >
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor={`pwd-${user.id}`}>Nueva contraseña</Label>
              <Input
                id={`pwd-${user.id}`}
                name="password"
                type="password"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setResetOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Restablecer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmación toggle */}
      <Dialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {user.isActive ? "Deshabilitar usuario" : "Reactivar usuario"}
            </DialogTitle>
            <DialogDescription>
              {user.isActive
                ? `${user.email} dejará de poder acceder al CRM. Podrás reactivarlo más tarde.`
                : `${user.email} podrá volver a acceder al CRM con sus credenciales actuales.`}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-zs-red-200 bg-zs-red-50 p-3 text-sm text-zs-red-700"
            >
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setToggleOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant={user.isActive ? "destructive" : "default"}
              disabled={pending}
              onClick={onToggle}
            >
              {pending ? "Guardando…" : user.isActive ? "Deshabilitar" : "Reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
