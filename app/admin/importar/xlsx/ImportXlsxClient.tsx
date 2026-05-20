"use client";

/**
 * Client component para el flujo de importación PRICAT.
 *
 * Estados: idle → previewing → preview-ready → uploading → polling → done/failed
 *
 *  - Drag & drop con react-hook-form para el archivo (validación tamaño/extensión).
 *  - POST /api/import/xlsx/preview para enseñar 10 filas antes de confirmar.
 *  - POST /api/import/xlsx para crear el job (devuelve jobId).
 *  - Polling cada 2s a /api/import/jobs/[id] hasta DONE/FAILED.
 *  - Descarga CSV de errores al terminar si los hay.
 */

import * as React from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Rocket,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type Mode = "create_update" | "create_only" | "update_only";
type DefaultStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

interface FormValues {
  mode: Mode;
  defaultStatus: DefaultStatus;
  defaultCategorySlug: string;
}

interface PreviewRow {
  rowNumber: number;
  externalId: string;
  modelArticleCode: string;
  modelCode: string;
  name: string;
  brand: string;
  category: string;
  colorName: string;
  size: string;
  gender: string;
  retailPrice: string | null;
  costPrice: string | null;
  ean: string | null;
  status: string;
}

interface JobError {
  row: number;
  code: string;
  message: string;
}

interface JobState {
  id: string;
  status: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  fileName: string | null;
  totalRows: number;
  processedRows: number;
  createdRows: number;
  updatedRows: number;
  errorRows: number;
  startedAt: string | null;
  finishedAt: string | null;
  errors?: JobError[] | null;
}

const MAX_SIZE = 20 * 1024 * 1024;

// Extensiones aceptadas por el importador universal (deben coincidir con
// lib/importer/read-table.ts → SUPPORTED_TABLE_EXTENSIONS).
const ACCEPTED_EXTENSIONS = [
  ".xlsx",
  ".xlsm",
  ".xlsb",
  ".xls",
  ".ods",
  ".fods",
  ".csv",
  ".tsv",
  ".txt",
  ".dif",
];

// `accept` del <input>: extensiones + MIME types comunes.
const ACCEPT_ATTR = [
  ...ACCEPTED_EXTENSIONS,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
].join(",");

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function ImportXlsxClient() {
  const [file, setFile] = React.useState<File | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<
    "idle" | "previewing" | "preview-ready" | "uploading" | "polling" | "done" | "failed"
  >("idle");
  const [preview, setPreview] = React.useState<PreviewRow[]>([]);
  const [detected, setDetected] = React.useState<{ feedKind: string; format: string } | null>(
    null,
  );
  const [job, setJob] = React.useState<JobState | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      mode: "create_update",
      defaultStatus: "DRAFT",
      defaultCategorySlug: "",
    },
  });

  // Polling effect
  React.useEffect(() => {
    if (phase !== "polling" || !job?.id) return;
    const jobId = job.id;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/import/jobs/${jobId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as JobState;
        if (cancelled) return;
        setJob(next);
        if (next.status === "DONE") setPhase("done");
        else if (next.status === "FAILED") setPhase("failed");
      } catch (err) {
        if (!cancelled) {
          setServerError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    const interval = setInterval(tick, 2000);
    void tick();
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [phase, job?.id]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const validateFile = (f: File): string | null => {
    const lower = f.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return "Formato no soportado. Acepta: Excel (.xlsx, .xls, .xlsb), ODS, CSV, TSV o TXT";
    }
    if (f.size === 0) return "El fichero está vacío";
    if (f.size > MAX_SIZE) return `Máximo 20MB (este pesa ${(f.size / 1024 / 1024).toFixed(1)}MB)`;
    return null;
  };

  const handleFileSelected = async (f: File) => {
    const err = validateFile(f);
    setFileError(err);
    setServerError(null);
    if (err) {
      setFile(null);
      setPreview([]);
      setPhase("idle");
      return;
    }
    setFile(f);
    setPhase("previewing");
    setPreview([]);

    const fd = new FormData();
    fd.append("file", f);
    try {
      const res = await fetch("/api/import/xlsx/preview", { method: "POST", body: fd });
      const data = (await res.json()) as {
        rows?: PreviewRow[];
        feedKind?: string;
        format?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setPreview(data.rows ?? []);
      setDetected(
        data.feedKind ? { feedKind: data.feedKind, format: data.format ?? "?" } : null,
      );
      setPhase("preview-ready");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  };

  const onDrop = (ev: React.DragEvent<HTMLLabelElement>) => {
    ev.preventDefault();
    setDragOver(false);
    const f = ev.dataTransfer.files?.[0];
    if (f) void handleFileSelected(f);
  };

  const onInputChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (f) void handleFileSelected(f);
  };

  const launchImport: SubmitHandler<FormValues> = async (values) => {
    if (!file) return;
    setPhase("uploading");
    setServerError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append(
      "options",
      JSON.stringify({
        mode: values.mode,
        defaultStatus: values.defaultStatus,
        defaultCategorySlug: values.defaultCategorySlug.trim() || undefined,
      }),
    );

    try {
      const res = await fetch("/api/import/xlsx", { method: "POST", body: fd });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error ?? `HTTP ${res.status}`);
      setJob({
        id: data.jobId,
        status: "PENDING",
        fileName: file.name,
        totalRows: 0,
        processedRows: 0,
        createdRows: 0,
        updatedRows: 0,
        errorRows: 0,
        startedAt: null,
        finishedAt: null,
      });
      setPhase("polling");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : String(e));
      setPhase("preview-ready");
    }
  };

  const reset = () => {
    setFile(null);
    setFileError(null);
    setServerError(null);
    setPreview([]);
    setDetected(null);
    setJob(null);
    setPhase("idle");
  };

  const progressPct =
    job && job.totalRows > 0
      ? Math.min(100, Math.round((job.processedRows / job.totalRows) * 100))
      : 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir catálogo</CardTitle>
        <CardDescription>
          Arrastra tu archivo (Excel, CSV, ODS…) o haz clic para seleccionarlo. Detectamos
          automáticamente si es un PRICAT, un export de WooCommerce o una tabla genérica.
          Máximo 20MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(launchImport)} className="space-y-6">
          {/* Drop zone */}
          {(phase === "idle" || phase === "previewing" || phase === "preview-ready") && (
            <label
              htmlFor="xlsx-file"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-zs-surface/40 p-10 text-center transition-colors",
                dragOver
                  ? "border-zs-blue-700 bg-zs-blue-50"
                  : "border-zs-border hover:border-zs-blue-700",
                fileError && "border-zs-red-400",
              )}
            >
              <input
                id="xlsx-file"
                type="file"
                accept={ACCEPT_ATTR}
                onChange={onInputChange}
                className="sr-only"
              />
              {file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-zs-blue-700" />
                  <div>
                    <p className="font-semibold text-zs-ink">{file.name}</p>
                    <p className="text-xs text-zs-muted">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-zs-muted" />
                  <div>
                    <p className="font-semibold text-zs-ink">
                      Arrastra tu archivo (Excel, CSV, ODS…) aquí
                    </p>
                    <p className="text-xs text-zs-muted">
                      .xlsx · .xls · .xlsb · .ods · .csv · .tsv · .txt — o haz clic para seleccionar
                    </p>
                  </div>
                </>
              )}
              {phase === "previewing" && (
                <div className="mt-2 inline-flex items-center gap-2 text-sm text-zs-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando vista previa…
                </div>
              )}
            </label>
          )}

          {fileError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Archivo no válido</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}

          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error del servidor</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Preview + options */}
          {phase === "preview-ready" && preview.length > 0 && (
            <>
              <div className="rounded-xl border border-zs-border bg-white">
                <div className="flex items-center justify-between border-b border-zs-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-zs-muted" />
                    <h4 className="text-sm font-semibold text-zs-ink">
                      Vista previa (primeras 10 filas)
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {detected && (
                      <Badge variant="outline" className="uppercase">
                        {detected.format} · {feedKindLabel(detected.feedKind)}
                      </Badge>
                    )}
                    <Badge variant="outline">{preview.length} filas</Badge>
                  </div>
                </div>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zs-surface text-zs-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Fila</th>
                        <th className="px-3 py-2 text-left font-medium">Código art.</th>
                        <th className="px-3 py-2 text-left font-medium">Nombre</th>
                        <th className="px-3 py-2 text-left font-medium">Marca</th>
                        <th className="px-3 py-2 text-left font-medium">Categoría</th>
                        <th className="px-3 py-2 text-left font-medium">Color</th>
                        <th className="px-3 py-2 text-left font-medium">Talla</th>
                        <th className="px-3 py-2 text-left font-medium">Género</th>
                        <th className="px-3 py-2 text-right font-medium">PVP</th>
                        <th className="px-3 py-2 text-left font-medium">EAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zs-border">
                      {preview.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-zs-surface/60">
                          <td className="px-3 py-2 text-zs-muted">{r.rowNumber}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">{r.modelArticleCode}</td>
                          <td className="px-3 py-2 text-zs-ink">{r.name}</td>
                          <td className="px-3 py-2">{r.brand}</td>
                          <td className="px-3 py-2">{r.category}</td>
                          <td className="px-3 py-2">{r.colorName}</td>
                          <td className="px-3 py-2">{r.size || "—"}</td>
                          <td className="px-3 py-2 text-xs">{r.gender}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.retailPrice ?? "—"}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px]">{r.ean ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Opciones */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="mode">Modo de importación</Label>
                  <Controller
                    name="mode"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="mode">
                          <SelectValue placeholder="Selecciona modo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create_update">Crear + actualizar</SelectItem>
                          <SelectItem value="create_only">Sólo crear nuevos</SelectItem>
                          <SelectItem value="update_only">Sólo actualizar existentes</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultStatus">Estado por defecto</Label>
                  <Controller
                    name="defaultStatus"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="defaultStatus">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Borrador (recomendado)</SelectItem>
                          <SelectItem value="ACTIVE">Activo</SelectItem>
                          <SelectItem value="INACTIVE">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultCategory">Categoría por defecto (slug, opcional)</Label>
                  <Input
                    id="defaultCategory"
                    placeholder="ej. textil"
                    {...register("defaultCategorySlug")}
                  />
                  <p className="text-xs text-zs-muted">
                    Si el tipo del PRICAT está vacío, se usará esta categoría.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={!file}>
                  <Rocket className="h-4 w-4" /> Lanzar importación
                </Button>
                <Button type="button" variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4" /> Empezar de nuevo
                </Button>
              </div>
            </>
          )}

          {/* Uploading state */}
          {phase === "uploading" && (
            <div className="flex items-center gap-3 rounded-xl border border-zs-blue-200 bg-zs-blue-50 p-4 text-sm text-zs-blue-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              Subiendo archivo y creando el job…
            </div>
          )}

          {/* Polling / progress */}
          {(phase === "polling" || phase === "done" || phase === "failed") && job && (
            <div className="space-y-4 rounded-xl border border-zs-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {phase === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  {phase === "failed" && <XCircle className="h-5 w-5 text-zs-red-600" />}
                  {phase === "polling" && (
                    <Loader2 className="h-5 w-5 animate-spin text-zs-blue-700" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-zs-ink">
                      {phase === "done" && "Importación completada"}
                      {phase === "failed" && "La importación ha fallado"}
                      {phase === "polling" && "Procesando catálogo en segundo plano…"}
                    </p>
                    <p className="text-xs text-zs-muted">
                      Job <code>{job.id}</code> · {job.fileName ?? "—"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-zs-blue-900">
                  {job.processedRows} / {job.totalRows || "?"} filas
                </span>
              </div>

              <Progress value={progressPct} />

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Stat label="Creados" value={job.createdRows} tone="emerald" />
                <Stat label="Actualizados" value={job.updatedRows} tone="blue" />
                <Stat label="Errores" value={job.errorRows} tone="red" />
                <Stat label="Progreso" value={`${progressPct}%`} tone="muted" />
              </div>

              {/* Log y errores en tiempo real. Útil para diagnosticar jobs
                  que se quedan atascados: cada hito importante (job arrancado,
                  fichero abierto, filas contadas...) se persiste como INFO
                  en errors[] y aparece aquí en cuanto llega el siguiente poll. */}
              {Array.isArray(job.errors) && job.errors.length > 0 && (
                <details
                  open={phase === "failed" || phase === "polling"}
                  className="rounded-lg border border-zs-border bg-zs-surface/50 p-3 text-xs"
                >
                  <summary className="cursor-pointer select-none font-semibold text-zs-ink">
                    Log y errores ({job.errors.length})
                  </summary>
                  <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto font-mono text-[11px]">
                    {job.errors.slice(-50).map((e, i) => {
                      const isInfo = e.code === "INFO";
                      return (
                        <li
                          key={i}
                          className={
                            isInfo
                              ? "text-zs-muted"
                              : e.code === "STACK"
                                ? "text-amber-700"
                                : "text-zs-red-600"
                          }
                        >
                          <span className="inline-block w-12 shrink-0 text-zs-muted/70">
                            {e.row > 0 ? `f${e.row}` : ""}
                          </span>
                          <span className="ml-1 inline-block w-16 shrink-0 font-semibold uppercase">
                            {e.code}
                          </span>
                          <span className="ml-2 break-words">{e.message}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              )}

              {(phase === "done" || phase === "failed") && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {job.errorRows > 0 && (
                    <Button asChild variant="outline" size="sm">
                      <a href={`/api/import/jobs/${job.id}/errors.csv`}>
                        Descargar errores (CSV)
                      </a>
                    </Button>
                  )}
                  <Button type="button" size="sm" onClick={reset}>
                    <RotateCcw className="h-4 w-4" /> Importar otro archivo
                  </Button>
                </div>
              )}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function feedKindLabel(kind: string): string {
  switch (kind) {
    case "woocommerce":
      return "WooCommerce";
    case "pricat":
      return "PRICAT";
    case "generic":
      return "Genérico";
    default:
      return kind;
  }
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "blue" | "red" | "muted";
}) {
  const toneCls = {
    emerald: "text-emerald-700",
    blue: "text-zs-blue-700",
    red: "text-zs-red-600",
    muted: "text-zs-muted",
  }[tone];
  return (
    <div className="rounded-lg border border-zs-border bg-zs-surface/50 p-3">
      <p className="text-xs uppercase tracking-wide text-zs-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", toneCls)}>{value}</p>
    </div>
  );
}
