"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Upload,
  Image as ImageIcon,
  FileText,
  Users,
  Settings,
  ArrowLeftRight,
  ShieldCheck,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
  exact?: boolean;
};

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Productos", href: "/admin/productos", icon: Package },
  { label: "Categorías", href: "/admin/categorias", icon: FolderTree },
  { label: "Marcas", href: "/admin/marcas", icon: Tags },
  { label: "Importar", href: "/admin/importar/xlsx", icon: Upload },
  { label: "Imágenes", href: "/admin/imagenes", icon: ImageIcon },
  { label: "Blog", href: "/admin/blog", icon: FileText },
  { label: "Leads", href: "/admin/leads", icon: Users },
  { label: "Redirecciones", href: "/admin/redirecciones", icon: ArrowLeftRight },
  { label: "Ajustes", href: "/admin/ajustes", icon: Settings, ownerOnly: true },
  { label: "Usuarios admin", href: "/admin/usuarios", icon: ShieldCheck, ownerOnly: true },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto p-3">
      {items.map((it) => {
        const active = isActive(pathname, it);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
              active
                ? "bg-zs-blue-50 text-zs-blue-900"
                : "text-zs-ink hover:bg-zs-surface hover:text-zs-blue-700",
            )}
          >
            <it.icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-zs-blue-700" : "text-zs-muted",
              )}
              aria-hidden="true"
            />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700 rounded-md"
      aria-label="Ir al dashboard de Zona Sport"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zs-blue-900 text-sm font-bold text-white">
        ZS
      </span>
      <span className="text-sm font-semibold text-zs-ink">Zona Sport · Admin</span>
    </Link>
  );
}

export function Sidebar({
  role,
  footer,
}: {
  role: "OWNER" | "EDITOR";
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOwner = role === "OWNER";
  const items = React.useMemo(
    () => ADMIN_NAV.filter((it) => !it.ownerOnly || isOwner),
    [isOwner],
  );

  return (
    <aside
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-zs-border bg-white lg:flex"
      aria-label="Barra lateral"
    >
      <div className="flex h-16 items-center border-b border-zs-border px-4">
        <Brand />
      </div>
      <NavList items={items} pathname={pathname} />
      {footer && <div className="border-t border-zs-border p-3">{footer}</div>}
    </aside>
  );
}

export function MobileSidebarTrigger({
  role,
  footer,
}: {
  role: "OWNER" | "EDITOR";
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const isOwner = role === "OWNER";
  const items = React.useMemo(
    () => ADMIN_NAV.filter((it) => !it.ownerOnly || isOwner),
    [isOwner],
  );

  // Cierra el drawer cuando el usuario navega
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zs-border bg-white text-zs-ink hover:bg-zs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700 lg:hidden"
        aria-label="Abrir menú de navegación"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col p-0">
        <SheetHeader>
          <SheetTitle>
            <Brand />
          </SheetTitle>
        </SheetHeader>
        <NavList items={items} pathname={pathname} onNavigate={() => setOpen(false)} />
        {footer && <div className="border-t border-zs-border p-3">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
