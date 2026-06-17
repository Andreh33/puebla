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
  ShoppingCart,
  ScanLine,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
  { label: "TPV · Caja", href: "/admin/tpv", icon: ScanLine },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingCart },
  { label: "Imágenes", href: "/admin/imagenes", icon: ImageIcon },
  { label: "Blog", href: "/admin/blog", icon: FileText },
  { label: "Leads", href: "/admin/leads", icon: Users },
  // OCULTO temporalmente a petición del cliente. Qué hace:
  // gestiona redirecciones 301/302 entre URLs antiguas y nuevas del sitio.
  // Útil cuando cambias el slug de un producto o categoría y quieres que
  // los enlaces antiguos (de Google, redes sociales, emails…) sigan
  // llevando al destino correcto en lugar de dar 404 — el middleware lee
  // la tabla RedirectRule y reescribe la URL al vuelo.
  // La ruta /admin/redirecciones sigue accesible si la escribes a mano,
  // pero no aparece en el sidebar. Para reactivarla: descomenta la línea.
  // { label: "Redirecciones", href: "/admin/redirecciones", icon: ArrowLeftRight },
  // "Ajustes" oculto: la página /admin/ajustes aún no existe (el enlace daba
  // 404). Reactivar esta línea cuando se cree la página de ajustes.
  // { label: "Ajustes", href: "/admin/ajustes", icon: Settings, ownerOnly: true },
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
  collapsed = false,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  /** Bloque 8.11: modo iconos-only (sidebar contraído en desktop). */
  collapsed?: boolean;
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
            title={collapsed ? it.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
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
            {!collapsed && <span>{it.label}</span>}
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

  // Bloque 8.11: sidebar desktop contraíble (iconos-only). Persistido en
  // localStorage. Estado inicial = expandido (coincide con SSR; se ajusta al montar).
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("zs:admin-sidebar-state") === "collapsed");
    } catch {
      /* localStorage no disponible */
    }
  }, []);
  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("zs:admin-sidebar-state", next ? "collapsed" : "expanded");
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-zs-border bg-white transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Barra lateral"
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-zs-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {!collapsed && <Brand />}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          aria-expanded={!collapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zs-muted transition-colors hover:bg-zs-surface hover:text-zs-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      <NavList items={items} pathname={pathname} collapsed={collapsed} />
      {footer && !collapsed && <div className="border-t border-zs-border p-3">{footer}</div>}
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
