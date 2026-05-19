import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";

export const metadata: Metadata = {
  title: { default: "Admin · Zona Sport", template: "%s · Admin Zona Sport" },
  robots: { index: false, follow: false },
};

// Rutas dentro de /admin/** que NO requieren sesión y por tanto deben renderizar
// con un shell mínimo (sin sidebar). Evita el bucle /admin/login → /admin/login.
const PUBLIC_ADMIN_PATHS = new Set<string>(["/admin/login"]);

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";

  // Si estamos en una ruta admin pública (login), saltamos el chrome y el auth.
  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return <>{children}</>;
  }

  // Tolerante a DB caída durante bootstrap: si auth() lanza, tratamos como
  // "sin sesión" y redirigimos a login.
  type AdminSession = { user?: { name?: string | null; email?: string | null; role: "OWNER" | "EDITOR" } };
  let session: AdminSession | null = null;
  try {
    session = (await auth()) as AdminSession | null;
  } catch (err) {
    console.warn("[admin] auth() falló:", (err as Error).message);
  }

  if (!session?.user) {
    redirect("/admin/login");
  }

  const user = {
    name: session.user.name,
    email: session.user.email ?? "",
    role: session.user.role,
  };

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="flex min-h-screen bg-zs-surface">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} signOutAction={signOutAction} />
        <main id="admin-main" className="flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
