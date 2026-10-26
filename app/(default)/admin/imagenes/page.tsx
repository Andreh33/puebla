import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GalleryClient } from "./GalleryClient";

export const metadata: Metadata = {
  title: "Imágenes",
};

// Renderizado dinámico — la lista viene de Vercel Blob, no se puede prerender.
export const dynamic = "force-dynamic";

export default function ImagenesPage() {
  const blobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  return (
    <>
      <AdminPageHeader
        title="Imágenes"
        description="Galería completa de imágenes en Vercel Blob: productos, blog, marcas y categorías."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Imágenes" }]}
      />
      {!blobConfigured ? (
        <div
          role="alert"
          className="rounded-2xl border border-zs-red-200 bg-zs-red-50 p-6 text-sm text-zs-red-800"
        >
          <p className="font-semibold">Vercel Blob no está configurado.</p>
          <p className="mt-1">
            Añade <code className="font-mono">BLOB_READ_WRITE_TOKEN</code> a tu{" "}
            <code className="font-mono">.env.local</code> para activar la galería.
          </p>
        </div>
      ) : (
        <GalleryClient />
      )}
    </>
  );
}
