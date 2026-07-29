"use client";

import * as React from "react";
import Link from "next/link";
import { Boxes, Download } from "lucide-react";

import {
  ALGORITHM_LABELS,
  downloadModelUrl,
  listExperiments,
  type ExperimentListItem,
} from "@/lib/experiments";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function ModelsView() {
  const [models, setModels] = React.useState<ExperimentListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    listExperiments()
      .then((all) => setModels(all.filter((e) => e.status === "completed")))
      .catch(() => setModels([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Models</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download the trained models from your completed runs.
        </p>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Boxes className="h-6 w-6" />
          </span>
          <h3 className="mt-4 font-semibold">No trained models yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Complete a training run and its model will be downloadable here.
          </p>
          <Link href="/training/new" className="mt-5 text-sm text-primary hover:underline">
            Start a training run
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead className="text-right">Result</TableHead>
                <TableHead>Trained</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <Link href={`/training/${m.id}`} className="hover:text-primary hover:underline">
                      {m.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{ALGORITHM_LABELS[m.algorithm] ?? m.algorithm}</span>
                      {m.family === "transformer" && (
                        <Badge variant="muted">Transformer</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.dataset_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.primary_metric != null ? (
                      <span>
                        <span className="text-muted-foreground">{m.primary_metric_name} </span>
                        {m.primary_metric.toFixed(3)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatRelative(m.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <a
                      href={downloadModelUrl(m.id)}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      <Download className="h-4 w-4" />
                      {m.family === "transformer" ? ".zip" : ".joblib"}
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
