"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { UserProvider } from "@/lib/user-context";

/**
 * Authenticated application shell: fixed sidebar (desktop), sticky header with
 * mobile drawer, and the page content. Every protected feature page renders
 * inside this via the (app) route group.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-h-screen flex-col lg:pl-64">
          <Header />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </UserProvider>
  );
}
