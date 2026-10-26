import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { db } from "@/lib/db";
import type { LeadStatus, Prisma } from "@prisma/client";
import { LeadsTable } from "./LeadsTable";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: LeadStatus | "ALL";
  from?: string;
  to?: string;
  page?: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const status = sp.status ?? "ALL";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 25;

  const where: Prisma.LeadWhereInput = {};
  if (status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { message: { contains: q, mode: "insensitive" } },
    ];
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const [total, leads, counts] = await Promise.all([
    db.lead.count({ where }).catch(() => 0),
    db.lead
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          message: true,
          sourcePage: true,
          status: true,
          createdAt: true,
        },
      })
      .catch(() => []),
    db.lead.groupBy({ by: ["status"], _count: { _all: true } }).catch(() => []),
  ]);

  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<LeadStatus, number>;

  return (
    <div>
      <AdminPageHeader
        title="Leads"
        description="Mensajes y contactos recibidos desde la web."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Leads" }]}
        actions={
          <Link
            href="/admin/leads?status=NEW"
            className="text-xs text-zs-blue-700 hover:underline"
          >
            Pendientes: {countMap.NEW ?? 0}
          </Link>
        }
      />

      <LeadsTable
        leads={leads}
        total={total}
        page={page}
        pageSize={pageSize}
        filters={{ q, status, from, to }}
        counts={countMap}
      />
    </div>
  );
}
