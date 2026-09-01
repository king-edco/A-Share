# A-Share

Exam-revision PWA for Cameroonian exams (GCE O-Level/A-Level, Probatoire/Baccalauréat).

## Tech Stack

- **Backend**: FastAPI (Python 3.12) + SQLAlchemy + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Migrations**: Alembic
- **Containerization**: Docker Compose

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local dev without Docker)
- Node.js 20+ (for local dev without Docker)

### With Docker (recommended)

```bash
# Clone and start
git clone <repo-url>
cd A-Share
cp .env.example .env
docker compose up --build

# Run migrations
docker compose exec backend alembic upgrade head
```

- Backend API: http://localhost:8000
- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs

### Without Docker

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Project Structure

```
A-Share/
├── backend/
│   ├── app/
│   │   ├── core/          # Config, DB, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── routers/       # API endpoints
│   │   └── main.py        # FastAPI app
│   ├── alembic/           # Database migrations
│   └── Dockerfile
├── frontend/
│   ├── src/app/           # Next.js App Router pages
│   ├── public/            # Static assets, PWA manifest
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API Endpoints

### Auth

| Method | Endpoint              | Description            |
| ------ | --------------------- | ---------------------- |
| POST   | `/api/auth/signup`    | Student signup         |
| POST   | `/api/auth/login`     | Student login          |
| GET    | `/api/auth/me`        | Get current student    |
| POST   | `/api/admin/invite`   | Invite admin           |
| POST   | `/api/admin/register` | Register via invite    |
| POST   | `/api/admin/login`    | Admin login            |
| GET    | `/api/admin/me`       | Get current admin      |

## Development

```bash
# Backend lint
cd backend && ruff check . && ruff format .

# Frontend lint
cd frontend && npm run lint

# Type check
cd frontend && npm run typecheck
```
