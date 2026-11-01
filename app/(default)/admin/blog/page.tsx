import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { BlogTable } from "./BlogTable";

export const metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; status?: string; tag?: string }>;

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q, status, tag } = await searchParams;

  let posts: Array<{
    id: string;
    slug: string;
    title: string;
    author: string;
    coverImageUrl: string | null;
    status: "DRAFT" | "PUBLISHED";
    tags: string[];
    publishedAt: Date | null;
    updatedAt: Date;
  }> = [];
  let allTags: string[] = [];
  let dbAvailable = true;
  try {
    const where: Record<string, unknown> = {};
    if (status === "DRAFT" || status === "PUBLISHED") where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { author: { contains: q, mode: "insensitive" } },
      ];
    }
    if (tag) where.tags = { has: tag };

    posts = await db.blogPost.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
      select: {
        id: true,
        slug: true,
        title: true,
        author: true,
        coverImageUrl: true,
        status: true,
        tags: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    const all = await db.blogPost.findMany({ select: { tags: true }, take: 500 });
    const set = new Set<string>();
    for (const p of all) for (const t of p.tags) set.add(t);
    allTags = Array.from(set).sort();
  } catch {
    dbAvailable = false;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog editorial"
        description="Gestiona los artículos del blog: guías, comparativas, noticias y eventos."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Blog" },
        ]}
        actions={
          <Button asChild>
            <Link href="/admin/blog/nuevo">
              <Plus className="h-4 w-4" />
              Nuevo post
            </Link>
          </Button>
        }
      />

      {!dbAvailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          La base de datos no está disponible. Comprueba la conexión.
        </div>
      ) : (
        <BlogTable
          posts={posts}
          allTags={allTags}
          initialQuery={q ?? ""}
          initialStatus={status ?? "ALL"}
          initialTag={tag ?? "ALL"}
        />
      )}
    </div>
  );
}
