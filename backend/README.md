# MK Service — Backend

FastAPI + PostgreSQL + Redis/RQ

## Setup

```bash
# From repo root
docker compose up -d

cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

uvicorn app.main:app --reload --port 8000

# Migrations DB
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

# API
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health
