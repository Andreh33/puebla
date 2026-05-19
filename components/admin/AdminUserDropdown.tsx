"use client";

import * as React from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, ShieldCheck, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  user: { name?: string | null; email: string; role: "OWNER" | "EDITOR" };
  signOutAction: () => Promise<void>;
};

function initialOf(user: Props["user"]): string {
  const src = (user.name || user.email).trim();
  return src.charAt(0).toUpperCase() || "?";
}

export function AdminUserDropdown({ user, signOutAction }: Props) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          className="inline-flex items-center gap-2 rounded-full border border-zs-border bg-white px-2 py-1.5 text-left text-sm transition-colors hover:bg-zs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
          aria-label="Menú de usuario"
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
              user.role === "OWNER" ? "bg-zs-blue-900" : "bg-zs-blue-700",
            )}
            aria-hidden="true"
          >
            {initialOf(user)}
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-xs font-semibold text-zs-ink">
              {user.name ?? user.email.split("@")[0]}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-zs-muted">
              {user.role}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-zs-muted" aria-hidden="true" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={6}
            align="end"
            className="z-50 w-64 rounded-xl border border-zs-border bg-white p-2 shadow-lg"
          >
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white",
                  user.role === "OWNER" ? "bg-zs-blue-900" : "bg-zs-blue-700",
                )}
                aria-hidden="true"
              >
                {initialOf(user)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zs-ink">
                  {user.name ?? "Sin nombre"}
                </p>
                <p className="truncate text-xs text-zs-muted">{user.email}</p>
              </div>
            </div>
            <DropdownMenu.Separator className="my-2 h-px bg-zs-border" />
            <DropdownMenu.Item asChild>
              <Link
                href="/admin/usuarios"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zs-ink outline-none data-[highlighted]:bg-zs-surface"
              >
                <ShieldCheck className="h-4 w-4 text-zs-muted" aria-hidden="true" />
                <span>Rol:&nbsp;</span>
                <span className="font-semibold">{user.role}</span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zs-ink outline-none data-[highlighted]:bg-zs-surface"
              onSelect={(e) => {
                e.preventDefault();
              }}
            >
              <User className="h-4 w-4 text-zs-muted" aria-hidden="true" />
              <span className="truncate">Sesión activa 8h</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-2 h-px bg-zs-border" />
            <DropdownMenu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zs-red-700 outline-none data-[highlighted]:bg-zs-red-50"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar sesión?</DialogTitle>
            <DialogDescription>
              Saldrás del panel de administración. Volverás a la pantalla de inicio
              de sesión.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await signOutAction();
                });
              }}
            >
              {pending ? "Cerrando…" : "Cerrar sesión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
