# Architecture

TrainLab AI is a **monorepo** with a clear split between a Next.js frontend and
a FastAPI backend, backed by PostgreSQL. The guiding principle is that the
platform should grow across three releases **without major rewrites**.

## High-level

```
┌────────────┐        HTTP / JSON        ┌────────────┐        ┌────────────┐
│  Frontend  │  ───────────────────────▶ │  Backend   │ ─────▶ │ PostgreSQL │
│  Next.js   │   /api/v1/...             │  FastAPI   │        │            │
└────────────┘                           └────────────┘        └────────────┘
                                               │
                                               ▼ (reserved)
                                         ┌────────────┐
                                         │   Redis    │  ← Release 2
                                         └────────────┘
```

## Backend layout

```
app/
├── main.py          # App factory: CORS, router mounting, lifespan
├── api/
│   ├── deps.py       # Shared dependencies (get_db; future: auth)
│   └── v1/           # Versioned API surface
│       ├── router.py
│       └── endpoints/
├── core/            # config (typed settings), logging
├── db/              # Declarative base, mixins, engine/session
├── models/          # ORM models (empty in M1)
├── schemas/         # Pydantic request/response models
├── services/        # Business logic (empty in M1)
└── worker/          # Reserved for Release 2 (Celery)
```

## Decisions that enable future growth

- **Versioned API (`/api/v1`) from day one.** New versions can be added without
  breaking existing clients.
- **Base model mixins** (`UUIDMixin`, `TimestampMixin`) give every future table
  a consistent identity and audit fields.
- **Service layer** keeps endpoints thin; training/dataset logic lands in
  `services/` in later milestones.
- **`worker/` reserved** so Release 2's Celery queue drops in without moving
  files around.
- **Redis configured but unused.** `REDIS_URL` exists in settings and compose;
  no code connects to it in Release 1. This is a deliberate placeholder.
- **Alembic wired** to the app's settings and model registry, ready for the
  first real migration when models arrive.

## What is intentionally NOT here (yet)

Per the project's release discipline, **no future-release functionality is
implemented early.** Authentication, datasets, training engines, experiment
tracking, MLflow, background jobs, and AutoML are designed-for but not built in
Milestone 1.
