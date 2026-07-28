"use client";

import { useEffect, useState } from "react";
import { getHealth, type HealthResponse } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Status = "checking" | "online" | "offline";

export default function Home() {
  const [status, setStatus] = useState<Status>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    getHealth().then((h) => {
      if (h) {
        setHealth(h);
        setStatus("online");
      } else {
        setStatus("offline");
      }
    });
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight">
            TrainLab AI
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            The Modern AI Training &amp; MLOps Platform
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Foundation is live. Milestone 1 — a scalable Next.js + FastAPI +
            PostgreSQL stack, ready to grow.
          </p>

          <div className="mt-6">
            <a href="/login" className={cn(buttonVariants({ size: "lg" }))}>
              Sign in
            </a>
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <StatusPill status={status} />

            {health && (
              <dl className="mt-2 grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-left text-sm">
                <Cell label="Service" value={health.service} />
                <Cell label="Version" value={health.version} />
                <Cell label="Environment" value={health.environment} />
                <Cell
                  label="Database"
                  value={health.database}
                  accent={health.database === "ok"}
                />
              </dl>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Release 1 · Milestone 1 · Foundation
        </p>
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    checking: { label: "Checking backend…", dot: "bg-muted-foreground" },
    online: { label: "Backend online", dot: "bg-emerald-500" },
    offline: { label: "Backend offline", dot: "bg-red-500" },
  } as const;
  const { label, dot } = map[status];

  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-medium",
          accent && "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
