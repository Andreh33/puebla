import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RedirectsClient } from "./_client";

export const metadata = { title: "Redirecciones" };
export const dynamic = "force-dynamic";

export default async function RedirectionsAdminPage() {
  const rules = await db.redirectRule.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 500,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Redirecciones 301 / 302"
        description="Gestiona reglas de redirección para preservar el SEO ante cambios de URL. Edge cache: 60s."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Redirecciones" }]}
      />
      <RedirectsClient
        initialRules={rules.map((r) => ({
          id: r.id,
          from: r.from,
          to: r.to,
          type: r.type,
          hits: r.hits,
          isActive: r.isActive,
          notes: r.notes,
          updatedAt: r.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
