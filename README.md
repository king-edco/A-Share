# A-Share

Monorepo for an exam-preparation web application with an admin side and a student side.
The repository currently contains only scaffolding: the FastAPI backend skeleton and the React frontend skeleton. No business logic, data models, or authentication yet.

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
  app/core/        Configuration and shared utilities
  app/models/      SQLAlchemy ORM models (empty for now)
  app/schemas/     Pydantic schemas (empty for now)
  app/api/v1/      HTTP endpoint routers
  app/services/    Business logic layer (empty for now)
  app/db/migrations/ Alembic migration scripts
  tests/           Pytest test suite
apps/web/          React 18 + TypeScript frontend (Vite + Tailwind CSS, PWA)
  src/main.tsx     Entrypoint (registers the service worker)
  src/App.tsx      Single status page calling the API health endpoint
  src/features/    Feature modules (empty for now)
  src/components/  Shared UI components (empty for now)
  src/lib/         Utilities and helpers (empty for now)
  src/routes/      Route definitions (empty for now)
  public/          Web app manifest and placeholder PWA icons
  nginx.conf       Static hosting + /api reverse proxy used by the web container
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

## Linting and Testing

```bash
cd apps/api
ruff check .
pytest
```