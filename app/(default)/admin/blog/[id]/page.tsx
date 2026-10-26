import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BlogEditor } from "./BlogEditor";

export const metadata = { title: "Editar post" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminBlogPostPage({ params }: { params: Params }) {
  const { id } = await params;

  if (id === "nuevo") {
    // Defensa: la ruta /admin/blog/nuevo tiene su propio page.tsx; si se navega
    // accidentalmente aquí con "nuevo", redirigimos al editor en blanco.
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Nuevo artículo"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Blog", href: "/admin/blog" },
            { label: "Nuevo" },
          ]}
        />
        <BlogEditor postId={null} initial={{}} />
      </div>
    );
  }

  const post = await db.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={post.title || "Editar artículo"}
        description="Edita contenido, metadatos y publicación del artículo."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Blog", href: "/admin/blog" },
          { label: post.title || "Editar" },
        ]}
      />
      <BlogEditor
        postId={post.id}
        initial={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          contentMd: post.contentMd,
          coverImageUrl: post.coverImageUrl ?? "",
          ogImageUrl: post.ogImageUrl ?? "",
          author: post.author,
          tags: post.tags,
          status: post.status,
          metaTitle: post.metaTitle ?? "",
          metaDescription: post.metaDescription ?? "",
          publishedAt: post.publishedAt,
        }}
      />
    </div>
  );
}
