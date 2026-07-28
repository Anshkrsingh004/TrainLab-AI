/**
 * Typed client for the TrainLab AI backend.
 *
 * The base URL is read from NEXT_PUBLIC_API_URL so the same build works in
 * local dev and in Docker (where the backend port is published to the host).
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
  database: string;
}

export async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}
