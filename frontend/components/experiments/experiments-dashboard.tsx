"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, GitCompare } from "lucide-react";

import {
  ALGORITHM_LABELS,
  listExperiments,
  type ExperimentListItem,
} from "@/lib/experiments";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/training/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ExperimentsDashboard() {
  const router = useRouter();
  const [experiments, setExperiments] = React.useState<ExperimentListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    try {
      setExperiments(await listExperiments());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function compare() {
    const ids = [...selected].join(",");
    router.push(`/experiments/compare?ids=${ids}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Experiments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your run history and compare results.
          </p>
        </div>
        <Button onClick={compare} disabled={selected.size < 2}>
          <GitCompare className="h-4 w-4" />
          Compare{selected.size > 0 ? ` (${selected.size})` : ""}
        </Button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      ) : experiments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Select two or more completed runs to compare them.
          </p>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10" />
                  <TableHead>Name</TableHead>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Result</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiments.map((e) => {
                  const selectable = e.status === "completed";
                  return (
                    <TableRow key={e.id} data-state={selected.has(e.id) ? "selected" : undefined}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[hsl(var(--primary))] disabled:opacity-40"
                          checked={selected.has(e.id)}
                          disabled={!selectable}
                          onChange={() => toggle(e.id)}
                          aria-label={`Select ${e.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/training/${e.id}`} className="hover:text-primary hover:underline">
                          {e.name}
                        </Link>
                        {e.family === "transformer" && (
                          <Badge variant="muted" className="ml-2">
                            Transformer
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.dataset_name}</TableCell>
                      <TableCell>{ALGORITHM_LABELS[e.algorithm] ?? e.algorithm}</TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {e.primary_metric != null ? (
                          <span>
                            <span className="text-muted-foreground">{e.primary_metric_name} </span>
                            {e.primary_metric.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatRelative(e.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FlaskConical className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold">No experiments yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Train a model and your runs will appear here to review and compare.
      </p>
      <Link href="/training/new" className="mt-5 text-sm text-primary hover:underline">
        Start a training run
      </Link>
    </div>
  );
}
