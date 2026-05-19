"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FlaskConical, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function MiraviaImportClient({ enabled }: { enabled: boolean }) {
  const [running, setRunning] = React.useState<"dry" | "real" | null>(null);

  async function trigger(mode: "dry" | "real") {
    setRunning(mode);
    try {
      const res = await fetch("/api/import/miravia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: mode === "dry" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error || "Error en sincronizaciÃ³n");
        return;
      }
      toast.success(
        `Sync ${mode === "dry" ? "(dry-run)" : ""} OK â€” ${json.result.total} total, ${json.result.created} nuevos, ${json.result.updated} actualizados, ${json.result.errors} errores`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setRunning(null);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <p className="text-sm text-zs-muted">
        El sync recorre el feed configurado en <code>MIRAVIA_FEED_URL</code> y
        aplica upsert por <code>externalId</code>. Es idempotente: puedes
        ejecutarlo varias veces sin duplicar productos.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => trigger("dry")}
          disabled={!enabled || running !== null}
        >
          {running === "dry" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FlaskConical className="mr-2 h-4 w-4" />
          )}
          Dry run (no escribe)
        </Button>
        <Button
          type="button"
          onClick={() => trigger("real")}
          disabled={!enabled || running !== null}
        >
          {running === "real" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sincronizar ahora
        </Button>
      </div>
    </Card>
  );
}
