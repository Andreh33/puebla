import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PermisosClient } from "./PermisosClient";

export const metadata = { title: "Permisos · Admin" };

export default function PermisosPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Permisos"
        description="Ajustes y permisos del panel."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Permisos" }]}
      />
      <PermisosClient />
    </div>
  );
}
