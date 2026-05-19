"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, ShoppingBag, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ResultProduct = {
  id: string;
  slug: string;
  name: string;
  brandName?: string;
  colorName?: string;
  mainImageUrl?: string | null;
  price?: number | null;
};
type ResultPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
};
type Results = { products: ResultProduct[]; posts: ResultPost[] };

type Props = {
  trigger: React.ReactNode;
};

export function SearchCommand({ trigger }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results>({ products: [], posts: [] });
  const debounceRef = useRef<number | null>(null);

  // ⌘K / Ctrl+K open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "/" && !open && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Fetch debounced
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults({ products: [], posts: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          headers: { accept: "application/json" },
        });
        if (res.ok) {
          const json = (await res.json()) as Results;
          setResults({
            products: Array.isArray(json.products) ? json.products : [],
            posts: Array.isArray(json.posts) ? json.posts : [],
          });
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = (url: string) => {
    setOpen(false);
    setQuery("");
    router.push(url);
  };

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Buscar en Zona Sport</DialogTitle>
          <Command shouldFilter={false} className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-zs-border px-4 py-3">
              <Search className="h-5 w-5 shrink-0 text-zs-muted" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar productos, marcas o artículos del blog…"
                className="flex-1 bg-transparent text-sm text-zs-ink placeholder:text-zs-muted focus:outline-none"
                autoFocus
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-zs-muted" />}
              <kbd className="hidden rounded border border-zs-border bg-zs-surface px-1.5 py-0.5 text-[10px] font-semibold text-zs-muted sm:inline-block">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
              {!query && (
                <div className="px-3 py-8 text-center text-sm text-zs-muted">
                  Empieza a escribir para buscar productos y artículos.
                  <p className="mt-2 text-xs">
                    Atajo: <kbd className="rounded border px-1">⌘</kbd> / <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">K</kbd>
                  </p>
                </div>
              )}

              {query && !loading && results.products.length === 0 && results.posts.length === 0 && (
                <Command.Empty className="flex flex-col items-center gap-2 px-3 py-10 text-center text-sm text-zs-muted">
                  <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden>
                    <circle cx="32" cy="32" r="30" fill="#eff3fe" />
                    <circle cx="28" cy="28" r="11" stroke="#14225b" strokeWidth="3" fill="white" />
                    <line x1="36" y1="36" x2="46" y2="46" stroke="#14225b" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="28" cy="28" r="6" fill="#c8da46" />
                  </svg>
                  <p className="font-medium text-zs-blue-900">
                    Sin resultados para «{query}»
                  </p>
                  <p className="text-xs">
                    Prueba con otra palabra o consúltanos por WhatsApp.
                  </p>
                </Command.Empty>
              )}

              {results.products.length > 0 && (
                <Command.Group heading="Productos" className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-zs-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {results.products.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`p-${p.id}`}
                      onSelect={() => go(`/producto/${p.slug}`)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-zs-ink",
                        "data-[selected=true]:bg-zs-surface",
                      )}
                    >
                      <ShoppingBag className="h-4 w-4 shrink-0 text-zs-blue-700" />
                      <span className="flex-1 truncate">
                        <span className="font-medium">{p.name}</span>
                        {p.brandName && (
                          <span className="ml-2 text-xs text-zs-muted">· {p.brandName}</span>
                        )}
                      </span>
                      {p.price != null && (
                        <span className="text-xs font-semibold tabular-nums text-zs-blue-900">
                          {new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: "EUR",
                            maximumFractionDigits: 0,
                          }).format(p.price)}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {results.posts.length > 0 && (
                <Command.Group heading="Artículos" className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-zs-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {results.posts.map((p) => (
                    <Command.Item
                      key={p.id}
                      value={`b-${p.id}`}
                      onSelect={() => go(`/blog/${p.slug}`)}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-zs-ink data-[selected=true]:bg-zs-surface"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-zs-blue-700" />
                      <span className="flex-1 truncate">{p.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {query && (
                <div className="border-t border-zs-border px-2 py-2">
                  <Command.Item
                    value="see-all"
                    onSelect={() => go(`/buscar?q=${encodeURIComponent(query)}`)}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-zs-blue-700 data-[selected=true]:bg-zs-surface"
                  >
                    Ver todos los resultados para “{query}”
                    <span aria-hidden>→</span>
                  </Command.Item>
                </div>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
