"""Classical-ML building blocks: algorithm registry, estimators, preprocessing,
and metrics.

The registry (ALGO_SPECS) is the single source of truth for which algorithms and
hyperparameters exist per task type — the training form is generated from it and
the estimator builder consumes it.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVC, SVR
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from xgboost import XGBClassifier, XGBRegressor

# ── Hyperparameter specs (shared with the frontend form) ──────────

_INT = "int"
_FLOAT = "float"
_SELECT = "select"

_HP_N_ESTIMATORS = {
    "name": "n_estimators",
    "label": "Trees",
    "type": _INT,
    "default": 100,
    "min": 10,
    "max": 1000,
}
_HP_MAX_DEPTH = {
    "name": "max_depth",
    "label": "Max depth",
    "type": _INT,
    "default": None,
    "min": 1,
    "max": 100,
    "optional": True,
}
_HP_LR = {
    "name": "learning_rate",
    "label": "Learning rate",
    "type": _FLOAT,
    "default": 0.3,
    "min": 0.001,
    "max": 1,
}
_HP_C = {
    "name": "C",
    "label": "Regularization (C)",
    "type": _FLOAT,
    "default": 1.0,
    "min": 0.001,
    "max": 1000,
}
_HP_KERNEL = {
    "name": "kernel",
    "label": "Kernel",
    "type": _SELECT,
    "default": "rbf",
    "options": ["linear", "rbf", "poly", "sigmoid"],
}
_HP_K = {
    "name": "n_neighbors",
    "label": "Neighbors (k)",
    "type": _INT,
    "default": 5,
    "min": 1,
    "max": 50,
}

ALGO_SPECS: dict[str, list[dict[str, Any]]] = {
    "classification": [
        {
            "key": "logistic_regression",
            "label": "Logistic Regression",
            "hyperparameters": [
                _HP_C,
                {
                    "name": "max_iter",
                    "label": "Max iterations",
                    "type": _INT,
                    "default": 1000,
                    "min": 100,
                    "max": 5000,
                },
            ],
        },
        {
            "key": "random_forest",
            "label": "Random Forest",
            "hyperparameters": [_HP_N_ESTIMATORS, _HP_MAX_DEPTH],
        },
        {
            "key": "xgboost",
            "label": "XGBoost",
            "hyperparameters": [
                _HP_N_ESTIMATORS,
                {**_HP_MAX_DEPTH, "default": 6, "optional": False},
                _HP_LR,
            ],
        },
        {"key": "svm", "label": "SVM", "hyperparameters": [_HP_C, _HP_KERNEL]},
        {"key": "knn", "label": "K-Nearest Neighbors", "hyperparameters": [_HP_K]},
        {
            "key": "decision_tree",
            "label": "Decision Tree",
            "hyperparameters": [
                _HP_MAX_DEPTH,
                {
                    "name": "criterion",
                    "label": "Criterion",
                    "type": _SELECT,
                    "default": "gini",
                    "options": ["gini", "entropy", "log_loss"],
                },
            ],
        },
    ],
    "regression": [
        {"key": "linear_regression", "label": "Linear Regression", "hyperparameters": []},
        {
            "key": "random_forest",
            "label": "Random Forest",
            "hyperparameters": [_HP_N_ESTIMATORS, _HP_MAX_DEPTH],
        },
        {
            "key": "xgboost",
            "label": "XGBoost",
            "hyperparameters": [
                _HP_N_ESTIMATORS,
                {**_HP_MAX_DEPTH, "default": 6, "optional": False},
                _HP_LR,
            ],
        },
        {"key": "svm", "label": "SVM", "hyperparameters": [_HP_C, _HP_KERNEL]},
        {"key": "knn", "label": "K-Nearest Neighbors", "hyperparameters": [_HP_K]},
        {"key": "decision_tree", "label": "Decision Tree", "hyperparameters": [_HP_MAX_DEPTH]},
    ],
}


def algorithm_keys(task: str) -> set[str]:
    return {a["key"] for a in ALGO_SPECS.get(task, [])}


def _opt_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    return int(value)


def build_estimator(task: str, algorithm: str, hp: dict[str, Any]):
    if task == "classification":
        match algorithm:
            case "logistic_regression":
                return LogisticRegression(
                    C=float(hp.get("C", 1.0)), max_iter=int(hp.get("max_iter", 1000))
                )
            case "random_forest":
                return RandomForestClassifier(
                    n_estimators=int(hp.get("n_estimators", 100)),
                    max_depth=_opt_int(hp.get("max_depth")),
                    random_state=42,
                    n_jobs=-1,
                )
            case "xgboost":
                return XGBClassifier(
                    n_estimators=int(hp.get("n_estimators", 100)),
                    max_depth=int(hp.get("max_depth", 6)),
                    learning_rate=float(hp.get("learning_rate", 0.3)),
                    eval_metric="logloss",
                    random_state=42,
                    verbosity=0,
                )
            case "svm":
                return SVC(C=float(hp.get("C", 1.0)), kernel=hp.get("kernel", "rbf"))
            case "knn":
                return KNeighborsClassifier(n_neighbors=int(hp.get("n_neighbors", 5)))
            case "decision_tree":
                return DecisionTreeClassifier(
                    max_depth=_opt_int(hp.get("max_depth")),
                    criterion=hp.get("criterion", "gini"),
                    random_state=42,
                )
    else:
        match algorithm:
            case "linear_regression":
                return LinearRegression()
            case "random_forest":
                return RandomForestRegressor(
                    n_estimators=int(hp.get("n_estimators", 100)),
                    max_depth=_opt_int(hp.get("max_depth")),
                    random_state=42,
                    n_jobs=-1,
                )
            case "xgboost":
                return XGBRegressor(
                    n_estimators=int(hp.get("n_estimators", 100)),
                    max_depth=int(hp.get("max_depth", 6)),
                    learning_rate=float(hp.get("learning_rate", 0.3)),
                    random_state=42,
                    verbosity=0,
                )
            case "svm":
                return SVR(C=float(hp.get("C", 1.0)), kernel=hp.get("kernel", "rbf"))
            case "knn":
                return KNeighborsRegressor(n_neighbors=int(hp.get("n_neighbors", 5)))
            case "decision_tree":
                return DecisionTreeRegressor(
                    max_depth=_opt_int(hp.get("max_depth")), random_state=42
                )
    raise ValueError(f"Unknown algorithm '{algorithm}' for task '{task}'")


def build_preprocessor(numeric: list[str], categorical: list[str]) -> ColumnTransformer:
    transformers = []
    if numeric:
        transformers.append(
            (
                "num",
                Pipeline(
                    [("impute", SimpleImputer(strategy="median")), ("scale", StandardScaler())]
                ),
                numeric,
            )
        )
    if categorical:
        transformers.append(
            (
                "cat",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                    ]
                ),
                categorical,
            )
        )
    return ColumnTransformer(transformers, remainder="drop")


# ── Metrics ───────────────────────────────────────────────────────


def classification_metrics(y_true, y_pred, labels) -> dict[str, Any]:
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(
            float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4
        ),
        "recall": round(
            float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4
        ),
        "f1": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "labels": [str(x) for x in labels],
        "confusion_matrix": cm.tolist(),
    }


def regression_metrics(y_true, y_pred) -> dict[str, Any]:
    mse = float(mean_squared_error(y_true, y_pred))
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "mse": round(mse, 4),
        "rmse": round(float(np.sqrt(mse)), 4),
    }


def feature_importances(pipeline: Pipeline) -> list[dict[str, Any]] | None:
    """Top feature importances / coefficients, if the estimator exposes them."""
    try:
        pre = pipeline.named_steps["pre"]
        names = [_clean_name(n) for n in pre.get_feature_names_out()]
        est = pipeline.named_steps["est"]
        if hasattr(est, "feature_importances_"):
            vals = np.asarray(est.feature_importances_, dtype=float)
        elif hasattr(est, "coef_"):
            coef = np.abs(np.asarray(est.coef_, dtype=float))
            vals = coef.mean(axis=0) if coef.ndim > 1 else coef
        else:
            return None
        pairs = sorted(zip(names, vals, strict=False), key=lambda x: x[1], reverse=True)[:15]
        return [{"feature": n, "importance": round(float(v), 4)} for n, v in pairs]
    except Exception:  # noqa: BLE001 — importances are best-effort
        return None


def _clean_name(name: str) -> str:
    for prefix in ("num__", "cat__"):
        if name.startswith(prefix):
            return name[len(prefix) :]
    return name
