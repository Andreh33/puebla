"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboboxOption = { value: string; label: string; hint?: string };

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCreate?: boolean;
  onCreate?: (input: string) => Promise<ComboboxOption | null> | ComboboxOption | null;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecciona…",
  searchPlaceholder = "Buscar…",
  emptyText = "Sin resultados",
  allowCreate = false,
  onCreate,
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const canCreate =
    allowCreate &&
    !!onCreate &&
    query.trim().length > 1 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  async function handleCreate() {
    if (!onCreate) return;
    setCreating(true);
    try {
      const created = await onCreate(query.trim());
      if (created) {
        onChange(created.value);
        setOpen(false);
        setQuery("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("h-11 w-full justify-between font-normal", className)}
        >
          <span className={cn("truncate", !selected && "text-zs-muted")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <CommandPrimitive className="overflow-hidden rounded-xl">
          <div className="border-b border-zs-border px-3 py-2">
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-zs-muted"
            />
          </div>
          <CommandPrimitive.List className="max-h-64 overflow-auto p-1">
            {filtered.length === 0 && !canCreate && (
              <CommandPrimitive.Empty className="py-6 text-center text-xs text-zs-muted">
                {emptyText}
              </CommandPrimitive.Empty>
            )}
            {filtered.map((o) => (
              <CommandPrimitive.Item
                key={o.value}
                value={o.label}
                onSelect={() => {
                  onChange(o.value === value ? null : o.value);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm aria-selected:bg-zs-surface aria-selected:text-zs-blue-900"
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    value === o.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-xs text-zs-muted">{o.hint}</span>}
              </CommandPrimitive.Item>
            ))}
            {canCreate && (
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zs-blue-700 hover:bg-zs-blue-50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>Crear «{query.trim()}»</span>
              </button>
            )}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
