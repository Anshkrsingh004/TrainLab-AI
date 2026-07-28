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

// Sample data — replace with real counts once model training lands.
const DATA = [
  { type: "LogReg", count: 8 },
  { type: "Rand.Forest", count: 12 },
  { type: "XGBoost", count: 15 },
  { type: "SVM", count: 6 },
  { type: "BERT", count: 9 },
  { type: "DistilBERT", count: 5 },
];

export function ModelsBarChart() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[260px] w-full" />;

  const c = chartColors(resolvedTheme);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DATA} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="type"
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tick={{ fill: c.axis, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: c.series, fillOpacity: 0.08 }}
            content={<CountTooltip bg={c.tooltipBg} border={c.tooltipBorder} colorText={c.tooltipText} />}
          />
          <Bar
            dataKey="count"
            fill={c.series}
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
            name="Models"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CountTooltip({
  active,
  payload,
  label,
  bg,
  border,
  colorText,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  bg: string;
  border: string;
  colorText: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md px-3 py-2 text-xs shadow-md"
      style={{ background: bg, border: `1px solid ${border}`, color: colorText }}
    >
      <p className="mb-0.5 font-medium">{label}</p>
      <p style={{ color: colorText, opacity: 0.75 }}>{payload[0].value} models trained</p>
    </div>
  );
}
