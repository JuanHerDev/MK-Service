# MK Service

Plataforma cloud para **auditar sistemas RAG** frente a **Prompt Injection** (directo e indirecto) y **Data Leakage**.

Ejecuta campañas de ataque controladas contra el endpoint del cliente, genera **hallazgos priorizados**, **backlog de recomendaciones** e **informes PDF** (ejecutivo / técnico). Multi-organización (tenant), roles y automatización vía **API Keys**.

> **MVP v0.2** — circuito real de punta a punta (motor de probes + cola RQ + storage + PDF).

Documentación detallada:

| Documento | Contenido |
|-----------|-----------|
| [`backend/README.md`](backend/README.md) | API, migraciones, worker, mock RAG, storage |
| [`frontend/README.md`](frontend/README.md) | Next.js, rutas, auth, variables |

---

## Monorepo

| Ruta | Descripción |
|------|-------------|
| `backend/` | FastAPI, SQLAlchemy, Alembic, RQ, motor de ataque |
| `frontend/` | Next.js 16, React 19, Tailwind CSS v4 |
| `docs/` | SRS, arquitectura, investigación, parcial BD (SQL Server) |
| `docker-compose.yml` | postgres, redis, backend, worker, frontend |

---

## Stack

| Capa | Tecnología |
|------|------------|
| API | Python 3.12+, FastAPI, SQLAlchemy 2, Alembic |
| BD app | PostgreSQL 16 |
| Cola | Redis 7 + RQ |
| Auth | JWT (access + refresh), bcrypt, API Keys (`X-API-Key`) |
| Front | Next.js (App Router), TypeScript, Tailwind |
| PDF | reportlab |
| Contenedores | Docker Compose |

> La BD académica (SQL Server, tríada CID, 20 tablas en español) es un entregable aparte documentado en `docs/`. La app de producto usa **PostgreSQL** en inglés.

---

## Requisitos

- Docker Desktop (o Engine + Compose)
- Python 3.12+
- Node.js 20+
- Git

---

## Arranque rápido (desarrollo local)

### 1. Clonar

```bash
git clone <URL_DEL_REPO>
cd MK-Service
```

### 2. Variables de entorno

**No commits de `.env` con secretos.**

```bash
# Backend (obligatorio)
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local   # si existe; si no, crea el archivo

# Opcional: .env en la raíz para docker compose (POSTGRES_*, puertos)
```

**`backend/.env`** (uvicorn en el host + Postgres en Docker):

```env
DATABASE_URL=postgresql+psycopg2://mk_user:TU_PASSWORD@localhost:5432/mk_service
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(32))">
CAMPAIGN_ASYNC=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
STORAGE_PATH=storage
```

**`frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Alinea `POSTGRES_USER` / `PASSWORD` / `DB` entre raíz (Compose) y `DATABASE_URL`. Evita `?` `@` `#` en el password o codifícalos en la URL.

### 3. Infraestructura

```bash
docker compose up -d postgres redis
docker compose ps
docker exec mk_postgres pg_isready -U mk_user -d mk_service
```

### 4. Backend

```bash
cd backend
python -m venv venv

# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Linux / macOS
# source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python scripts/seed_catalogs.py
python scripts/ensure_payload_files.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Swagger: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  

### 5. Worker RQ (obligatorio si `CAMPAIGN_ASYNC=true`)

**Windows (lab):**

```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
rq worker mk_campaigns --url redis://localhost:6379/0 --worker-class app.workers.windows_worker.WindowsWorker
```

**Linux / macOS:**

```bash
cd backend && source venv/bin/activate
export PYTHONPATH=$(pwd)
rq worker mk_campaigns --url redis://localhost:6379/0
```

Debe mostrar: `*** Listening on mk_campaigns...`

Detalle: [`backend/README.md`](backend/README.md).

### 6. Mock RAG (demo de ataques)

```bash
cd backend
uvicorn mock_chat:app --reload --port 9000
```

Health: http://127.0.0.1:9000/health  

### 7. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:3000  

### 8. Primera cuenta

1. http://localhost:3000/register — organización + usuario **Owner**, o  
2. `POST /api/v1/auth/register` en Swagger.

---

## Checklist demo (5–8 min)

1. Login  
2. **Targets** → mode `complete`, chat `http://127.0.0.1:9000/chat`, upload `http://127.0.0.1:9000/upload`, auth `none` → Test OK  
3. **Payloads** → subir archivo o texto con canary (opcional)  
4. **Campañas** → crear + ejecutar → worker procesa → `completed`  
5. **Hallazgos** → severidades / canaries  
6. **Reportes** → generar PDF → descargar  
7. **API Keys** → crear, copiar secreto, probar `X-API-Key`, revocar  

Si la campaña se queda en `queued`: worker apagado o Redis caído.

---

## Módulos de la UI

| Ruta | Función |
|------|---------|
| `/dashboard` | Resumen |
| `/targets` | Sistemas RAG auditados |
| `/campaigns` | Lanzar / re-run / cancelar |
| `/findings` | Backlog de vulnerabilidades |
| `/documents` | Payloads (upload a disco) |
| `/reports` | PDF ejecutivo / técnico |
| `/api-keys` | Claves de automatización |

---

## Docker (opcional, más cercano a prod)

```bash
docker compose build
docker compose up -d postgres redis backend worker frontend
docker compose logs -f worker
```

Dentro de Compose, `DATABASE_URL` y `REDIS_URL` usan hosts `postgres` y `redis` (no `localhost`).

---

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) con scope:

```text
feat(backend): ...
feat(frontend): ...
fix(worker): ...
docs: ...
chore: ...
```

---

## Versión

Tag sugerido tras MVP demostrable:

```bash
git tag -a v0.2.0 -m "MVP: real attack engine, RQ worker, PDF, API keys, upload UI"
git push origin v0.2.0
```

---

## Equipo / uso

Proyecto académico-comercial (ETITC) — MK Service. Uso interno del equipo y demos controladas.
