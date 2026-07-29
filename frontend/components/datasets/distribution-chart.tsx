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
import type { DistributionBin } from "@/lib/datasets";

export function DistributionChart({ data }: { data: DistributionBin[] }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[180px] w-full" />;
  const c = chartColors(resolvedTheme);

  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 10 }}
            interval="preserveStartEnd"
            tickFormatter={(v) =>
              String(v).length > 8 ? `${String(v).slice(0, 8)}…` : String(v)
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
            tick={{ fill: c.axis, fontSize: 10 }}
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
                  <p style={{ opacity: 0.75 }}>{payload[0].value} rows</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="count" fill={c.series} radius={[3, 3, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
