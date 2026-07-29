"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartColors } from "@/lib/chart-theme";
import type { FeatureImportance } from "@/lib/experiments";
import { cn } from "@/lib/utils";

export function FeatureImportanceChart({ data }: { data: FeatureImportance[] }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const top = data.slice(0, 10);
  const height = Math.max(160, top.length * 34);
  if (!mounted) return <div style={{ height }} className="w-full" />;
  const c = chartColors(resolvedTheme);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke={c.grid} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="feature"
            width={110}
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 11 }}
            tickFormatter={(v) =>
              String(v).length > 16 ? `${String(v).slice(0, 16)}…` : String(v)
            }
          />
          <Tooltip
            cursor={{ fill: c.series, fillOpacity: 0.08 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div
                  className="rounded-md px-2.5 py-1.5 text-xs shadow-md"
                  style={{
                    background: c.tooltipBg,
                    border: `1px solid ${c.tooltipBorder}`,
                    color: c.tooltipText,
                  }}
                >
                  <p className="font-medium">{label}</p>
                  <p style={{ opacity: 0.75 }}>{Number(payload[0].value).toFixed(4)}</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="importance" fill={c.series} radius={[0, 3, 3, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ConfusionMatrix({
  matrix,
  labels,
}: {
  matrix: number[][];
  labels: string[];
}) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="p-1" />
            <th
              className="p-1 text-center text-xs font-medium text-muted-foreground"
              colSpan={labels.length}
            >
              Predicted
            </th>
          </tr>
          <tr>
            <th className="p-1" />
            {labels.map((l) => (
              <th
                key={l}
                className="px-2 py-1 text-xs font-medium text-muted-foreground"
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th className="whitespace-nowrap px-2 py-1 text-right text-xs font-medium text-muted-foreground">
                {i === 0 && (
                  <span className="mr-2 text-muted-foreground/70">Actual</span>
                )}
                {labels[i]}
              </th>
              {row.map((v, j) => (
                <td
                  key={j}
                  className={cn(
                    "h-10 w-12 rounded text-center align-middle tabular-nums",
                    i === j ? "font-semibold" : "",
                  )}
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${0.08 + (v / max) * 0.6})`,
                    color:
                      v / max > 0.5 ? "hsl(var(--primary-foreground))" : undefined,
                  }}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
