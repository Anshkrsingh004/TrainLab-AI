"use client";

import * as React from "react";
import { FileUp, X } from "lucide-react";

import { uploadDataset, formatBytes, type DatasetDetail } from "@/lib/datasets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProjectOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preset target project (from a project page). */
  projectId?: string;
  /** Selectable projects (when opened without a preset). */
  projects?: ProjectOption[];
  onUploaded: (dataset: DatasetDetail) => void;
}

const ACCEPT = ".csv,.json";

export function UploadDatasetDialog({
  open,
  onOpenChange,
  projectId,
  projects = [],
  onUploaded,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [name, setName] = React.useState("");
  const [selectedProject, setSelectedProject] = React.useState(projectId ?? "");
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Reset the form when the dialog opens. `projects` must NOT be a dependency:
  // it defaults to a fresh [] each render, so including it would re-run this
  // effect on every keystroke and wipe the selected file / typed name.
  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setName("");
    setSelectedProject(projectId ?? "");
    setError(null);
    setUploading(false);
  }, [open, projectId]);

  // When opened without a preset project, default the picker to the first one.
  React.useEffect(() => {
    if (open && !projectId && !selectedProject && projects[0]) {
      setSelectedProject(projects[0].id);
    }
  }, [open, projectId, selectedProject, projects]);

  const target = projectId ?? selectedProject;
  const noProjects = !projectId && projects.length === 0;

  function pickFile(f: File | null) {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "json") {
      setError("Please choose a .csv or .json file.");
      return;
    }
    setError(null);
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Choose a file to upload.");
    if (!target) return setError("Select a project.");
    setUploading(true);
    setError(null);
    try {
      const dataset = await uploadDataset(target, file, name);
      onUploaded(dataset);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload dataset</DialogTitle>
            <DialogDescription>
              CSV or JSON, up to 50 MB. We&apos;ll detect the schema and compute
              statistics automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!projectId && (
              <div className="space-y-1.5">
                <Label htmlFor="ds-project">Project</Label>
                <select
                  id="ds-project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  disabled={noProjects}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {noProjects ? (
                    <option value="">No projects yet — create one first</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Dropzone */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              <FileUp className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium text-primary">Click to browse</span>{" "}
                or drag a file here
              </span>
              <span className="text-xs text-muted-foreground">CSV or JSON</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />

            {file && (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="truncate">
                  {file.name}{" "}
                  <span className="text-muted-foreground">
                    ({formatBytes(file.size)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="ml-2 text-muted-foreground hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ds-name">Name</Label>
              <Input
                id="ds-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dataset name"
                maxLength={200}
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || noProjects || !file}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
