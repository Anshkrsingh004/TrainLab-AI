# Development guide

## Prerequisites

- Docker & Docker Compose (recommended path), **or**
- Python 3.11+ and Node.js 20+ for running services directly.

## Running the full stack (Docker)

```bash
cp .env.example .env
docker compose up --build
```

| Service    | URL                              |
| ---------- | -------------------------------- |
| Frontend   | http://localhost:3000            |
| Backend    | http://localhost:8000            |
| API docs   | http://localhost:8000/docs       |
| Health     | http://localhost:8000/api/v1/health |
| Postgres   | localhost:5432 (`trainlab` / `trainlab`) |
| Redis      | localhost:6379 *(placeholder)*   |

Stop with `docker compose down` (add `-v` to also drop the Postgres volume).

## Backend (standalone)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

- Config lives in `app/core/config.py` (typed, env-driven). Defaults target a
  local Postgres, but the health endpoint works even if the DB is down.
- Run tests: `pytest`
- Lint / format: `ruff check .` and `black .`

### Database migrations (Alembic)

No models exist yet, so there are no migrations. Once models are added:

```bash
cd backend
alembic revision --autogenerate -m "add <model>"
alembic upgrade head
```

## Frontend (standalone)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

- `NEXT_PUBLIC_API_URL` points the app at the backend (default
  `http://localhost:8000`).
- Add shadcn/ui components into `components/ui/`.

## Conventions

- API is versioned under `/api/v1`.
- Keep endpoints thin — business logic belongs in `app/services/`.
- Every new ORM model uses the `UUIDMixin` / `TimestampMixin` base mixins and is
  imported in `app/db/base.py` so Alembic can see it.
