"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { listDatasets, type DatasetListItem } from "@/lib/datasets";
import { getDataset, type ColumnSchema } from "@/lib/datasets";
import {
  getAlgorithms,
  launchExperiment,
  type AlgorithmSpec,
  type AlgorithmsResponse,
  type HyperparamSpec,
} from "@/lib/experiments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Task = "classification" | "regression";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function NewExperimentForm({ initialDatasetId }: { initialDatasetId?: string }) {
  const router = useRouter();

  const [datasets, setDatasets] = React.useState<DatasetListItem[]>([]);
  const [algorithms, setAlgorithms] = React.useState<AlgorithmsResponse | null>(null);
  const [datasetId, setDatasetId] = React.useState(initialDatasetId ?? "");
  const [columns, setColumns] = React.useState<ColumnSchema[]>([]);

  const [task, setTask] = React.useState<Task>("classification");
  const [target, setTarget] = React.useState("");
  const [features, setFeatures] = React.useState<string[]>([]);
  const [algorithm, setAlgorithm] = React.useState("");
  const [hyperparams, setHyperparams] = React.useState<Record<string, unknown>>({});
  const [testSize, setTestSize] = React.useState(0.2);
  const [name, setName] = React.useState("");

  const [error, setError] = React.useState<string | null>(null);
  const [launching, setLaunching] = React.useState(false);

  // Load datasets + algorithm metadata.
  React.useEffect(() => {
    Promise.all([listDatasets(), getAlgorithms()]).then(([ds, algos]) => {
      setDatasets(ds);
      setAlgorithms(algos);
      if (!datasetId && ds[0]) setDatasetId(ds[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the selected dataset's columns.
  React.useEffect(() => {
    if (!datasetId) return;
    getDataset(datasetId).then((d) => {
      setColumns(d.columns);
      const last = d.columns[d.columns.length - 1]?.name ?? "";
      setTarget(last);
      setFeatures(d.columns.map((c) => c.name).filter((c) => c !== last));
    });
  }, [datasetId]);

  const algoList: AlgorithmSpec[] = algorithms?.[task] ?? [];
  const currentAlgo = algoList.find((a) => a.key === algorithm) ?? algoList[0];

  // Keep algorithm valid for the task and reset hyperparameters to its defaults.
  React.useEffect(() => {
    if (!algoList.length) return;
    const algo = algoList.find((a) => a.key === algorithm) ?? algoList[0];
    if (algo.key !== algorithm) setAlgorithm(algo.key);
    const defaults: Record<string, unknown> = {};
    for (const hp of algo.hyperparameters) defaults[hp.name] = hp.default;
    setHyperparams(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, algorithm, algorithms]);

  function toggleFeature(col: string) {
    setFeatures((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!datasetId) return setError("Choose a dataset.");
    if (!target) return setError("Choose a target column.");
    if (features.length === 0) return setError("Select at least one feature.");
    setLaunching(true);
    setError(null);
    try {
      const exp = await launchExperiment(datasetId, {
        name: name || undefined,
        task_type: task,
        algorithm: currentAlgo.key,
        target_column: target,
        feature_columns: features.filter((f) => f !== target),
        test_size: testSize,
        hyperparameters: hyperparams,
      });
      router.push(`/training/${exp.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start training.");
      setLaunching(false);
    }
  }

  const noDatasets = datasets.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/training"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Training
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New training run</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a dataset and configure the model to train.
        </p>
      </div>

      {noDatasets ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            You need a dataset first.{" "}
            <Link href="/datasets" className="text-primary hover:underline">
              Upload one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data</CardTitle>
              <CardDescription>Dataset, target, and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="dataset">Dataset</Label>
                  <select
                    id="dataset"
                    value={datasetId}
                    onChange={(e) => setDatasetId(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="target">Target column</Label>
                  <select
                    id="target"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.dtype})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Features</Label>
                <div className="flex flex-wrap gap-2">
                  {columns
                    .filter((c) => c.name !== target)
                    .map((c) => {
                      const on = features.includes(c.name);
                      return (
                        <button
                          type="button"
                          key={c.name}
                          onClick={() => toggleFeature(c.name)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            on
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model</CardTitle>
              <CardDescription>Task, algorithm, and hyperparameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="task">Task type</Label>
                  <select
                    id="task"
                    value={task}
                    onChange={(e) => setTask(e.target.value as Task)}
                    className={SELECT_CLASS}
                  >
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="algorithm">Algorithm</Label>
                  <select
                    id="algorithm"
                    value={currentAlgo?.key ?? ""}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {algoList.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentAlgo && currentAlgo.hyperparameters.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {currentAlgo.hyperparameters.map((hp) => (
                    <HyperparamField
                      key={hp.name}
                      spec={hp}
                      value={hyperparams[hp.name]}
                      onChange={(v) =>
                        setHyperparams((prev) => ({ ...prev, [hp.name]: v }))
                      }
                    />
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="test-size">Test split</Label>
                  <Input
                    id="test-size"
                    type="number"
                    step="0.05"
                    min={0.05}
                    max={0.5}
                    value={testSize}
                    onChange={(e) => setTestSize(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="run-name">Run name (optional)</Label>
                  <Input
                    id="run-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Auto-generated if blank"
                    maxLength={200}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Link href="/training" className={cn(buttonOutline)}>
              Cancel
            </Link>
            <Button type="submit" disabled={launching}>
              {launching ? "Starting…" : "Start training"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const buttonOutline =
  "inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted";

function HyperparamField({
  spec,
  value,
  onChange,
}: {
  spec: HyperparamSpec;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (spec.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={spec.name}>{spec.label}</Label>
        <select
          id={spec.name}
          value={String(value ?? spec.default ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={SELECT_CLASS}
        >
          {spec.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor={spec.name}>{spec.label}</Label>
      <Input
        id={spec.name}
        type="number"
        step={spec.type === "float" ? "0.01" : "1"}
        min={spec.min}
        max={spec.max}
        value={value === null || value === undefined ? "" : String(value)}
        placeholder={spec.optional ? "auto" : undefined}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </div>
  );
}
