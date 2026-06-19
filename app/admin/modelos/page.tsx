import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ModelosClient } from "./ModelosClient";

export const dynamic = "force-dynamic";

export default function ModelosPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Modelos"
        description="Edita stock, precio y coste de todos los colores y tallas de un modelo a la vez"
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Modelos" }]}
      />
      <ModelosClient />
    </div>
  );
}
