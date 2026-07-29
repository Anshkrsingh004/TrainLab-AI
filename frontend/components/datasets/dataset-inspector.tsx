"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cpu, Trash2 } from "lucide-react";

import {
  getDataset,
  getPreview,
  formatBytes,
  type ColumnStat,
  type DatasetDetail,
  type DatasetPreview,
} from "@/lib/datasets";
import { ApiError } from "@/lib/projects";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DistributionChart } from "@/components/datasets/distribution-chart";
import { DeleteDatasetDialog } from "@/components/datasets/delete-dataset-dialog";

export function DatasetInspector({ id }: { id: string }) {
  const router = useRouter();
  const [dataset, setDataset] = React.useState<DatasetDetail | null>(null);
  const [preview, setPreview] = React.useState<DatasetPreview | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "notfound">(
    "loading",
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    Promise.all([getDataset(id), getPreview(id, 100, 0)])
      .then(([d, p]) => {
        if (!active) return;
        setDataset(d);
        setPreview(p);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "notfound");
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  if (status === "notfound" || !dataset || !preview) {
    return (
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-xl font-semibold">Dataset not found</h1>
        <Link
          href="/datasets"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Back to datasets
        </Link>
      </div>
    );
  }

  const s = dataset.statistics;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/projects/${dataset.project_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to project
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {dataset.name}
            </h1>
            <Badge variant="muted" className="uppercase">
              {dataset.file_type}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {dataset.row_count.toLocaleString()} rows · {dataset.column_count}{" "}
            columns · {formatBytes(dataset.size_bytes)} · uploaded{" "}
            {formatRelative(dataset.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/training/new?dataset=${dataset.id}`}
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Cpu className="h-4 w-4" />
            Train model
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="viz">Visualizations</TabsTrigger>
        </TabsList>

        {/* Preview */}
        <TabsContent value="preview">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {preview.columns.map((c) => (
                    <TableHead key={c} className="whitespace-nowrap">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={j} className="whitespace-nowrap tabular-nums">
                        {renderCell(cell)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {preview.rows.length} of{" "}
            {preview.total_rows.toLocaleString()} rows
            {preview.total_rows > preview.preview_rows &&
              ` (first ${preview.preview_rows} captured at upload)`}
            .
          </p>
        </TabsContent>

        {/* Schema */}
        <TabsContent value="schema">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Column</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                  <TableHead className="text-right">Missing %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataset.columns.map((col) => (
                  <TableRow key={col.name}>
                    <TableCell className="font-medium">{col.name}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{col.dtype}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {col.null_count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {col.null_pct}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Rows" value={s.rows.toLocaleString()} />
            <MiniStat label="Columns" value={String(s.columns)} />
            <MiniStat label="Missing cells" value={s.missing_cells.toLocaleString()} />
            <MiniStat label="Missing" value={`${s.missing_pct}%`} />
          </div>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Column</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataset.columns.map((col) => {
                  const stat = s.column_stats[col.name];
                  return (
                    <TableRow key={col.name}>
                      <TableCell className="font-medium">{col.name}</TableCell>
                      <TableCell>
                        <Badge variant="muted">{col.dtype}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {stat?.count ?? 0}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {stat?.missing ?? 0}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {summarize(stat)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Visualizations */}
        <TabsContent value="viz" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {dataset.columns.map((col) => {
              const stat = s.column_stats[col.name];
              if (!stat?.distribution?.length) return null;
              return (
                <Card key={col.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm">{col.name}</CardTitle>
                      <Badge variant="muted">{col.dtype}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DistributionChart data={stat.distribution} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <DeleteDatasetDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        dataset={dataset}
        onDeleted={() => router.replace(`/projects/${dataset.project_id}`)}
      />
    </div>
  );
}

function renderCell(cell: unknown): React.ReactNode {
  if (cell === null || cell === undefined)
    return <span className="text-muted-foreground/50">—</span>;
  if (typeof cell === "boolean") return cell ? "true" : "false";
  return String(cell);
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function summarize(stat: ColumnStat | undefined): string {
  if (!stat) return "—";
  if (stat.dtype === "integer" || stat.dtype === "float") {
    if (stat.min == null) return "—";
    return `min ${stat.min} · median ${stat.median} · mean ${stat.mean} · max ${stat.max}`;
  }
  const parts: string[] = [];
  if (stat.unique != null) parts.push(`${stat.unique} unique`);
  if (stat.top) parts.push(`top: ${stat.top}`);
  return parts.join(" · ") || "—";
}
