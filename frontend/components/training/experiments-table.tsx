"use client";

import Link from "next/link";
import { MoreVertical, Trash2 } from "lucide-react";

import {
  ALGORITHM_LABELS,
  type ExperimentListItem,
} from "@/lib/experiments";
import { formatRelative } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/training/status-badge";

interface Props {
  experiments: ExperimentListItem[];
  onDelete: (e: ExperimentListItem) => void;
}

export function ExperimentsTable({ experiments, onDelete }: Props) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Dataset</TableHead>
            <TableHead>Algorithm</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Result</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {experiments.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/training/${e.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {e.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {e.dataset_name}
              </TableCell>
              <TableCell>
                {ALGORITHM_LABELS[e.algorithm] ?? e.algorithm}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <StatusBadge status={e.status} />
                  {e.status === "running" && (
                    <Progress value={e.progress} className="h-1 w-24" />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {e.primary_metric != null ? (
                  <span>
                    <span className="text-muted-foreground">
                      {e.primary_metric_name}{" "}
                    </span>
                    {e.primary_metric.toFixed(3)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelative(e.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Run actions"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => onDelete(e)}
                      disabled={e.status === "running"}
                      className="text-red-600 focus:bg-red-500/10 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
