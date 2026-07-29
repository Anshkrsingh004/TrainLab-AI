"use client";

import * as React from "react";
import { Database, Plus } from "lucide-react";

import { listDatasets, type DatasetListItem } from "@/lib/datasets";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatasetTable } from "@/components/datasets/dataset-table";
import { UploadDatasetDialog } from "@/components/datasets/upload-dataset-dialog";
import { DeleteDatasetDialog } from "@/components/datasets/delete-dataset-dialog";

/** Datasets belonging to a single project (rendered on the project page). */
export function ProjectDatasetsSection({ projectId }: { projectId: string }) {
  const [datasets, setDatasets] = React.useState<DatasetListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<DatasetListItem | null>(
    null,
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setDatasets(await listDatasets(projectId));
    } catch {
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">Datasets</CardTitle>
          <CardDescription>Data uploaded to this project</CardDescription>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Upload
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
        ) : datasets.length === 0 ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed py-10 text-center">
            <Database className="h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No datasets yet. Upload a CSV or JSON file.
            </p>
          </div>
        ) : (
          <DatasetTable datasets={datasets} onDelete={setDeleteTarget} />
        )}
      </CardContent>

      <UploadDatasetDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        projectId={projectId}
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
    </Card>
  );
}
