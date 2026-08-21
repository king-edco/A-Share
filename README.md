# A-Share

Exam-preparation platform for Cameroon (Baccalauréat, Probatoire, GCE A Level, GCE O Level, TVE), with an **admin console** for content management and a **student PWA** for exam preparation.

## What's built

**Backend** — FastAPI (async SQLAlchemy 2.0, Alembic, PostgreSQL 16)
- **Catalog models** — Exam (FR/EN), Series (self-referencing hierarchy, closed vs suggested subject pools), Subject, SeriesSubject (coefficient, compulsory, category), Chapter (self-referencing)
- **Admin auth** — email + password, bcrypt hashing, JWT access (15 min) and refresh (7 days) tokens
- **RBAC** — roles (`super_admin`, `content_manager`, `contributor`) with permissions and `system_scope` (FR / EN / BOTH) enforcement on every catalog write
- **Invitations** — one-time hashed-token invites to create admin accounts; contributor accounts are granted access to specific subjects only via `AdminSubjectGrant`
- **Student auth** — phone number (E.164 normalized) + self-chosen PIN, fully separate from admin tokens via an `actor_type` claim; single-shot registration with subject-pool validation

**Frontend** — React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, PWA (service worker + manifest), React Query for state, dark/light theme
- Admin console: role-adaptive sidebar and dashboards (super_admin sees account stats, contributors see only their subjects), full CRUD for exams/series/subjects/chapters with optimistic updates, admin account management and invite dialog

**Infrastructure** — Docker Compose (PostgreSQL + API + nginx-served web with an `/api` reverse proxy), GitHub Actions for API (ruff + pytest) and web (ESLint + vitest + build) on every push and PR

## Quick Start

1. Make sure [Docker](https://docs.docker.com/get-docker/) and Docker Compose are installed.

2. Start all services from the `infra/` directory:

   ```bash
   cd infra
   docker compose up --build
   ```

   This builds and starts three services:

   - `db` — PostgreSQL 16
   - `api` — FastAPI backend on port 8000
   - `web` — student-facing web app (React + Vite build, served by nginx) on port 5173

3. Open the web app in your browser:

   ```
   http://localhost:5173
   ```

   The page calls the API health endpoint and displays **"Backend: ok"** when the
   API is reachable, or **"Backend: unreachable"** otherwise. The web container
   proxies API calls from `/api/*` to the `api` service, so no CORS setup is needed.

4. You can also verify the API directly:

   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"ok"}
   ```

## Project Structure

```
apps/api/          FastAPI backend service
  app/main.py      Application entrypoint
  app/core/        Config, security (JWT/bcrypt), auth deps
  app/models/      SQLAlchemy ORM models
  app/schemas/     Pydantic request/response schemas
  app/api/v1/      HTTP endpoint routers (auth, catalog, admin, students, invitations)
  app/services/    Business logic (subject pool, admin safety, phone normalization)
  app/db/migrations/ Alembic migration scripts
  tests/           Pytest test suite (auth, catalog, invitations, students, admin accounts)
apps/web/          React 18 + TypeScript frontend (Vite + Tailwind CSS + shadcn/ui, PWA)
  src/main.tsx     Entrypoint
  src/App.tsx      Router + providers (React Query, theme)
  src/features/    auth, admin (dashboard, exams, series, subjects, chapters, accounts)
  src/components/  Shared UI (EmptyState, ErrorState, TableSkeleton, ConfirmDeleteDialog, shadcn/ui)
  src/lib/         API client, optimistic-mutation helper, query client, theme, version
  src/routes/      Route definitions
  public/          Web app manifest and PWA icons
  nginx.conf       Static hosting + /api reverse proxy
infra/             Docker Compose and infrastructure config
specs/             OpenAPI specs and design documents
```

## Running Migrations

Inside the API container:

```bash
docker compose -f infra/docker-compose.yml exec api alembic upgrade head
```

## Development (Local)

If you prefer to run the API outside Docker for faster iteration:

```bash
cd apps/api
python -m venv .venv
source .venv/Scripts/activate  # Git Bash on Windows
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Make sure a PostgreSQL 16 instance is reachable and set `DATABASE_URL` in a local `.env` file (see `.env.example`).

### Web (apps/web)

The web app is a standard Vite project. For local frontend development:

```bash
cd apps/web
npm install
cp .env.example .env   # VITE_API_URL defaults to http://localhost:8000
npm run dev
```

Lint and build:

```bash
npm run lint
npm run build
```

Note: when running the dev server against a local API on port 8000, the browser
makes a cross-origin request. In the Docker Compose stack this is avoided by the
web container's nginx proxy (`/api/*` -> `api:8000`), which is why the Compose
build bakes in `VITE_API_URL=/api`.

## Running Backend Tests

```bash
cd apps/api
python -m ruff check .
python -m pytest
```

The test suite covers catalog endpoints, admin auth + RBAC, invitations,
admin accounts, and student registration/auth. It runs on an isolated
SQLite database (no Postgres needed) and is hermetic with respect to
environment variables.