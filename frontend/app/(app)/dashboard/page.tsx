"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes,
  Database,
  FlaskConical,
  FolderKanban,
  Plus,
} from "lucide-react";

import { useUser } from "@/lib/user-context";
import { listProjects, type Project } from "@/lib/projects";
import { formatRelative } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityAreaChart } from "@/components/dashboard/charts/activity-area-chart";
import { ModelsBarChart } from "@/components/dashboard/charts/models-bar-chart";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useUser();
  const firstName = user?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0];

  const [projects, setProjects] = React.useState<Project[]>([]);

  React.useEffect(() => {
    listProjects(true)
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  const active = projects.filter((p) => !p.is_archived);
  const archivedCount = projects.length - active.length;
  const recent = active.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s an overview of your workspace.
        </p>
      </div>

      {/* Overview cards — Projects is real; the rest are sample until their
          features land in later milestones. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={String(active.length)}
          icon={FolderKanban}
          sublabel={
            archivedCount > 0 ? `${archivedCount} archived` : "All active"
          }
        />
        <StatCard label="Datasets" value="18" icon={Database} deltaPct={12} sample />
        <StatCard label="Models trained" value="42" icon={Boxes} deltaPct={8} sample />
        <StatCard
          label="Experiments"
          value="127"
          icon={FlaskConical}
          deltaPct={-4}
          sample
        />
      </div>

      {/* Charts (sample) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Training activity</CardTitle>
              <Badge variant="warning">Sample</Badge>
            </div>
            <CardDescription>Runs over the last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityAreaChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Models by type</CardTitle>
              <Badge variant="warning">Sample</Badge>
            </div>
            <CardDescription>Count of trained models by algorithm</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelsBarChart />
          </CardContent>
        </Card>
      </div>

      {/* Recent projects (real) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent projects</CardTitle>
          <CardDescription>Your most recently updated projects</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No projects yet.
              </p>
              <Link
                href="/projects"
                className={cn(buttonVariants({ size: "sm" }), "mt-3")}
              >
                <Plus className="h-4 w-4" />
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FolderKanban className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(p.updated_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
