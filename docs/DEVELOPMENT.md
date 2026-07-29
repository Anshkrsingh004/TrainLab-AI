# Development guide

## Prerequisites

- Docker & Docker Compose (recommended path), **or**
- Python 3.12+ and Node.js 20+ to run the services directly.

## Running the full stack (Docker)

```bash
cp .env.example .env      # set SECRET_KEY; add OAuth creds if you want sign-in
docker compose up --build
```

| Service    | URL                                 |
| ---------- | ----------------------------------- |
| Frontend   | http://localhost:3000               |
| Backend    | http://localhost:8000               |
| API docs   | http://localhost:8000/docs          |
| Postgres   | localhost:5432 (`trainlab`/`trainlab`) |
| Redis      | localhost:6379 *(placeholder)*      |

Migrations run automatically when the backend container starts. Uploaded
datasets, model checkpoints, and the HuggingFace cache persist in named volumes.
Stop with `docker compose down` (add `-v` to drop volumes).

> The backend image bundles PyTorch + Transformers, so the **first build is
> large (a few GB) and takes several minutes**. That's inherent to an ML
> platform.

## Backend (standalone)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate  |  macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # defaults to a local sqlite DB
alembic upgrade head
uvicorn app.main:app --reload
```

- Config: `app/core/config.py` (typed, env-driven). A full `DATABASE_URL`
  overrides the composed Postgres URL — the default is a local `sqlite:///` file,
  which needs no server.
- Tests: `pytest` · Lint/format: `ruff check .` and `black .`

### GPU (optional)

`requirements.txt` pins the **CPU** build of PyTorch for portability. On a
machine with an NVIDIA GPU + CUDA driver, install the CUDA build instead:

```bash
pip install torch==2.5.1+cu121 --index-url https://download.pytorch.org/whl/cu121
```

The app detects the GPU automatically (`/api/v1/experiments/hardware`), and
transformer fine-tuning will use it.

### Database migrations (Alembic)

```bash
cd backend
alembic revision --autogenerate -m "add <thing>"   # create
alembic upgrade head                                 # apply
```

## Frontend (standalone)

```bash
cd frontend
npm install
npm run dev          # dev server (proxies /api/* to the backend)
npm test             # Vitest unit tests
npm run build        # type-check + lint + production build
```

`BACKEND_URL` (server-side) points the proxy at the backend — defaults to
`http://localhost:8000` locally, `http://backend:8000` in Docker.

## Conventions

- API is versioned under `/api/v1`; endpoints stay thin — logic lives in
  `app/services/`.
- Every ORM model uses the UUID / timestamp mixins and is imported in
  `app/db/base.py` so Alembic can see it.
- All resources are owner-scoped through their parent project.
