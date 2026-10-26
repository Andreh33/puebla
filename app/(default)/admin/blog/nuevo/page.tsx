import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BlogEditor } from "../[id]/BlogEditor";

export const metadata = { title: "Nuevo post" };

export default function NewBlogPostPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Nuevo artículo"
        description="Redacta un nuevo post. Puedes empezar desde una plantilla para acelerar el trabajo."
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
