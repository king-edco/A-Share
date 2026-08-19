# A-Share

Monorepo for an exam-preparation web application with an admin side and a student side.
This repository currently contains only the backend scaffolding — no business logic, data models, or authentication yet.

## Quick Start

1. Make sure [Docker](https://docs.docker.com/get-docker/) and Docker Compose are installed.

2. Start all services from the `infra/` directory:

   ```bash
   cd infra
   docker compose up --build
   ```

   This builds the API image, starts a PostgreSQL 16 database, and runs the FastAPI server on port 8000.

3. Verify the API is healthy:

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

## Linting and Testing

```bash
cd apps/api
ruff check .
pytest
```