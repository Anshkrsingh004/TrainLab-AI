"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { getProviders, type Providers } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "Sign-in failed or was cancelled. Please try again.",
  no_email: "We couldn't read a verified email from that account.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("error");
  const error = errorKey ? (ERROR_MESSAGES[errorKey] ?? "Sign-in failed.") : null;

  const [providers, setProviders] = useState<Providers>({
    google: false,
    github: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProviders().then((p) => {
      setProviders(p);
      setLoading(false);
    });
  }, []);

  const noneConfigured = !loading && !providers.google && !providers.github;

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.12),transparent)]" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight">TrainLab AI</span>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-center text-2xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sign in to continue to your workspace.
          </p>

          {error && (
            <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <a
              href="/api/v1/auth/google/login"
              aria-disabled={!providers.google}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full",
                !providers.google && "pointer-events-none opacity-50",
              )}
            >
              Continue with Google
            </a>
            <a
              href="/api/v1/auth/github/login"
              aria-disabled={!providers.github}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full",
                !providers.github && "pointer-events-none opacity-50",
              )}
            >
              Continue with GitHub
            </a>
          </div>

          {noneConfigured && (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              No OAuth providers are configured yet. See{" "}
              <code className="rounded bg-muted px-1 py-0.5">docs/AUTH_SETUP.md</code>.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Release 1 · Milestone 2 · Authentication
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
