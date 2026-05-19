"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-zs-red-600">
        Algo ha fallado
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-zs-blue-900 sm:text-4xl">
        Estamos investigándolo
      </h1>
      <p className="mt-4 max-w-xl text-balance text-base text-zs-muted">
        Ha ocurrido un error inesperado. Si persiste, escríbenos por WhatsApp y lo
        resolveremos en seguida.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-zs-muted">
          Código de error: <code className="rounded bg-zs-surface px-2 py-1">{error.digest}</code>
        </p>
      )}
      <div className="mt-8">
        <button
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-zs-blue-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zs-blue-800"
        >
          Intentar de nuevo
        </button>
      </div>
    </main>
  );
}
