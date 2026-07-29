"""Transformer fine-tuning (HuggingFace) for text classification.

Kept separate from the classical path and imported lazily, so torch/transformers
are only loaded when a transformer run actually executes. Progress and
cancellation are driven by a TrainerCallback. The fitted model + tokenizer are
saved as a checkpoint directory for later download.
"""

from __future__ import annotations

import os
import time
from datetime import UTC, datetime

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from app.core import storage
from app.core.config import settings
from app.models.dataset import Dataset
from app.models.experiment import Experiment
from app.services.training_service import (
    TrainingError,
    _can_stratify,
    _mark_cancelled,
    _mark_failed,
)

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

# Fine-tunable models (roadmap: BERT, DistilBERT, RoBERTa).
MODELS: dict[str, dict[str, str]] = {
    "distilbert": {"label": "DistilBERT", "hf": "distilbert-base-uncased"},
    "bert": {"label": "BERT", "hf": "bert-base-uncased"},
    "roberta": {"label": "RoBERTa", "hf": "roberta-base"},
}

_hardware: dict | None = None


def hardware_info() -> dict:
    """Detect the training device (cached). Lazily imports torch."""
    global _hardware
    if _hardware is None:
        try:
            import torch

            gpu = torch.cuda.is_available()
            _hardware = {
                "gpu": gpu,
                "device": "cuda" if gpu else "cpu",
                "device_name": torch.cuda.get_device_name(0) if gpu else "CPU",
                "torch_version": torch.__version__,
            }
        except Exception:  # noqa: BLE001
            _hardware = {
                "gpu": False,
                "device": "cpu",
                "device_name": "CPU",
                "torch_version": None,
            }
    return _hardware


def execute_transformer_training(db: Session, exp: Experiment, cancel_event=None) -> None:
    import tempfile

    import torch
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
    )
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder
    from transformers import (
        AutoModelForSequenceClassification,
        AutoTokenizer,
        Trainer,
        TrainerCallback,
        TrainingArguments,
    )

    start = time.time()

    def cancelled() -> bool:
        return cancel_event is not None and cancel_event.is_set()

    def stage(name: str, progress: int) -> None:
        exp.stage = name
        exp.progress = progress
        db.commit()

    try:
        exp.status = "running"
        exp.started_at = datetime.now(UTC)
        stage("Loading data", 3)
        if cancelled():
            return _mark_cancelled(db, exp)

        hf_name = MODELS[exp.algorithm]["hf"]
        text_col = exp.feature_columns[0]
        label_col = exp.target_column
        hp = exp.hyperparameters or {}
        epochs = int(hp.get("num_epochs", 1))
        max_len = int(hp.get("max_length", 128))
        batch = int(hp.get("batch_size", 8))

        dataset = db.get(Dataset, exp.dataset_id)
        path = storage.full_path(dataset.file_path)
        df = pd.read_csv(path) if dataset.file_type == "csv" else pd.read_json(path)
        df = df[[text_col, label_col]].dropna()
        if df.empty:
            raise TrainingError("No rows have both a text value and a label.")
        if len(df) > settings.MAX_TRANSFORMER_ROWS:
            df = df.sample(n=settings.MAX_TRANSFORMER_ROWS, random_state=42).reset_index(drop=True)

        texts = df[text_col].astype(str).tolist()
        encoder = LabelEncoder()
        labels = encoder.fit_transform(df[label_col].astype(str))
        num_labels = int(len(encoder.classes_))
        if num_labels < 2:
            raise TrainingError("The label column needs at least two classes.")

        stage("Tokenizing", 8)
        if cancelled():
            return _mark_cancelled(db, exp)
        tokenizer = AutoTokenizer.from_pretrained(hf_name)
        strat = labels if _can_stratify(labels) else None
        x_train, x_test, y_train, y_test = train_test_split(
            texts, labels, test_size=exp.test_size, random_state=42, stratify=strat
        )
        train_enc = tokenizer(x_train, truncation=True, padding=True, max_length=max_len)
        test_enc = tokenizer(x_test, truncation=True, padding=True, max_length=max_len)

        class _TextDataset(torch.utils.data.Dataset):
            def __init__(self, enc, y):
                self.enc = enc
                self.y = y

            def __len__(self):
                return len(self.y)

            def __getitem__(self, i):
                item = {k: torch.tensor(v[i]) for k, v in self.enc.items()}
                item["labels"] = torch.tensor(int(self.y[i]))
                return item

        train_ds = _TextDataset(train_enc, y_train)
        test_ds = _TextDataset(test_enc, y_test)

        stage("Loading model", 12)
        if cancelled():
            return _mark_cancelled(db, exp)
        model = AutoModelForSequenceClassification.from_pretrained(hf_name, num_labels=num_labels)

        steps_per_epoch = max(1, -(-len(train_ds) // batch))  # ceil division
        total_steps = steps_per_epoch * epochs

        class _ProgressCallback(TrainerCallback):
            def __init__(self):
                self.last = 0

            def on_step_end(self, args, state, control, **kwargs):
                if cancelled():
                    control.should_training_stop = True
                    return control
                pct = 12 + int(78 * state.global_step / total_steps)
                if pct - self.last >= 2:
                    self.last = pct
                    exp.progress = pct
                    exp.stage = f"Training (epoch {int(state.epoch) + 1}/{epochs})"
                    db.commit()
                return control

        args = TrainingArguments(
            output_dir=tempfile.mkdtemp(),
            num_train_epochs=epochs,
            per_device_train_batch_size=batch,
            per_device_eval_batch_size=batch,
            logging_strategy="no",
            save_strategy="no",
            report_to=[],
            disable_tqdm=True,
            dataloader_num_workers=0,
        )
        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=train_ds,
            callbacks=[_ProgressCallback()],
        )

        stage("Training", 15)
        trainer.train()
        if cancelled():
            return _mark_cancelled(db, exp)

        stage("Evaluating", 92)
        preds = trainer.predict(test_ds)
        y_pred = np.argmax(preds.predictions, axis=1)
        label_idx = list(range(num_labels))
        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(
                float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
                4,
            ),
            "recall": round(
                float(recall_score(y_test, y_pred, average="weighted", zero_division=0)),
                4,
            ),
            "f1": round(
                float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
                4,
            ),
            "labels": [str(c) for c in encoder.classes_],
            "confusion_matrix": confusion_matrix(y_test, y_pred, labels=label_idx).tolist(),
            "n_train": int(len(y_train)),
            "n_test": int(len(y_test)),
            "device": hardware_info()["device"],
            "base_model": hf_name,
        }

        stage("Saving checkpoint", 96)
        model_dir = storage.experiment_model_dir(exp.id)
        trainer.save_model(str(model_dir))
        tokenizer.save_pretrained(str(model_dir))
        exp.model_path = storage.experiment_model_reldir(exp.id)

        exp.metrics = metrics
        exp.status = "completed"
        exp.progress = 100
        exp.stage = "Done"
        exp.finished_at = datetime.now(UTC)
        exp.duration_ms = int((time.time() - start) * 1000)
        db.commit()
    except TrainingError as exc:
        _mark_failed(db, exp, str(exc), start)
    except Exception as exc:  # noqa: BLE001
        _mark_failed(db, exp, f"Training failed: {type(exc).__name__}", start)
