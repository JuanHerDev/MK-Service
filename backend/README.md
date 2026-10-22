# MK Service — Backend

API REST (FastAPI) + PostgreSQL + Redis/RQ.

## Stack

| Pieza | Tecnología |
|-------|------------|
| API | FastAPI + Uvicorn |
| ORM / migraciones | SQLAlchemy 2 + Alembic |
| Auth | JWT (access + refresh), bcrypt |
| Cola de campañas | Redis + RQ |
| HTTP a targets | httpx |

## Arranque local (API)

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Linux/macOS: source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # ajusta DATABASE_URL, JWT_SECRET_KEY, REDIS_URL

alembic upgrade head
python scripts/seed_catalogs.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  

Variables importantes en `.env`:

```env
DATABASE_URL=postgresql+psycopg2://mk_user:PASSWORD@localhost:5432/mk_service
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=...
CAMPAIGN_ASYNC=true
```

- `CAMPAIGN_ASYNC=true` → `POST /campaigns/{id}/run` **encola** el trabajo en Redis.  
- `CAMPAIGN_ASYNC=false` → ejecuta los probes **en el mismo proceso** de la API (sin worker).

---

## Worker RQ (campañas en background)

### Qué es y para qué sirve

Cuando alguien lanza **Run** en una campaña, la API no ejecuta los ataques en la petición HTTP. Deja un **job** en la cola Redis `mk_campaigns`. Un proceso aparte — el **worker** — toma ese job, llama al motor de ataque y actualiza la campaña (`running` → `completed` / `failed`).

**Analogía:** la API es la caja del restaurante (toma el pedido); el worker es la cocina (prepara el plato). En producción la cocina está siempre abierta; no enciendes los fogones a mano cada vez que llega un cliente.

### Producción / Docker (persistente, recomendado)

El worker es un **servicio** con `restart: unless-stopped`. Arranca solo con Compose y se reinicia si cae.

Desde la **raíz** del monorepo:

```bash
# Infra + API + worker (y frontend si aplica)
docker compose up -d postgres redis backend worker

# Solo el worker (si el resto ya está up)
docker compose up -d worker

# Logs del worker
docker compose logs -f worker

# Estado
docker compose ps
```

Servicio definido en `docker-compose.yml` (`mk_worker`):

- Misma imagen que el backend.
- Comando: `rq worker mk_campaigns --url redis://redis:6379/0`
- `REDIS_URL` apunta al host **`redis`** (nombre del servicio Docker), no a `localhost`.
- `DATABASE_URL` debe usar host **`postgres`** cuando corre dentro de Compose.

En Linux/Docker el worker **estándar** de RQ es el correcto (soporta `fork`). No uses `WindowsWorker` en contenedores.

Escalar más de un worker (opcional):

```bash
docker compose up -d --scale worker=2
```

(requiere quitar `container_name` fijo del servicio worker si escalas).

### Desarrollo en Windows (manual, solo lab)

RQ en Windows no tiene `os.fork` ni `signal.SIGALRM`. Usa la clase del proyecto:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path

rq worker mk_campaigns --url redis://localhost:6379/0 --worker-class app.workers.windows_worker.WindowsWorker
```

Esa terminal debe **quedar abierta** mientras pruebas. No es el modelo de producción; en prod usas Docker/Linux.

### Desarrollo en Linux / macOS (manual)

```bash
cd backend
source venv/bin/activate
export PYTHONPATH=$(pwd)

rq worker mk_campaigns --url redis://localhost:6379/0
```

### Cómo comprobar que la cola funciona

1. Redis y worker arriba (`docker compose ps` o terminal del worker en “Listening…”).
2. `POST /api/v1/campaigns/{id}/run` → respuesta rápida, campaña en `queued`.
3. Worker procesa el job → `running` → `completed` / `failed`.
4. Hallazgos visibles en `GET /findings`.

Si Redis no responde al encolar, la API hace **fallback síncrono** (ejecuta en el request) y registra el error en logs.

### Archivos relacionados

| Ruta | Rol |
|------|-----|
| `app/core/queue.py` | Conexión Redis + enqueue |
| `app/workers/campaign_jobs.py` | Job `execute_campaign_job` |
| `app/workers/windows_worker.py` | Worker sin señales Unix (solo Windows) |
| `app/services/campaign_service.py` | `run_campaign` (enqueue) + `execute_campaign_run` (motor) |

### Cola

- Nombre: **`mk_campaigns`**
- Timeout de job: sin límite Unix (`job_timeout=-1`); el worker Docker puede ajustarse después si hace falta.

---

## Migraciones

```bash
alembic upgrade head
alembic revision --autogenerate -m "descripcion"
```

## Seed

```bash
python scripts/seed_catalogs.py
```

Roles, estados, modos, severidades, categorías y documentos de ataque globales.
