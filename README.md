<div align="center">

# TrainLab AI

**The Modern AI Training & MLOps Platform**

Train classical ML and transformer models, track experiments, and manage
datasets — all from one beautiful workspace.

</div>

---

> **Status:** Release 1 · Milestone 2 — **Authentication** ✅
> Backend-owned Google & GitHub OAuth with a stateless JWT session cookie,
> protected routes, a user profile, and logout — on the scalable Next.js +
> FastAPI + PostgreSQL foundation from Milestone 1.

## Tech stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Frontend         | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend          | FastAPI, Python 3.11, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| Database         | PostgreSQL 16                                |
| Cache / Queue    | Redis 7 *(configured, reserved for Release 2)* |
| Orchestration    | Docker & Docker Compose                      |

## Quick start (Docker)

The fastest way to run the whole stack:

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- **Frontend:** http://localhost:3000 — landing page shows a live backend status
- **API docs:** http://localhost:8000/docs
- **Health:** http://localhost:8000/api/v1/health

## Local development (without Docker)

**Backend**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Authentication

Sign in with **Google** or **GitHub**. The backend owns the OAuth flow, upserts
the user in Postgres, and issues a stateless JWT in an httpOnly cookie; Next.js
proxies `/api/*` to the backend so everything is same-origin. Protected pages
(e.g. `/dashboard`) redirect to `/login` when unauthenticated.

To enable live login you must register OAuth apps and add credentials to `.env`
— see **[`docs/AUTH_SETUP.md`](docs/AUTH_SETUP.md)**. Without credentials the app
still runs; the provider buttons are simply disabled.

## Project structure

```
TrainLab-AI/
├── backend/      # FastAPI service (versioned API, DB layer, tests)
├── frontend/     # Next.js app (Tailwind + shadcn/ui)
├── docker/       # Service bootstrap (Postgres init)
├── docs/         # Architecture, roadmap, development guide
└── docker-compose.yml
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design and
[`docs/ROADMAP.md`](docs/ROADMAP.md) for the full three-release plan.

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## License

[MIT](LICENSE) © Ansh Kumar
