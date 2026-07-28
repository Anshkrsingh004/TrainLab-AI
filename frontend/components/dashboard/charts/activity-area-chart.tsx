"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { chartColors } from "@/lib/chart-theme";

// Sample data — replace with real training activity once training lands.
const DATA = [
  { day: "Jul 16", runs: 3 },
  { day: "Jul 17", runs: 5 },
  { day: "Jul 18", runs: 4 },
  { day: "Jul 19", runs: 8 },
  { day: "Jul 20", runs: 6 },
  { day: "Jul 21", runs: 9 },
  { day: "Jul 22", runs: 7 },
  { day: "Jul 23", runs: 11 },
  { day: "Jul 24", runs: 10 },
  { day: "Jul 25", runs: 14 },
  { day: "Jul 26", runs: 9 },
  { day: "Jul 27", runs: 13 },
  { day: "Jul 28", runs: 16 },
  { day: "Jul 29", runs: 12 },
];

export function ActivityAreaChart() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[260px] w-full" />;

  const c = chartColors(resolvedTheme);

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DATA} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.series} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="0" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
            tick={{ fill: c.axis, fontSize: 11 }}
          />
          <Tooltip
            cursor={{ stroke: c.axis, strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<RunsTooltip colorText={c.tooltipText} bg={c.tooltipBg} border={c.tooltipBorder} />}
          />
          <Area
            type="monotone"
            dataKey="runs"
            stroke={c.series}
            strokeWidth={2}
            fill="url(#activityFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            name="Training runs"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function RunsTooltip({
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
      <p className="text-muted-foreground" style={{ color: colorText, opacity: 0.75 }}>
        {payload[0].value} training runs
      </p>
    </div>
  );
}
