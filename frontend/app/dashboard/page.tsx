"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser, logout, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser(u);
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    setSigningOut(true);
    await logout();
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const initial = (user.full_name ?? user.email).charAt(0).toUpperCase();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            T
          </span>
          <span className="font-semibold tracking-tight">TrainLab AI</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Log out"}
        </Button>
      </header>

      <div className="mt-10">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.full_name ?? user.email.split("@")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You are signed in. The full dashboard arrives in the next milestone.
        </p>
      </div>

      {/* Profile card */}
      <section className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
              {initial}
            </span>
          )}
          <div>
            <p className="text-lg font-semibold">{user.full_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-sm">
          <Cell label="Signed in with" value={capitalize(user.provider)} />
          <Cell label="Member since" value={formatDate(user.created_at)} />
        </dl>
      </section>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}
