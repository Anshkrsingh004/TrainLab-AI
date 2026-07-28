"use client";

import {
  Boxes,
  Database,
  FlaskConical,
  FolderKanban,
} from "lucide-react";

import { useUser } from "@/lib/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityAreaChart } from "@/components/dashboard/charts/activity-area-chart";
import { ModelsBarChart } from "@/components/dashboard/charts/models-bar-chart";

const RECENT = [
  { title: "Trained XGBoost on churn-prediction", meta: "Accuracy 0.94", when: "2h ago", tone: "good" },
  { title: "Uploaded dataset customers.csv", meta: "12,480 rows", when: "5h ago", tone: "neutral" },
  { title: "Fine-tuned DistilBERT on reviews", meta: "F1 0.88", when: "Yesterday", tone: "good" },
  { title: "Random Forest run cancelled", meta: "sentiment-v2", when: "Yesterday", tone: "warn" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s an overview of your workspace.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400"
          title="These figures are placeholders until datasets and training arrive in later milestones."
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Sample data
        </span>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Projects" value="6" icon={FolderKanban} deltaPct={2} />
        <StatCard label="Datasets" value="18" icon={Database} deltaPct={12} />
        <StatCard label="Models trained" value="42" icon={Boxes} deltaPct={8} />
        <StatCard label="Experiments" value="127" icon={FlaskConical} deltaPct={-4} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training activity</CardTitle>
            <CardDescription>Runs over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityAreaChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Models by type</CardTitle>
            <CardDescription>Count of trained models by algorithm</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelsBarChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Latest events across your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {RECENT.map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={
                    "h-2 w-2 shrink-0 rounded-full " +
                    (item.tone === "good"
                      ? "bg-emerald-500"
                      : item.tone === "warn"
                        ? "bg-amber-500"
                        : "bg-muted-foreground/50")
                  }
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.meta}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.when}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
