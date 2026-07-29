"use client";

import Link from "next/link";
import { MoreVertical, Trash2 } from "lucide-react";

import { formatBytes, type DatasetListItem } from "@/lib/datasets";
import { formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
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

interface Props {
  datasets: DatasetListItem[];
  showProject?: boolean;
  onDelete: (d: DatasetListItem) => void;
}

export function DatasetTable({ datasets, showProject, onDelete }: Props) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            {showProject && <TableHead>Project</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Rows</TableHead>
            <TableHead className="text-right">Cols</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {datasets.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/datasets/${d.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {d.name}
                </Link>
              </TableCell>
              {showProject && (
                <TableCell className="text-muted-foreground">
                  <Link
                    href={`/projects/${d.project_id}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {d.project_name}
                  </Link>
                </TableCell>
              )}
              <TableCell>
                <Badge variant="muted" className="uppercase">
                  {d.file_type}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {d.row_count.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {d.column_count}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatBytes(d.size_bytes)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelative(d.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="Dataset actions"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => onDelete(d)}
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
