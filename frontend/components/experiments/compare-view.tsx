"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ALGORITHM_LABELS,
  getExperiment,
  type ExperimentDetail,
} from "@/lib/experiments";
import { chartColors } from "@/lib/chart-theme";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MetricAccessor = (r: ExperimentDetail) => number | undefined;

const METRIC_ROWS: { label: string; get: (r: ExperimentDetail) => string }[] = [
  { label: "Algorithm", get: (r) => ALGORITHM_LABELS[r.algorithm] ?? r.algorithm },
  { label: "Task", get: (r) => r.task_type },
  { label: "Accuracy", get: (r) => fmt(r.metrics?.accuracy) },
  { label: "Precision", get: (r) => fmt(r.metrics?.precision) },
  { label: "Recall", get: (r) => fmt(r.metrics?.recall) },
  { label: "F1", get: (r) => fmt(r.metrics?.f1) },
  { label: "R²", get: (r) => fmt(r.metrics?.r2) },
  { label: "MAE", get: (r) => fmt(r.metrics?.mae, false) },
  { label: "RMSE", get: (r) => fmt(r.metrics?.rmse, false) },
  { label: "Train rows", get: (r) => count(r.metrics?.n_train) },
  { label: "Test rows", get: (r) => count(r.metrics?.n_test) },
  { label: "Duration", get: (r) => duration(r.duration_ms) },
];

const CHARTS: { label: string; get: MetricAccessor }[] = [
  { label: "Accuracy", get: (r) => r.metrics?.accuracy },
  { label: "F1", get: (r) => r.metrics?.f1 },
  { label: "R²", get: (r) => r.metrics?.r2 },
];

export function CompareView({ ids }: { ids: string[] }) {
  const [runs, setRuns] = React.useState<ExperimentDetail[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all(
      ids.map((id) => getExperiment(id).catch(() => null)),
    ).then((results) => {
      setRuns(results.filter((r): r is ExperimentDetail => r !== null));
      setLoading(false);
    });
  }, [ids]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  if (runs.length < 2) {
    return (
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-xl font-semibold">Not enough runs to compare</h1>
        <Link href="/experiments" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to experiments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/experiments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Experiments
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {runs.length} runs side by side.
        </p>
      </div>

      {/* Metrics table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Metric</TableHead>
              {runs.map((r) => (
                <TableHead key={r.id} className="text-right">
                  <Link href={`/training/${r.id}`} className="hover:text-primary hover:underline">
                    {r.name}
                  </Link>
                  {r.family === "transformer" && (
                    <Badge variant="muted" className="ml-1">
                      T
                    </Badge>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {METRIC_ROWS.filter((row) => runs.some((r) => row.get(r) !== "—")).map(
              (row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  {runs.map((r) => (
                    <TableCell key={r.id} className="text-right tabular-nums capitalize">
                      {row.get(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>

      {/* Comparison charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {CHARTS.map((chart) => {
          const data = runs
            .map((r) => ({ name: shortName(r.name), value: chart.get(r) }))
            .filter((d): d is { name: string; value: number } => d.value != null);
          if (data.length < 2) return null;
          return (
            <Card key={chart.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{chart.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CompareBarChart data={data} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CompareBarChart({ data }: { data: { name: string; value: number }[] }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[200px] w-full" />;
  const c = chartColors(resolvedTheme);

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={c.grid} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fill: c.axis, fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fill: c.axis, fontSize: 10 }}
          />
          <Tooltip
            cursor={{ fill: c.series, fillOpacity: 0.08 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div
                  className="rounded-md px-2.5 py-1.5 text-xs shadow-md"
                  style={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.tooltipText }}
                >
                  <p className="font-medium">{label}</p>
                  <p style={{ opacity: 0.75 }}>{Number(payload[0].value).toFixed(4)}</p>
                </div>
              ) : null
            }
          />
          <Bar dataKey="value" fill={c.series} radius={[3, 3, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmt(v: number | undefined, ratio = true): string {
  if (v == null) return "—";
  return ratio ? v.toFixed(3) : String(v);
}
function count(v: number | undefined): string {
  return v == null ? "—" : v.toLocaleString();
}
function duration(ms: number | null): string {
  if (ms == null) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
function shortName(name: string): string {
  return name.length > 14 ? `${name.slice(0, 14)}…` : name;
}
