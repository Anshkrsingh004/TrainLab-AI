/** Datasets API client (same-origin; the session cookie is sent automatically). */

import { API_BASE } from "@/lib/api";
import { ApiError } from "@/lib/projects";

export interface DatasetListItem {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  size_bytes: number;
  row_count: number;
  column_count: number;
  project_id: string;
  project_name: string | null;
  created_at: string;
}

export interface ColumnSchema {
  name: string;
  dtype: string;
  null_count: number;
  null_pct: number;
}

export interface DistributionBin {
  label: string;
  count: number;
}

export interface ColumnStat {
  dtype: string;
  count: number;
  missing: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  p25?: number | null;
  median?: number | null;
  p75?: number | null;
  max?: number | null;
  unique?: number;
  top?: string | null;
  distribution?: DistributionBin[];
}

export interface DatasetStatistics {
  rows: number;
  columns: number;
  missing_cells: number;
  missing_pct: number;
  column_types: { type: string; count: number }[];
  column_stats: Record<string, ColumnStat>;
}

export interface DatasetDetail {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  size_bytes: number;
  row_count: number;
  column_count: number;
  project_id: string;
  created_at: string;
  columns: ColumnSchema[];
  statistics: DatasetStatistics;
}

export interface DatasetPreview {
  columns: string[];
  rows: unknown[][];
  total_rows: number;
  preview_rows: number;
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

export async function listDatasets(projectId?: string): Promise<DatasetListItem[]> {
  const qs = projectId ? `?project_id=${projectId}` : "";
  const res = await fetch(`${API_BASE}/datasets${qs}`, { cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function getDataset(id: string): Promise<DatasetDetail> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, { cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function getPreview(
  id: string,
  limit = 50,
  offset = 0,
): Promise<DatasetPreview> {
  const res = await fetch(
    `${API_BASE}/datasets/${id}/preview?limit=${limit}&offset=${offset}`,
    { cache: "no-store" },
  );
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function uploadDataset(
  projectId: string,
  file: File,
  name?: string,
): Promise<DatasetDetail> {
  const form = new FormData();
  form.append("file", file);
  if (name) form.append("name", name);
  const res = await fetch(`${API_BASE}/projects/${projectId}/datasets`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function deleteDataset(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) return parseError(res);
}

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
