"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButtons({ url, title }: { url: string; title: string }) {
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
      <span className="text-sm font-semibold text-zs-ink">Compartir:</span>
      <Button asChild size="sm" variant="whatsapp">
        <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp">
          WhatsApp
        </a>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartir en X (Twitter)">
          X / Twitter
        </a>
      </Button>
      <Button size="sm" variant="outline" onClick={copy} aria-label="Copiar enlace">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado" : "Copiar enlace"}
      </Button>
      <Button size="sm" variant="ghost" onClick={nativeShare} className="sm:hidden" aria-label="Compartir">
        <Share2 className="h-4 w-4" />
        Compartir
      </Button>
    </div>
  );
}
