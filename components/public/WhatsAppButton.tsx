"use client";

import { MessageCircle } from "lucide-react";
import { whatsappUrl, WhatsAppMessages } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type Props = {
  message?: string;
  variant?: "floating" | "inline";
  label?: string;
  className?: string;
};

export function WhatsAppButton({
  message = WhatsAppMessages.generic(),
  variant = "inline",
  label = "WhatsApp",
  className,
}: Props) {
  const href = whatsappUrl(message);

  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir conversación de WhatsApp"
        className={cn(
          "fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6",
          // Offset extra en mobile para no chocar con BottomNav (h-16 ~= 4rem)
          "bottom-[calc(4rem+env(safe-area-inset-bottom)+12px)] md:bottom-6",
          className,
        )}
      >
        <MessageCircle className="h-7 w-7" strokeWidth={2.25} />
        <span className="sr-only">WhatsApp</span>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1ebe57]",
        className,
      )}
    >
      <MessageCircle className="h-5 w-5" />
      {label}
    </a>
  );
}
