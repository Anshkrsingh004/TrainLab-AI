import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Percent change vs the previous period; sign drives the trend cue. */
  deltaPct?: number;
  deltaLabel?: string;
  /** Plain secondary line (used for real cards that have no trend history). */
  sublabel?: string;
  /** Marks the figure as illustrative sample data. */
  sample?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  deltaPct,
  deltaLabel = "vs last week",
  sublabel,
  sample,
}: StatCardProps) {
  const up = (deltaPct ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {sample && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Sample
              </span>
            )}
          </div>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-[1.15rem] w-[1.15rem]" />
          </span>
        </div>

        <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>

        {deltaPct !== undefined ? (
          <p className="mt-2 flex items-center gap-1 text-xs">
            {/* Trend is carried by icon + sign, not color alone. */}
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                up
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {up ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {up ? "+" : ""}
              {deltaPct}%
            </span>
            <span className="text-muted-foreground">{deltaLabel}</span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{sublabel ?? " "}</p>
        )}
      </CardContent>
    </Card>
  );
}
