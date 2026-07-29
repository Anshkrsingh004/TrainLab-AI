"use client";

import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  FolderKanban,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { type Project } from "@/lib/projects";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  project: Project;
  onEdit: (p: Project) => void;
  onToggleArchive: (p: Project) => void;
  onDelete: (p: Project) => void;
}

export function ProjectCard({ project, onEdit, onToggleArchive, onDelete }: Props) {
  return (
    <Card className="group relative transition-colors hover:border-primary/40">
      <div className="absolute right-2.5 top-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Project actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(project)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleArchive(project)}>
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
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(project)}
              className="text-red-600 focus:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/projects/${project.id}`} className="block p-5">
        <div className="flex items-center gap-2 pr-8">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban className="h-4 w-4" />
          </span>
          <h3 className="truncate font-semibold">{project.name}</h3>
          {project.is_archived && <Badge variant="muted">Archived</Badge>}
        </div>

        <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
          {project.description || "No description"}
        </p>

        <p className="mt-4 text-xs text-muted-foreground">
          Updated {formatRelative(project.updated_at)}
        </p>
      </Link>
    </Card>
  );
}
