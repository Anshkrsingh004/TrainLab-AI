"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Boxes,
  FlaskConical,
  Pencil,
  Trash2,
} from "lucide-react";

import { getProject, updateProject, type Project } from "@/lib/projects";
import { ApiError } from "@/lib/projects";
import { formatDate, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { ProjectDatasetsSection } from "@/components/datasets/project-datasets-section";

const RESOURCES = [
  { label: "Experiments", icon: FlaskConical },
  { label: "Models", icon: Boxes },
];

export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "notfound">(
    "loading",
  );
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setProject(await getProject(id));
      setStatus("ready");
    } catch (err) {
      setStatus(err instanceof ApiError && err.status === 404 ? "notfound" : "notfound");
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-40 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    );
  }

  if (status === "notfound" || !project) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or it doesn&apos;t belong to your account.
        </p>
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: "outline" }), "mt-5")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </Link>
      </div>
    );
  }

  async function toggleArchive() {
    if (!project) return;
    setProject(await updateProject(project.id, { is_archived: !project.is_archived }));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">
              {project.name}
            </h1>
            {project.is_archived && <Badge variant="muted">Archived</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {formatDate(project.created_at)} · Updated{" "}
            {formatRelative(project.updated_at)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={toggleArchive}>
            {project.is_archived ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archive
              </>
            )}
          </Button>
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

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {project.description || "No description yet. Use Edit to add one."}
          </p>
        </CardContent>
      </Card>

      {/* Datasets (Milestone 5) */}
      <ProjectDatasetsSection projectId={project.id} />

      {/* Resources (future milestones) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RESOURCES.map((r) => {
          const Icon = r.icon;
          return (
            <Card key={r.label} className="opacity-70">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-[1.15rem] w-[1.15rem]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">—</p>
                  </div>
                </div>
                <Badge variant="muted">Soon</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
          <CardDescription>Events in this project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No activity yet. Events will appear here once you add datasets and
            training runs.
          </p>
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={project}
        onSaved={setProject}
      />
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        project={project}
        onDeleted={() => router.replace("/projects")}
      />
    </div>
  );
}
