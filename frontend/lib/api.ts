/**
 * Typed client for the TrainLab AI backend.
 *
 * All requests are same-origin relative paths — the Next.js server proxies
 * `/api/*` to the backend (see next.config.mjs), so the browser only talks to
 * this origin and the session cookie is sent automatically.
 */

export const API_BASE = "/api/v1";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  database: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  created_at: string;
}

export interface Providers {
  google: boolean;
  github: boolean;
}

export async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch {
    return null;
  }
}

export async function getProviders(): Promise<Providers> {
  try {
    const res = await fetch(`${API_BASE}/auth/providers`, { cache: "no-store" });
    if (!res.ok) return { google: false, github: false };
    return (await res.json()) as Providers;
  } catch {
    return { google: false, github: false };
  }
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST" });
}
