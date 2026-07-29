"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cpu, Zap } from "lucide-react";
import Link from "next/link";

import { listDatasets, type DatasetListItem } from "@/lib/datasets";
import { getDataset, type ColumnSchema } from "@/lib/datasets";
import {
  getAlgorithms,
  getHardware,
  getTransformerModels,
  launchExperiment,
  type AlgorithmSpec,
  type AlgorithmsResponse,
  type Hardware,
  type HyperparamSpec,
  type TransformerModel,
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
type Family = "classical" | "transformer";

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function NewExperimentForm({ initialDatasetId }: { initialDatasetId?: string }) {
  const router = useRouter();

  const [datasets, setDatasets] = React.useState<DatasetListItem[]>([]);
  const [algorithms, setAlgorithms] = React.useState<AlgorithmsResponse | null>(null);
  const [tModels, setTModels] = React.useState<TransformerModel[]>([]);
  const [hardware, setHardware] = React.useState<Hardware | null>(null);
  const [datasetId, setDatasetId] = React.useState(initialDatasetId ?? "");
  const [columns, setColumns] = React.useState<ColumnSchema[]>([]);

  const [family, setFamily] = React.useState<Family>("classical");
  const [target, setTarget] = React.useState("");
  const [name, setName] = React.useState("");
  const [testSize, setTestSize] = React.useState(0.2);

  // Classical
  const [task, setTask] = React.useState<Task>("classification");
  const [features, setFeatures] = React.useState<string[]>([]);
  const [algorithm, setAlgorithm] = React.useState("");
  const [hyperparams, setHyperparams] = React.useState<Record<string, unknown>>({});

  // Transformer
  const [tModel, setTModel] = React.useState("distilbert");
  const [textColumn, setTextColumn] = React.useState("");
  const [epochs, setEpochs] = React.useState(1);
  const [maxLen, setMaxLen] = React.useState(128);
  const [batch, setBatch] = React.useState(8);

  const [error, setError] = React.useState<string | null>(null);
  const [launching, setLaunching] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      listDatasets(),
      getAlgorithms(),
      getTransformerModels(),
      getHardware(),
    ]).then(([ds, algos, tms, hw]) => {
      setDatasets(ds);
      setAlgorithms(algos);
      setTModels(tms.length ? tms : []);
      setHardware(hw);
      if (!datasetId && ds[0]) setDatasetId(ds[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!datasetId) return;
    getDataset(datasetId).then((d) => {
      setColumns(d.columns);
      const last = d.columns[d.columns.length - 1]?.name ?? "";
      setTarget(last);
      setFeatures(d.columns.map((c) => c.name).filter((c) => c !== last));
      // Default the text column to the first string column, else the first.
      const firstText =
        d.columns.find((c) => c.dtype === "string" && c.name !== last)?.name ??
        d.columns.find((c) => c.name !== last)?.name ??
        "";
      setTextColumn(firstText);
    });
  }, [datasetId]);

  const algoList: AlgorithmSpec[] = algorithms?.[task] ?? [];
  const currentAlgo = algoList.find((a) => a.key === algorithm) ?? algoList[0];

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
    if (!target) return setError("Choose a target/label column.");

    setLaunching(true);
    setError(null);
    try {
      const common = { name: name || undefined, target_column: target, test_size: testSize };
      const body =
        family === "transformer"
          ? {
              ...common,
              family: "transformer",
              task_type: "classification",
              algorithm: tModel,
              feature_columns: [textColumn],
              hyperparameters: {
                num_epochs: epochs,
                max_length: maxLen,
                batch_size: batch,
              },
            }
          : {
              ...common,
              family: "classical",
              task_type: task,
              algorithm: currentAlgo.key,
              feature_columns: features.filter((f) => f !== target),
              hyperparameters: hyperparams,
            };
      if (family === "transformer" && (!textColumn || textColumn === target)) {
        throw new Error("Pick a text column that differs from the label.");
      }
      if (family === "classical" && body.feature_columns.length === 0) {
        throw new Error("Select at least one feature.");
      }
      const exp = await launchExperiment(datasetId, body);
      router.push(`/training/${exp.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start training.");
      setLaunching(false);
    }
  }

  const noDatasets = datasets.length === 0;
  const modelOptions = tModels.length
    ? tModels
    : [
        { key: "distilbert", label: "DistilBERT" },
        { key: "bert", label: "BERT" },
        { key: "roberta", label: "RoBERTa" },
      ];

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
          {/* Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Method</CardTitle>
              <CardDescription>Classical ML or transformer fine-tuning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="inline-flex rounded-lg border p-0.5 text-sm">
                <MethodTab active={family === "classical"} onClick={() => setFamily("classical")}>
                  Classical ML
                </MethodTab>
                <MethodTab active={family === "transformer"} onClick={() => setFamily("transformer")}>
                  Transformer
                </MethodTab>
              </div>
              {family === "transformer" && <HardwareBadge hardware={hardware} />}
            </CardContent>
          </Card>

          {/* Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data</CardTitle>
              <CardDescription>
                {family === "transformer"
                  ? "Dataset, text column, and label"
                  : "Dataset, target, and features"}
              </CardDescription>
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
                  <Label htmlFor="target">
                    {family === "transformer" ? "Label column" : "Target column"}
                  </Label>
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

              {family === "transformer" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="text-col">Text column</Label>
                  <select
                    id="text-col"
                    value={textColumn}
                    onChange={(e) => setTextColumn(e.target.value)}
                    className={SELECT_CLASS}
                  >
                    {columns
                      .filter((c) => c.name !== target)
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dtype})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>

          {/* Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model</CardTitle>
              <CardDescription>
                {family === "transformer"
                  ? "Base model and fine-tuning settings"
                  : "Task, algorithm, and hyperparameters"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {family === "transformer" ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="tmodel">Base model</Label>
                    <select
                      id="tmodel"
                      value={tModel}
                      onChange={(e) => setTModel(e.target.value)}
                      className={SELECT_CLASS}
                    >
                      {modelOptions.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <NumberField label="Epochs" value={epochs} min={1} max={10} onChange={setEpochs} />
                    <NumberField label="Max length" value={maxLen} min={16} max={512} onChange={setMaxLen} />
                    <NumberField label="Batch size" value={batch} min={1} max={64} onChange={setBatch} />
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Test split"
                  value={testSize}
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  onChange={setTestSize}
                />
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

function MethodTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function HardwareBadge({ hardware }: { hardware: Hardware | null }) {
  if (!hardware) return null;
  if (hardware.gpu) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        <Zap className="h-4 w-4" />
        Training on GPU: {hardware.device_name}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
      <Cpu className="h-4 w-4" />
      No GPU detected — training runs on CPU and will be slow. Start with
      DistilBERT, 1 epoch, and a small dataset.
    </p>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

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
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </div>
  );
}
