"use client";

import * as React from "react";
import Link from "next/link";
import { Database, Plus } from "lucide-react";

import { listDatasets, type DatasetListItem } from "@/lib/datasets";
import { listProjects, type Project } from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { DatasetTable } from "@/components/datasets/dataset-table";
import { UploadDatasetDialog } from "@/components/datasets/upload-dataset-dialog";
import { DeleteDatasetDialog } from "@/components/datasets/delete-dataset-dialog";
import { cn } from "@/lib/utils";

export function DatasetsView() {
  const [datasets, setDatasets] = React.useState<DatasetListItem[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DatasetListItem | null>(
    null,
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ds, ps] = await Promise.all([listDatasets(), listProjects()]);
      setDatasets(ds);
      setProjects(ps);
    } catch {
      setError("Couldn't load datasets. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Datasets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload and inspect data across all your projects.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)} disabled={!hasProjects}>
          <Plus className="h-4 w-4" />
          Upload dataset
        </Button>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : datasets.length === 0 ? (
        <EmptyState hasProjects={hasProjects} onUpload={() => setUploadOpen(true)} />
      ) : (
        <DatasetTable
          datasets={datasets}
          showProject
          onDelete={setDeleteTarget}
        />
      )}

      <UploadDatasetDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onUploaded={() => void load()}
      />
      <DeleteDatasetDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        dataset={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          void load();
        }}
      />
    </div>
  );
}

function EmptyState({
  hasProjects,
  onUpload,
}: {
  hasProjects: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Database className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold">No datasets yet</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasProjects
          ? "Upload a CSV or JSON file to inspect its schema and statistics."
          : "Create a project first, then upload data into it."}
      </p>
      {hasProjects ? (
        <Button className="mt-5" onClick={onUpload}>
          <Plus className="h-4 w-4" />
          Upload dataset
        </Button>
      ) : (
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
        >
          Go to projects
        </Link>
      )}
    </div>
  );
}
