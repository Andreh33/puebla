"use client";

import * as React from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // En producción se envía a la observabilidad correspondiente (Vercel, Sentry…)
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin error boundary]", error);
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card className="border-zs-red-200">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zs-red-50 text-zs-red-700">
            <AlertOctagon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-zs-blue-900">
              Algo ha fallado en el panel
            </h2>
            <p className="mt-1 text-sm text-zs-muted">
              Hemos registrado el error. Vuelve a intentarlo o, si persiste, contacta
              con el administrador del sistema.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-zs-muted">
                ref: {error.digest}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset} variant="default">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin">Volver al inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
