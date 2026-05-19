"use client";

import { useEffect, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import type { Heading } from "@/lib/blog/reading-time";
import { cn } from "@/lib/utils";

type Props = {
  headings: Heading[];
  /** Si true, en mobile se renderiza colapsable. */
  mobileCollapsible?: boolean;
};

export function TableOfContents({ headings, mobileCollapsible = false }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const ordered = visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
          const first = ordered[0];
          if (first) setActive(first.target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 },
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const activeText = headings.find((h) => h.id === active)?.text;

  const list = (
    <ul className="space-y-1.5 border-l border-zs-border">
      {headings.map((h) => (
        <li key={h.id} className={cn(h.level === 3 && "pl-3")}>
          <a
            href={`#${h.id}`}
            onClick={() => setOpen(false)}
            className={cn(
              "block border-l-2 py-1.5 pl-3 transition-colors -ml-px",
              active === h.id
                ? "border-zs-red-600 font-semibold text-zs-blue-900"
                : "border-transparent text-zs-muted hover:text-zs-blue-700",
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  if (mobileCollapsible) {
    return (
      <>
        {/* Mobile collapsible */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-zs-border bg-white px-4 py-3 text-left text-sm transition hover:bg-zs-surface"
          >
            <span className="flex items-center gap-2">
              <List className="h-4 w-4 text-zs-blue-700" aria-hidden />
              <span className="font-semibold text-zs-blue-900">
                {open ? "Índice del artículo" : "En esta página"}
              </span>
              {!open && activeText && (
                <span className="ml-1 truncate text-xs text-zs-muted">
                  · {activeText}
                </span>
              )}
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "h-4 w-4 text-zs-muted transition-transform duration-300",
                open ? "rotate-180" : "rotate-0",
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              open ? "grid-rows-[1fr] opacity-100 pt-3" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <nav aria-label="Índice del artículo" className="text-sm">
                {list}
              </nav>
            </div>
          </div>
        </div>
        {/* Desktop: sin colapsable */}
        <nav aria-label="Índice del artículo" className="hidden text-sm lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zs-muted">
            En esta página
          </p>
          {list}
        </nav>
      </>
    );
  }

  return (
    <nav aria-label="Índice del artículo" className="text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zs-muted">
        En esta página
      </p>
      {list}
    </nav>
  );
}
