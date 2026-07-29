# Architecture

TrainLab AI is a **monorepo** with a Next.js frontend and a FastAPI backend,
backed by PostgreSQL. The guiding principle: grow across three releases
**without major rewrites**.

## High level

```
┌────────────┐   /api/* (same-origin, proxied)   ┌────────────┐      ┌────────────┐
│  Frontend  │ ────────────────────────────────▶ │  Backend   │ ───▶ │ PostgreSQL │
│  Next.js   │   session cookie (JWT)            │  FastAPI   │      │            │
└────────────┘                                    └─────┬──────┘      └────────────┘
                                                        │ writes files
                                                        ▼
                                                  ┌────────────┐   ┌────────────┐
                                                  │  Storage   │   │   Redis    │
                                                  │ (datasets, │   │ (reserved  │
                                                  │  models)   │   │  for R2)   │
                                                  └────────────┘   └────────────┘
```

The browser only ever talks to the Next.js origin; `/api/*` is proxied to the
backend server-side, so the session cookie is same-origin.

## Backend layout

```
app/
├── main.py            # App factory: CORS, session middleware, router mounting
├── api/
│   ├── deps.py         # get_db, get_current_user (protects routes)
│   └── v1/             # Versioned API surface
│       ├── router.py
│       └── endpoints/  # health, auth, projects, datasets, experiments
├── core/              # config (typed settings), security (JWT), oauth, storage, logging
├── db/                # declarative base + mixins (UUID, timestamps), engine/session
├── models/            # user, project, dataset, experiment
├── schemas/           # Pydantic request/response models
├── services/          # business logic:
│   ├── auth_service, project_service, dataset_service
│   ├── ml.py           # classical algorithm registry, sklearn pipeline, metrics
│   ├── training_service # orchestration: create + execute (threaded) + cancel
│   └── transformer_service  # HuggingFace fine-tuning (lazy-imported)
└── worker/            # reserved for Release 2 (Celery)
```

## Key entities

- **User** — created on first OAuth sign-in; accounts keyed by email.
- **Project** — top-level container, owned by a user.
- **Dataset** — belongs to a project; stores the file plus detected schema,
  statistics, and a capped preview (computed once at upload).
- **Experiment** — a training run (classical or transformer, via a `family`
  flag); holds config, live status/progress, metrics, and the saved-model path.

Every model uses UUID primary keys and created/updated timestamps. All data is
**owner-scoped** — access is enforced through the parent project.

## Training pipeline

Training runs in an **in-process background thread** (Release 1) via a
queue-agnostic service: the API returns immediately and the client polls for
progress. Classical runs build an sklearn `Pipeline` (impute → one-hot → scale →
estimator); transformer runs use the HuggingFace `Trainer` with a callback for
progress and cancellation, and use the GPU automatically when available. The
trained artifact is saved to storage for later download.

> Release 2 swaps the thread for a **Celery** task with **Redis** — the training
> logic is unchanged, which is why the service is queue-agnostic today.

## Decisions that enable future growth

- **Versioned API (`/api/v1`)** from day one.
- **Base model mixins** give every table a consistent identity + audit fields.
- **Service layer** keeps endpoints thin; ML lives in `ml.py` /
  `transformer_service`.
- **`worker/` reserved** and **Redis provisioned** for Release 2's queue.
- **Storage abstraction** (`core/storage.py`) so object storage can replace the
  local filesystem later.
- **Heavy ML imports are lazy** — torch/transformers load only when a
  transformer run executes, keeping app boot fast.

## What is intentionally NOT here (yet)

Per the release discipline, no future-release functionality is built early:
background job queue (Celery/Redis), MLflow / model registry, REST API keys,
LoRA, hyperparameter search, AutoML, distributed training, and collaboration are
designed-for but not implemented in Release 1.
