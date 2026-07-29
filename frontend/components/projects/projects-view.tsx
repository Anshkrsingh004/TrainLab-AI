"use client";

import * as React from "react";
import { FolderKanban, Plus } from "lucide-react";

import {
  listProjects,
  updateProject,
  type Project,
} from "@/lib/projects";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog";
import { cn } from "@/lib/utils";

export function ProjectsView() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showArchived, setShowArchived] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Project | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = React.useState<Project | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProjects(await listProjects(showArchived));
    } catch {
      setError("Couldn't load projects. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setFormOpen(true);
  }

  async function toggleArchive(project: Project) {
    await updateProject(project.id, { is_archived: !project.is_archived });
    void load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workspaces for your datasets, training runs, and models.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {/* Filter */}
      <div className="inline-flex rounded-lg border p-0.5 text-sm">
        <FilterTab active={!showArchived} onClick={() => setShowArchived(false)}>
          Active
        </FilterTab>
        <FilterTab active={showArchived} onClick={() => setShowArchived(true)}>
          All
        </FilterTab>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : projects.length === 0 ? (
        <EmptyState onCreate={openCreate} showArchived={showArchived} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={openEdit}
              onToggleArchive={toggleArchive}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        onSaved={() => void load()}
      />
      <DeleteProjectDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        project={deleteTarget}
        onDeleted={() => {
          setDeleteTarget(null);
          void load();
        }}
      />
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
      ))}
    </div>
  );
}

function EmptyState({
  onCreate,
  showArchived,
}: {
  onCreate: () => void;
  showArchived: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FolderKanban className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-semibold">
        {showArchived ? "No projects yet" : "No active projects"}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Create a project to start organizing datasets, training runs, and
        models.
      </p>
      <Button className="mt-5" onClick={onCreate}>
        <Plus className="h-4 w-4" />
        New project
      </Button>
    </div>
  );
}
