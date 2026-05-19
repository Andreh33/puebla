import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeES } from "@/lib/utils";
import { UsersTableActions } from "./_components/UsersTableActions";
import { NewUserDialog } from "./_components/NewUserDialog";

export const metadata = { title: "Usuarios admin" };
export const dynamic = "force-dynamic";

type SP = { q?: string; role?: string; status?: string };

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (session.user.role !== "OWNER") {
    redirect("/admin?error=forbidden");
  }

  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const roleFilter = sp.role === "OWNER" || sp.role === "EDITOR" ? sp.role : undefined;
  const statusFilter =
    sp.status === "active" ? true : sp.status === "disabled" ? false : undefined;

  const users = await db.adminUser.findMany({
    where: {
      AND: [
        roleFilter ? { role: roleFilter } : {},
        statusFilter !== undefined ? { isActive: statusFilter } : {},
        q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      failedLogins: true,
      lockedUntil: true,
      createdAt: true,
    },
  });

  const now = new Date();

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Usuarios" }]}
        title="Usuarios admin"
        description="Gestiona las cuentas con acceso al CRM. Solo los OWNER pueden ver y modificar esta sección."
        actions={<NewUserDialog />}
      />

      <Card>
        <CardContent className="p-0">
          <form
            action="/admin/usuarios"
            method="get"
            className="flex flex-wrap gap-2 border-b border-zs-border p-4"
          >
            <input
              name="q"
              defaultValue={q}
              type="search"
              placeholder="Buscar por nombre o email…"
              className="h-9 flex-1 min-w-[200px] rounded-lg border border-zs-border bg-white px-3 text-sm placeholder:text-zs-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
              aria-label="Buscar usuarios"
            />
            <select
              name="role"
              defaultValue={roleFilter ?? ""}
              className="h-9 rounded-lg border border-zs-border bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
              aria-label="Filtrar por rol"
            >
              <option value="">Todos los roles</option>
              <option value="OWNER">OWNER</option>
              <option value="EDITOR">EDITOR</option>
            </select>
            <select
              name="status"
              defaultValue={sp.status ?? ""}
              className="h-9 rounded-lg border border-zs-border bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
              aria-label="Filtrar por estado"
            >
              <option value="">Activos y deshabilitados</option>
              <option value="active">Solo activos</option>
              <option value="disabled">Solo deshabilitados</option>
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg bg-zs-blue-900 px-4 text-sm font-semibold text-white hover:bg-zs-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
            >
              Filtrar
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Listado de usuarios admin">
              <thead className="bg-zs-surface text-xs uppercase tracking-wide text-zs-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Último acceso</th>
                  <th className="px-4 py-3 text-left">Intentos</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zs-border">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zs-muted">
                      No hay usuarios con esos filtros.
                    </td>
                  </tr>
                )}
                {users.map((u) => {
                  const locked = u.lockedUntil && u.lockedUntil > now;
                  const isSelf = u.id === session.user.id;
                  return (
                    <tr key={u.id} className="hover:bg-zs-surface/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zs-ink">
                          {u.name ?? "—"}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              tú
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-zs-muted">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={u.role === "OWNER" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {!u.isActive ? (
                          <Badge variant="draft">Deshabilitado</Badge>
                        ) : locked ? (
                          <Badge variant="warning">
                            Bloqueado hasta{" "}
                            {u.lockedUntil!.toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Badge>
                        ) : (
                          <Badge variant="success">Activo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zs-muted">
                        {formatDateTimeES(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zs-muted">
                        {u.failedLogins}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UsersTableActions
                          user={{
                            id: u.id,
                            email: u.email,
                            name: u.name,
                            isActive: u.isActive,
                            locked: !!locked,
                            isSelf,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
