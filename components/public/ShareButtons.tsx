"use client";



import { useTranslatedValue, useTranslatedTemplate } from "@/components/public/LocaleProvider";
import { useTranslations } from "@/components/public/LocaleProvider";
import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const tx = useTranslatedValue();
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const enc = encodeURIComponent;
  const waUrl = `https://wa.me/?text=${enc(`${title} — ${url}`)}`;
  const xUrl = `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url, title });
      } catch {
        // cancelled
      }
    } else {
      copy();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-zs-ink">{t("Compartir:")}</span>
      <Button asChild size="sm" variant="whatsapp">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label={t("Compartir por WhatsApp")}>
          {t("WhatsApp")}</a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label={t("Compartir en X (Twitter)")}>
          {t("X / Twitter")}</a>
      </Button>
      <Button size="sm" variant="outline" onClick={copy} aria-label={t("Copiar enlace")}>
        {tx(copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />)}
        {tx(copied ? "Copiado" : "Copiar enlace")}
      </Button>
      <Button size="sm" variant="ghost" onClick={nativeShare} className="sm:hidden" aria-label={t("Compartir")}>
        <Share2 className="h-4 w-4" />
        {t("Compartir")}</Button>
    </div>
  );
}
