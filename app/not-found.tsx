import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Página no encontrada",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-zs-red-600">
        Error 404
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-zs-blue-900 sm:text-5xl">
        Aquí no hay nada deportivo
      </h1>
      <p className="mt-4 max-w-xl text-balance text-base text-zs-muted">
        La página que buscas no existe o fue movida. Prueba a buscar lo que necesitas o
        vuelve a la portada.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zs-blue-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800"
        >
          Volver al inicio
        </Link>
        <Link
          href="/contacto"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zs-border bg-white px-6 text-sm font-semibold text-zs-ink hover:bg-zs-surface"
        >
          Contactar con la tienda
        </Link>
      </div>
    </main>
  );
}
