"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPriceEUR } from "@/lib/utils";

type Datum = { date: string; ingresos: number; pedidos: number };

function formatDay(iso: string): string {
  // ISO yyyy-mm-dd → "dd/mm"
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function SalesChart({ data }: { data: Datum[] }) {
  const empty = data.every((d) => d.ingresos === 0);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zs-muted">
        Sin datos
      </div>
    );
  }

  return (
    <div className="relative h-48 w-full">
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zs-muted">
          Aún no hay ventas en este periodo
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#047857" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#047857" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            stroke="#e5e7eb"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#6b7280" }}
            stroke="#e5e7eb"
            width={48}
            tickFormatter={(v: number) => `${v} €`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
            labelFormatter={(label) => `Fecha: ${formatDay(String(label))}`}
            formatter={(value: number, name) =>
              name === "ingresos"
                ? [formatPriceEUR(value), "Ingresos"]
                : [value, "Pedidos"]
            }
          />
          <Area
            type="monotone"
            dataKey="ingresos"
            stroke="#047857"
            strokeWidth={2}
            fill="url(#salesGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
