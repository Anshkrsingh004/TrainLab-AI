"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2, XCircle } from "lucide-react";

import {
  ALGORITHM_LABELS,
  cancelExperiment,
  deleteExperiment,
  downloadModelUrl,
  getExperiment,
  type ExperimentDetail as Experiment,
} from "@/lib/experiments";
import { ApiError } from "@/lib/projects";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/training/status-badge";
import { DeleteConfirmDialog } from "@/components/training/delete-confirm-dialog";
import {
  ConfusionMatrix,
  FeatureImportanceChart,
} from "@/components/training/metric-charts";

const POLL_MS = 1200;

export function ExperimentDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [exp, setExp] = React.useState<Experiment | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "notfound">(
    "loading",
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setExp(await getExperiment(id));
      setStatus("ready");
    } catch (err) {
      setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "notfound");
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const active = exp?.status === "running" || exp?.status === "queued";
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [active, load]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }
  if (status === "notfound" || !exp) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-xl font-semibold">Training run not found</h1>
        <Link href="/training" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to training
        </Link>
      </div>
    );
  }

  async function handleCancel() {
    if (!exp) return;
    setCancelling(true);
    try {
      await cancelExperiment(exp.id);
      await load();
    } finally {
      setCancelling(false);
    }
  }

  const m = exp.metrics;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/training"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Training
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{exp.name}</h1>
            <StatusBadge status={exp.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ALGORITHM_LABELS[exp.algorithm] ?? exp.algorithm} · {exp.task_type} ·
            target <span className="font-medium text-foreground">{exp.target_column}</span> ·
            created {formatRelative(exp.created_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {exp.status === "completed" && (
            <a
              href={downloadModelUrl(exp.id)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Download className="h-4 w-4" />
              Download model
            </a>
          )}
          {exp.status !== "running" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Live progress */}
      {active && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{exp.stage ?? "Starting…"}</span>
              <span className="tabular-nums text-muted-foreground">{exp.progress}%</span>
            </div>
            <Progress value={exp.progress} />
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                <XCircle className="h-4 w-4" />
                {cancelling ? "Cancelling…" : "Cancel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {exp.status === "failed" && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Training failed
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{exp.error_message}</p>
          </CardContent>
        </Card>
      )}

      {exp.status === "cancelled" && (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            This run was cancelled.
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Field label="Algorithm" value={ALGORITHM_LABELS[exp.algorithm] ?? exp.algorithm} />
            <Field label="Task" value={exp.task_type} />
            <Field label="Target" value={exp.target_column} />
            <Field label="Features" value={String(exp.feature_columns.length)} />
            <Field label="Test split" value={String(exp.test_size)} />
            <Field
              label="Duration"
              value={exp.duration_ms != null ? formatDuration(exp.duration_ms) : "—"}
            />
          </dl>
          {Object.keys(exp.hyperparameters).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(exp.hyperparameters).map(([k, v]) => (
                <Badge key={k} variant="muted">
                  {k}: {v === null ? "auto" : String(v)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics + charts */}
      {exp.status === "completed" && m && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {exp.task_type === "classification" ? (
              <>
                <Metric label="Accuracy" value={m.accuracy} />
                <Metric label="Precision" value={m.precision} />
                <Metric label="Recall" value={m.recall} />
                <Metric label="F1" value={m.f1} />
              </>
            ) : (
              <>
                <Metric label="R²" value={m.r2} />
                <Metric label="MAE" value={m.mae} raw />
                <Metric label="RMSE" value={m.rmse} raw />
                <Metric label="Test rows" value={m.n_test} raw />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {m.feature_importances && m.feature_importances.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Feature importance</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeatureImportanceChart data={m.feature_importances} />
                </CardContent>
              </Card>
            )}
            {exp.task_type === "classification" &&
              m.confusion_matrix &&
              m.labels && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Confusion matrix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ConfusionMatrix matrix={m.confusion_matrix} labels={m.labels} />
                  </CardContent>
                </Card>
              )}
          </div>
        </>
      )}

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete training run"
        name={exp.name}
        onConfirm={async () => {
          await deleteExperiment(exp.id);
          router.replace("/training");
        }}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  raw,
}: {
  label: string;
  value: number | undefined;
  raw?: boolean;
}) {
  const display =
    value == null ? "—" : raw ? value.toLocaleString() : value.toFixed(3);
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{display}</p>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
