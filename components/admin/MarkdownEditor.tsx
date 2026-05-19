"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import "@uiw/react-md-editor/markdown-editor.css";

/**
 * Wrapper en torno a @uiw/react-md-editor con:
 *  - Preview side-by-side (con toggle).
 *  - Drag & drop de imágenes (sube a /api/upload y mete `![alt](url)` en la
 *    posición del cursor del textarea).
 *  - Atajos: paste de imágenes desde clipboard.
 *
 * Carga dinámica para evitar SSR (la lib no soporta server components).
 */
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-zs-border bg-zs-surface text-sm text-zs-muted">
      Cargando editor…
    </div>
  ),
});

type Props = {
  value: string;
  onChange: (next: string) => void;
  height?: number;
  defaultAlt?: string;
};

export function MarkdownEditor({ value, onChange, height = 560, defaultAlt = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const insertAtCursor = useCallback(
    (md: string) => {
      const textarea = containerRef.current?.querySelector<HTMLTextAreaElement>(
        "textarea.w-md-editor-text-input",
      );
      if (!textarea) {
        onChange(`${value}\n\n${md}\n`);
        return;
      }
      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? value.length;
      const next = value.slice(0, start) + md + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const caret = start + md.length;
        textarea.setSelectionRange(caret, caret);
      });
    },
    [onChange, value],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("alt", defaultAlt || file.name);
      try {
        const res = await fetch("/api/upload?type=blog", { method: "POST", body: form });
        if (!res.ok) return null;
        const json = (await res.json()) as { url?: string; results?: Array<{ ok: boolean; data?: { url?: string } }> };
        if (json.url) return json.url;
        const item = json.results?.[0];
        if (item?.ok && item.data?.url) return item.data.url;
        return null;
      } catch {
        return null;
      }
    },
    [defaultAlt],
  );

  // Drag & drop sobre el textarea + paste
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const textarea = container.querySelector<HTMLTextAreaElement>(
      "textarea.w-md-editor-text-input",
    );
    if (!textarea) return;

    const onDrop = async (e: DragEvent) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) return;
      e.preventDefault();
      for (const file of imgs) {
        const altPrompt = defaultAlt || file.name.replace(/\.[^.]+$/, "");
        insertAtCursor(`![${altPrompt}](Subiendo…)`);
        const url = await uploadFile(file);
        if (url) {
          // Reemplazamos el placeholder
          onChange(value.replace(`(Subiendo…)`, `(${url})`));
        } else {
          onChange(value.replace(`![${altPrompt}](Subiendo…)`, `<!-- Error subiendo ${file.name} -->`));
        }
      }
    };

    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const altPrompt = defaultAlt || "imagen-pegada";
          insertAtCursor(`![${altPrompt}](Subiendo…)`);
          const url = await uploadFile(file);
          if (url) {
            onChange(value.replace(`(Subiendo…)`, `(${url})`));
          }
        }
      }
    };

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) {
        e.preventDefault();
      }
    };

    textarea.addEventListener("drop", onDrop);
    textarea.addEventListener("dragover", onDragOver);
    textarea.addEventListener("paste", onPaste);
    return () => {
      textarea.removeEventListener("drop", onDrop);
      textarea.removeEventListener("dragover", onDragOver);
      textarea.removeEventListener("paste", onPaste);
    };
  }, [defaultAlt, insertAtCursor, onChange, uploadFile, value]);

  return (
    <div ref={containerRef} data-color-mode="light" className="markdown-editor-wrapper">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        preview="live"
        textareaProps={{
          placeholder:
            "Escribe el contenido del post en markdown.\n\nArrastra imágenes para insertarlas, o usa las plantillas del panel derecho.",
          spellCheck: true,
        }}
      />
    </div>
  );
}
