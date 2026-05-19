import Link from "next/link";
import { FileText, Upload, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeES } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  kind: "import" | "lead" | "post";
  title: string;
  subtitle?: string;
  href?: string;
  status?: string;
  createdAt: Date;
};

const ICONS = {
  import: Upload,
  lead: Users,
  post: FileText,
} as const;

const KIND_LABEL: Record<ActivityItem["kind"], string> = {
  import: "Importación",
  lead: "Lead",
  post: "Post",
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-zs-muted">
            Aún no hay actividad. Importa el PRICAT o publica el primer post para
            empezar.
          </p>
        ) : (
          <ul className="divide-y divide-zs-border" aria-label="Actividad reciente">
            {items.map((item) => {
              const Icon = ICONS[item.kind];
              const content = (
                <div className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zs-surface text-zs-blue-700">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {KIND_LABEL[item.kind]}
                      </Badge>
                      {item.status && (
                        <Badge variant="secondary" className="text-[10px]">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-zs-ink">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-zs-muted">{item.subtitle}</p>
                    )}
                    <time
                      className="mt-1 block text-[11px] text-zs-muted"
                      dateTime={item.createdAt.toISOString()}
                    >
                      {formatDateTimeES(item.createdAt)}
                    </time>
                  </div>
                </div>
              );

              return (
                <li key={`${item.kind}-${item.id}`}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="block rounded-lg px-1 -mx-1 hover:bg-zs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
