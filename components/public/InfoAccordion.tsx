import { ChevronDown } from "lucide-react";

type Item = { title: string; content: React.ReactNode };

export function InfoAccordion({ items }: { items: Item[] }) {
  return (
    <div className="divide-y divide-zs-border rounded-2xl border border-zs-border bg-white">
      {items.map((it, i) => (
        <details key={i} className="group [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-zs-ink hover:bg-zs-surface">
            <span>{it.title}</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="prose prose-sm max-w-none px-5 pb-5 text-sm text-zs-ink/90">
            {it.content}
          </div>
        </details>
      ))}
    </div>
  );
}
