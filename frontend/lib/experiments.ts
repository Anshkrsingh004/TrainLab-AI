/** Experiments (training runs) API client. */

import { API_BASE } from "@/lib/api";
import { ApiError } from "@/lib/projects";

export type ExperimentStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface HyperparamSpec {
  name: string;
  label: string;
  type: "int" | "float" | "select";
  default: number | string | null;
  min?: number;
  max?: number;
  options?: string[];
  optional?: boolean;
}

export interface AlgorithmSpec {
  key: string;
  label: string;
  hyperparameters: HyperparamSpec[];
}

export interface AlgorithmsResponse {
  classification: AlgorithmSpec[];
  regression: AlgorithmSpec[];
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ExperimentMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  labels?: string[];
  confusion_matrix?: number[][];
  r2?: number;
  mae?: number;
  mse?: number;
  rmse?: number;
  feature_importances?: FeatureImportance[];
  n_train?: number;
  n_test?: number;
}

export interface ExperimentListItem {
  id: string;
  name: string;
  task_type: string;
  algorithm: string;
  target_column: string;
  status: ExperimentStatus;
  progress: number;
  project_id: string;
  project_name: string | null;
  dataset_id: string;
  dataset_name: string | null;
  primary_metric_name: string | null;
  primary_metric: number | null;
  created_at: string;
}

export interface ExperimentDetail {
  id: string;
  name: string;
  family: string;
  task_type: string;
  algorithm: string;
  target_column: string;
  feature_columns: string[];
  hyperparameters: Record<string, unknown>;
  test_size: number;
  status: ExperimentStatus;
  progress: number;
  stage: string | null;
  metrics: ExperimentMetrics | null;
  error_message: string | null;
  project_id: string;
  dataset_id: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ExperimentCreate {
  name?: string;
  family?: string;
  task_type: string;
  algorithm: string;
  target_column: string;
  feature_columns?: string[];
  test_size?: number;
  hyperparameters?: Record<string, unknown>;
}

export interface Hardware {
  gpu: boolean;
  device: string;
  device_name: string;
  torch_version: string | null;
}

export interface TransformerModel {
  key: string;
  label: string;
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

export async function getAlgorithms(): Promise<AlgorithmsResponse> {
  const res = await fetch(`${API_BASE}/experiments/algorithms`, {
    cache: "no-store",
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function listExperiments(params?: {
  projectId?: string;
  datasetId?: string;
}): Promise<ExperimentListItem[]> {
  const qs = new URLSearchParams();
  if (params?.projectId) qs.set("project_id", params.projectId);
  if (params?.datasetId) qs.set("dataset_id", params.datasetId);
  const suffix = qs.toString() ? `?${qs}` : "";
  const res = await fetch(`${API_BASE}/experiments${suffix}`, {
    cache: "no-store",
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function getExperiment(id: string): Promise<ExperimentDetail> {
  const res = await fetch(`${API_BASE}/experiments/${id}`, { cache: "no-store" });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function launchExperiment(
  datasetId: string,
  body: ExperimentCreate,
): Promise<ExperimentDetail> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function cancelExperiment(id: string): Promise<ExperimentDetail> {
  const res = await fetch(`${API_BASE}/experiments/${id}/cancel`, {
    method: "POST",
  });
  if (!res.ok) return parseError(res);
  return res.json();
}

export async function deleteExperiment(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/experiments/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) return parseError(res);
}

export async function getHardware(): Promise<Hardware | null> {
  try {
    const res = await fetch(`${API_BASE}/experiments/hardware`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getTransformerModels(): Promise<TransformerModel[]> {
  const res = await fetch(`${API_BASE}/experiments/transformer-models`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export const ALGORITHM_LABELS: Record<string, string> = {
  logistic_regression: "Logistic Regression",
  linear_regression: "Linear Regression",
  random_forest: "Random Forest",
  xgboost: "XGBoost",
  svm: "SVM",
  knn: "K-Nearest Neighbors",
  decision_tree: "Decision Tree",
  distilbert: "DistilBERT",
  bert: "BERT",
  roberta: "RoBERTa",
};
