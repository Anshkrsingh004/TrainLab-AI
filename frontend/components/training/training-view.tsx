"use client";

import * as React from "react";
import Link from "next/link";
import { Cpu, Plus } from "lucide-react";

import {
  deleteExperiment,
  listExperiments,
  type ExperimentListItem,
} from "@/lib/experiments";
import { buttonVariants } from "@/components/ui/button";
import { ExperimentsTable } from "@/components/training/experiments-table";
import { DeleteConfirmDialog } from "@/components/training/delete-confirm-dialog";
import { cn } from "@/lib/utils";

const POLL_MS = 1500;

export function TrainingView() {
  const [experiments, setExperiments] = React.useState<ExperimentListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<ExperimentListItem | null>(null);

  const load = React.useCallback(async () => {
    try {
      setExperiments(await listExperiments());
      setError(null);
    } catch {
      setError("Couldn't load training runs.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Poll while any run is active.
  const hasActive = experiments.some(
    (e) => e.status === "running" || e.status === "queued",
  );
  React.useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [hasActive, load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Train classical ML models on your datasets.
          </p>
        </div>
        <Link href="/training/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" />
          New run
        </Link>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : experiments.length === 0 ? (
        <EmptyState />
      ) : (
        <ExperimentsTable experiments={experiments} onDelete={setDeleteTarget} />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete training run"
        name={deleteTarget?.name ?? ""}
        onConfirm={async () => {
          if (deleteTarget) await deleteExperiment(deleteTarget.id);
          setDeleteTarget(null);
          void load();
        }}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Cpu className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold">No training runs yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Train a model on one of your datasets to see it here.
      </p>
      <Link href="/training/new" className={cn(buttonVariants(), "mt-5")}>
        <Plus className="h-4 w-4" />
        New run
      </Link>
    </div>
  );
}
