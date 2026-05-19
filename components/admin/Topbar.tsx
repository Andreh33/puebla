"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ADMIN_NAV, MobileSidebarTrigger } from "./Sidebar";
import { AdminUserDropdown } from "./AdminUserDropdown";
import { QuickActions } from "./QuickActions";

type Props = {
  user: { name?: string | null; email: string; role: "OWNER" | "EDITOR" };
  signOutAction: () => Promise<void>;
};

const SECTION_TITLES: Array<{ test: RegExp; title: string }> = [
  { test: /^\/admin\/login/, title: "Acceso" },
  { test: /^\/admin\/productos/, title: "Productos" },
  { test: /^\/admin\/categorias/, title: "Categorías" },
  { test: /^\/admin\/marcas/, title: "Marcas" },
  { test: /^\/admin\/importar/, title: "Importar" },
  { test: /^\/admin\/imagenes/, title: "Imágenes" },
  { test: /^\/admin\/blog/, title: "Blog" },
  { test: /^\/admin\/leads/, title: "Leads" },
  { test: /^\/admin\/redirecciones/, title: "Redirecciones" },
  { test: /^\/admin\/ajustes/, title: "Ajustes" },
  { test: /^\/admin\/usuarios/, title: "Usuarios admin" },
  { test: /^\/admin$/, title: "Dashboard" },
];

function titleFor(pathname: string): string {
  // Prefer exact nav match by href
  const navMatch = ADMIN_NAV.find(
    (it) =>
      (it.exact && pathname === it.href) ||
      (!it.exact && (pathname === it.href || pathname.startsWith(`${it.href}/`))),
  );
  if (navMatch) return navMatch.label;
  for (const s of SECTION_TITLES) {
    if (s.test.test(pathname)) return s.title;
  }
  return "Panel de administración";
}

export function Topbar({ user, signOutAction }: Props) {
  const pathname = usePathname();
  const title = titleFor(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-zs-border bg-white px-4 lg:px-8">
      <div className="flex items-center gap-3">
        <MobileSidebarTrigger role={user.role} />
        <h2 className="text-sm font-semibold text-zs-ink sm:text-base">{title}</h2>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <QuickActions />
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zs-muted hover:bg-zs-surface hover:text-zs-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700 sm:inline-flex"
        >
          Ver tienda
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <AdminUserDropdown user={user} signOutAction={signOutAction} />
      </div>
    </header>
  );
}
