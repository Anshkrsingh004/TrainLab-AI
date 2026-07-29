import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  Slash,
  XCircle,
} from "lucide-react";

import type { ExperimentStatus } from "@/lib/experiments";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  ExperimentStatus,
  { label: string; className: string; icon: typeof CheckCircle2; spin?: boolean }
> = {
  queued: {
    label: "Queued",
    className: "border-border bg-muted text-muted-foreground",
    icon: CircleDashed,
  },
  running: {
    label: "Running",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Loader2,
    spin: true,
  },
  completed: {
    label: "Completed",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    className: "border-border bg-muted text-muted-foreground",
    icon: Slash,
  },
};

export function StatusBadge({ status }: { status: ExperimentStatus }) {
  const { label, className, icon: Icon, spin } = CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
      {label}
    </span>
  );
}
