"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

/**
 * Chips grandes de género para listados — visible arriba del grid de productos
 * en /[categoria]. Reescribe el query param `genero` manteniendo el resto de
 * filtros. Selección múltiple: pulsar un chip activo lo desactiva.
 */
const GENDER_CHIPS: Array<{ value: string; label: string }> = [
  { value: "HOMBRE", label: "Hombre" },
  { value: "MUJER", label: "Mujer" },
  { value: "UNISEX", label: "Unisex" },
  { value: "NINO", label: "Niños" },
];

export function GenderChips({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const active = (searchParams.get("genero") ?? "").split(",").filter(Boolean);

  const toggle = (value: string) => {
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    const cur = (sp.get("genero") || "").split(",").filter(Boolean);
    // Para chips grandes preferimos un comportamiento "exclusivo" — al pulsar
    // un chip se aísla a esa selección, y al pulsarlo otra vez se limpia.
    let next: string[];
    if (cur.length === 1 && cur[0] === value) {
      next = [];
    } else {
      next = [value];
    }
    if (next.length === 0) sp.delete("genero");
    else sp.set("genero", next.join(","));
    sp.delete("page");
    startTransition(() => {
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Filtrar por género"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-zs-border bg-white p-2",
        className,
      )}
    >
      <span className="px-2 text-xs font-semibold uppercase tracking-wider text-zs-muted">
        Para
      </span>
      {GENDER_CHIPS.map((chip) => {
        const on = active.includes(chip.value);
        return (
          <button
            key={chip.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => toggle(chip.value)}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors",
              on
                ? "bg-zs-blue-900 text-white shadow-sm"
                : "bg-zs-surface text-zs-ink hover:bg-zs-blue-50 hover:text-zs-blue-900",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
