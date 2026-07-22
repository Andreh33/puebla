import * as React from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Equal,
  ReceiptText,
  Scale,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyOperatingSnapshot } from "@/lib/admin/dashboard-finance";
import {
  calculateMonthlyOperatingBalance,
  type MonthlyOperatingBalanceState,
} from "@/lib/admin/monthly-operating-balance";
import { cn, formatPriceEUR } from "@/lib/utils";

type StatusMeta = {
  label: string;
  description: string;
  Icon: LucideIcon;
  badge: "success" | "sale" | "outline" | "secondary";
};

const STATUS_META: Record<MonthlyOperatingBalanceState, StatusMeta> = {
  positive: {
    label: "En positivo",
    description: "Las ventas superan las facturas de proveedores del mes.",
    Icon: ArrowUpRight,
    badge: "success",
  },
  negative: {
    label: "En negativo",
    description: "Las facturas de proveedores superan las ventas del mes.",
    Icon: ArrowDownRight,
    badge: "sale",
  },
  balanced: {
    label: "En equilibrio",
    description: "Las ventas y las facturas del mes tienen el mismo importe.",
    Icon: Equal,
    badge: "outline",
  },
  empty: {
    label: "Sin movimiento",
    description: "Aún no hay ventas ni facturas de proveedores este mes.",
    Icon: Equal,
    badge: "secondary",
  },
};

const RESULT_TONE: Record<MonthlyOperatingBalanceState, string> = {
  positive: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
  negative: "border-zs-red-200 bg-red-50 text-zs-red-800",
  balanced: "border-zs-blue-200 bg-zs-blue-50 text-zs-blue-900",
  empty: "border-zs-border bg-zs-surface text-zs-blue-900",
};

function formatSignedPrice(value: number): string {
  if (value > 0) return `+${formatPriceEUR(value)}`;
  return formatPriceEUR(value);
}

function formatPeriod(period: string): string {
  const label = new Date(`${period}-01T00:00:00.000Z`).toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function ComparisonBar({
  label,
  value,
  max,
  barClassName,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  barClassName: string;
  detail: string;
}) {
  const width = Math.min(100, (Math.abs(value) / max) * 100);

  return (
    <div aria-label={`${label}: ${formatPriceEUR(value)}. ${detail}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-zs-ink font-medium">{label}</span>
        <span className="text-zs-ink shrink-0 font-semibold tabular-nums">
          {formatPriceEUR(value)}
        </span>
      </div>
      <div className="bg-zs-surface h-3 overflow-hidden rounded-full" aria-hidden="true">
        <div className={cn("h-full rounded-full", barClassName)} style={{ width: `${width}%` }} />
      </div>
      <p className="text-zs-muted mt-1 text-xs">{detail}</p>
    </div>
  );
}

export function MonthlyOperatingBalanceCard({ snapshot }: { snapshot: MonthlyOperatingSnapshot }) {
  const periodLabel = formatPeriod(snapshot.period);

  if (!snapshot.available) {
    return (
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="text-zs-blue-700 h-4 w-4" aria-hidden="true" />
            Balance ventas − facturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">No se pudo calcular el balance</p>
              <p className="mt-1 text-xs">
                Las ventas o las facturas no están disponibles ahora mismo. No mostramos un
                resultado parcial que pueda ser engañoso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = calculateMonthlyOperatingBalance(snapshot.sales, snapshot.supplierInvoices);
  const meta = STATUS_META[balance.state];
  const max = Math.max(Math.abs(balance.sales), Math.abs(balance.supplierInvoices), 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="text-zs-blue-700 h-4 w-4" aria-hidden="true" />
            Balance ventas − facturas
          </CardTitle>
          <p className="text-zs-muted mt-1 text-sm">{periodLabel}</p>
        </div>
        <Badge variant={meta.badge} className="w-fit gap-1">
          <meta.Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
          <div className={cn("rounded-xl border p-5", RESULT_TONE[balance.state])}>
            <p className="text-xs font-semibold tracking-wide uppercase">Diferencia del mes</p>
            <p className="mt-2 text-3xl font-bold tabular-nums sm:text-4xl">
              {formatSignedPrice(balance.difference)}
            </p>
            <p className="mt-2 text-sm font-medium">{meta.description}</p>
          </div>

          <div className="border-zs-border space-y-4 rounded-xl border p-4">
            <ComparisonBar
              label="Ventas registradas"
              value={balance.sales}
              max={max}
              barClassName="bg-emerald-600"
              detail="Pedidos pagados y en curso del mes"
            />
            <ComparisonBar
              label="Facturas de proveedores"
              value={balance.supplierInvoices}
              max={max}
              barClassName="bg-zs-blue-700"
              detail={`${snapshot.invoiceCount} ${snapshot.invoiceCount === 1 ? "factura emitida" : "facturas emitidas"} este mes`}
            />

            <dl className="border-zs-border grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div>
                <dt className="text-zs-muted text-xs">Pagado de estas facturas</dt>
                <dd className="mt-0.5 font-semibold text-emerald-700 tabular-nums">
                  {formatPriceEUR(snapshot.paidSupplierInvoices)}
                </dd>
              </div>
              <div>
                <dt className="text-zs-muted text-xs">Pendiente de estas facturas</dt>
                <dd className="mt-0.5 font-semibold text-amber-700 tabular-nums">
                  {formatPriceEUR(snapshot.outstandingSupplierInvoices)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="border-zs-border text-zs-muted flex flex-col gap-2 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl">
            Estimación operativa: ventas registradas menos facturas de proveedores por fecha de
            emisión. No es beneficio contable y no incluye nóminas, impuestos ni otros gastos.
          </p>
          <Link
            href="/admin/facturas"
            className="text-zs-blue-700 inline-flex shrink-0 items-center gap-1 font-semibold hover:underline"
          >
            <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
            Ver facturas →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
