/** Projects API client (same-origin; the session cookie is sent automatically). */

import { API_BASE } from "@/lib/api";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_archived: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  description?: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") detail = body.detail;
  } catch {
    /* ignore */
  }
  throw new ApiError(res.status, detail);
}

export async function listProjects(includeArchived = false): Promise<Project[]> {
  const res = await fetch(
    `${API_BASE}/projects?include_archived=${includeArchived}`,
    { cache: "no-store" },
  );
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function createProject(data: ProjectInput): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function updateProject(
  id: string,
  data: Partial<ProjectInput> & { is_archived?: boolean },
): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) return parseError(res);
}
