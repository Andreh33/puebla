import Link from "next/link";
import { type LucideIcon, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
  loading?: boolean;
};

const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "text-zs-blue-900",
  warning: "text-amber-700",
  danger: "text-zs-red-700",
  success: "text-emerald-700",
};

export function KpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
  loading = false,
}: KpiCardProps) {
  const body = (
    <Card
      className={cn(
        "h-full transition focus-within:ring-2 focus-within:ring-zs-blue-700",
        href && "hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zs-muted">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-zs-muted" aria-hidden="true" />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded bg-zs-surface" aria-hidden="true" />
        ) : (
          <p className={cn("text-3xl font-bold tabular-nums", toneClasses[tone])}>
            {value}
          </p>
        )}
        {hint && <p className="mt-1 text-xs text-zs-muted">{hint}</p>}
        {href && (
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zs-blue-700 group-hover:text-zs-red-600">
            Ver detalle
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="group block focus:outline-none"
      aria-label={`${label}: ${value}`}
    >
      {body}
    </Link>
  );
}
