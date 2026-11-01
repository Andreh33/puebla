"use client";



import { useTranslatedValue, useTranslatedTemplate } from "@/components/public/LocaleProvider";
import { useTranslations } from "@/components/public/LocaleProvider";
import React, { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProductShare({ url, title }: { url: string; title: string }) {
  const tx = useTranslatedValue();
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;

  async function copyLink() {
    setCopied(false);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setManualCopy(false);
      setMessage("Enlace copiado. Ya puedes pegarlo donde quieras.");
    } catch {
      setManualCopy(true);
      setMessage("Selecciona y copia el enlace de abajo.");
    }
  }

  async function share() {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    setSharing(true);
    setMessage("");
    try {
      await navigator.share({ title, url });
    } catch (error) {
      // Cancelar el selector no debe copiar nada ni mostrar un error.
      if (!(error instanceof Error && error.name === "AbortError")) await copyLink();
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={t("Compartir producto")}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={share} disabled={sharing}>
          <Share2 aria-hidden="true" />
          {t("Compartir")}</Button>
        <Button asChild variant="outline">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("Compartir producto por WhatsApp")}
          >
            {t("WhatsApp")}</a>
        </Button>
        <Button type="button" variant="ghost" onClick={copyLink}>
          {tx(copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />)}
          {tx(copied ? "Enlace copiado" : "Copiar enlace")}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-zs-muted text-xs">
        {tx(message)}
      </p>
      {manualCopy && (
        <label className="text-zs-muted block space-y-1 text-xs">
          <span>{t("Enlace del producto")}</span>
          <input
            type="text"
            readOnly
            autoFocus
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="border-zs-border text-zs-ink focus-visible:ring-zs-blue-700 block w-full min-w-0 rounded-lg border bg-white p-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
      )}
    </div>
  );
}
