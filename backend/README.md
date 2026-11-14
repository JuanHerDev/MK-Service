# MK Service — Backend

API REST de auditoría RAG: autenticación, multi-tenant, targets, campañas asíncronas, motor de Prompt Injection / Data Leakage, hallazgos, reportes PDF, documentos de ataque en disco y API Keys.

---

## Stack

| Pieza | Tecnología |
|-------|------------|
| Framework | FastAPI + Uvicorn |
| ORM / migraciones | SQLAlchemy 2 + Alembic |
| BD | PostgreSQL 16 |
| Auth | JWT access/refresh, bcrypt, header `X-API-Key` |
| Cola | Redis + RQ (`mk_campaigns`) |
| HTTP saliente | httpx |
| PDF | reportlab |
| Upload | python-multipart |

Dependencias: `requirements.txt`.

---

## Estructura

```text
backend/
  app/
    api/v1/          # routers (auth, targets, campaigns, ...)
    core/            # config, database, security, deps, queue, storage
    models/          # SQLAlchemy
    schemas/         # Pydantic
    services/        # negocio + attack_engine + pdf_report
    workers/         # campaign_jobs, windows_worker
  alembic/
  scripts/           # seed_catalogs, ensure_payload_files
  storage/           # payloads/ y reports/ (gitignored)
  mock_chat.py       # RAG vulnerable local
```

---

## Variables de entorno

Copia `backend/.env.example` → `backend/.env`.

| Variable | Ejemplo | Notas |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql+psycopg2://mk_user:pass@localhost:5432/mk_service` | Host `localhost` si API en PC; `postgres` dentro de Compose |
| `REDIS_URL` | `redis://localhost:6379/0` | Host `redis` en Compose |
| `JWT_SECRET_KEY` | 64 hex | Obligatorio; mismo valor en todos los procesos |
| `JWT_ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | |
| `CAMPAIGN_ASYNC` | `true` | `false` = run síncrono en el request |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Lista separada por comas |
| `STORAGE_PATH` | `storage` | Relativo al cwd (en prod free de Render es efímero) |
| `STORAGE_BACKEND` | `local` | `local` o `s3` (R2/S3 cuando haya bucket) |
| `API_V1_PREFIX` | `/api/v1` | |

---

## Arranque local

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Unix:    source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python scripts/seed_catalogs.py
python scripts/ensure_payload_files.py   # archivos bajo storage/payloads/global/
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- OpenAPI: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  

Postgres y Redis deben estar arriba (`docker compose up -d postgres redis` desde la raíz).

---

## Migraciones (Alembic)

```bash
alembic upgrade head
alembic revision --autogenerate -m "descripcion_corta"
# Revisar el archivo generado antes de upgrade
alembic upgrade head
```

Importar **todos** los modelos en `alembic/env.py` para que autogenerate vea el metadata completo.

---

## Seed y storage

En **Render free** no hay persistent disk: los archivos bajo `STORAGE_PATH` se pierden en cada deploy. Usa seed de payloads globales en `start.sh` y evita depender de uploads de organización en demos de producción. Object storage (`STORAGE_BACKEND=s3`) queda soportado en código para cuando lo actives.


```bash
python scripts/seed_catalogs.py
# roles, user_statuses, connection_modes, campaign_statuses,
# severities, finding_statuses, attack_categories (+ seeds de docs si aplica)

python scripts/ensure_payload_files.py
# Crea storage/payloads/global/*.txt con canaries de laboratorio
```

Layout de disco:

```text
storage/
  payloads/
    global/
    org_<id>/
  reports/
    org_<id>/
```

En BD se guarda la ruta **relativa** (`payloads/org_2/file.txt`). El motor resuelve con `app.core.storage.resolve_path`.

---

## Worker RQ

### Comportamiento

1. `POST /api/v1/campaigns/{id}/run` con `CAMPAIGN_ASYNC=true`  
2. Job en cola Redis `mk_campaigns`  
3. Worker ejecuta `execute_campaign_job` → motor de probes → actualiza campaña y hallazgos  

**Analogía:** la API toma el pedido; el worker cocina.

### Windows (desarrollo)

RQ no soporta `os.fork` / `SIGALRM`. Usar:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
rq worker mk_campaigns --url redis://localhost:6379/0 --worker-class app.workers.windows_worker.WindowsWorker
```

La terminal debe permanecer abierta.

### Linux / macOS

```bash
export PYTHONPATH=$(pwd)
rq worker mk_campaigns --url redis://localhost:6379/0
```

### Docker / producción

```bash
# desde la raíz del monorepo
docker compose up -d worker
docker compose logs -f worker
```

En contenedor usar el worker **estándar** de RQ (no `WindowsWorker`).  
`REDIS_URL=redis://redis:6379/0`, `DATABASE_URL=...@postgres:5432/...`.

### Síncrono (sin worker)

```env
CAMPAIGN_ASYNC=false
```

Útil para depurar; el request puede tardar decenas de segundos.

### Archivos clave

| Archivo | Rol |
|---------|-----|
| `app/core/queue.py` | Enqueue |
| `app/workers/campaign_jobs.py` | Job |
| `app/workers/windows_worker.py` | Worker Windows |
| `app/services/campaign_service.py` | run + execute |
| `app/services/attack_engine.py` | Probes directos/indirectos |

---

## Motor de ataque

| Modo target | Alcance |
|-------------|---------|
| `basic` | Chat → Prompt Injection **directo** |
| `complete` | Chat + **upload** → PI **indirecto** + data leakage vía documentos |

Canaries de laboratorio (ejemplos): `MK_CANARY_PI_2b8e1d`, `MK_CANARY_LEAK_7f3a9c`, `MK_CANARY_INDIRECT_9c4e2a`.

Solo atacar sistemas **autorizados**. El `mock_chat.py` es el target seguro para demos.

---

## Mock RAG

```bash
# Prefer labs/mk_rag_lab (OpenAI-compatible). Legacy mock:
# uvicorn mock_chat:app --reload --port 9000
# Lab: cd ../labs/mk_rag_lab && uvicorn main:app --reload --port 9000
```

| Endpoint | Uso |
|----------|-----|
| `GET/POST /chat` | Respuestas vulnerables + fuga de canaries |
| `POST /upload` | Guarda texto en memoria (contexto) |
| `GET /health` | Estado |
| `POST /reset` | Limpia store |

Target de demo:

- chat: `http://127.0.0.1:9000/v1/chat/completions` (lab) o legacy `/chat`  
- upload: `http://127.0.0.1:9000/upload`
- headers_extra: `{"model": "lab-chat"}`  
- auth: `none`  
- mode: `complete`  

---

## API (mapa)

Prefijo: `/api/v1`.

| Grupo | Rutas principales |
|-------|-------------------|
| Auth | `register`, `login`, `refresh`, `logout`, `me` |
| Organizations | `me` |
| Targets | CRUD, `POST /{id}/test` |
| Campaigns | CRUD-ish, `run`, `cancel`, `rerun` |
| Findings | list/get, patch estado/recomendación, comentarios |
| Attack documents | list/create, `POST /upload`, delete (soft) |
| Reports | list, `POST /campaigns/{id}/reports`, `GET /reports/{id}/download` |
| API Keys | create (secreto una vez), list, `POST /{id}/revoke` |

Auth:

- `Authorization: Bearer <access_token>`  
- o `X-API-Key: mk_live_...`  

Swagger: `/docs`.

---

## Reportes PDF

`reportlab` genera PDF real en `storage/reports/...`.  
`GET /reports/{id}/download` devuelve el archivo (FileResponse).

---

## Seguridad (capa app)

- Passwords: bcrypt  
- API keys: SHA-256 del secreto; solo hash en BD  
- JWT con secret fuerte; refresh rotado/revocable  
- Filtro multi-tenant por `organization_id` en servicios  
- CORS acotado  

No equivale a la tríada CID del parcial SQL Server (DDM, triggers T-SQL); son diseños distintos. Ver README raíz.

---

## Troubleshooting

| Síntoma | Acción |
|---------|--------|
| `relation does not exist` | `alembic upgrade head` + seed |
| Campaña eternamente `queued` | Arrancar worker; verificar Redis |
| `fork` / `SIGALRM` en Windows | `WindowsWorker` |
| Target test falla CORS/OPTIONS | Mock actualizado con CORS |
| PDF vacío / 404 | Campaña completed + findings; path `STORAGE_PATH` |
| `ModuleNotFoundError: app` | `PYTHONPATH` = directorio `backend` |

---

## Tests manuales rápidos

```bash
# Health
curl -s http://127.0.0.1:8000/health

# Login + header
# (usar Swagger o guardar token)

# API Key
curl -s -H "X-API-Key: mk_live_..." http://127.0.0.1:8000/api/v1/targets
```

---

## Borrado lógico (soft delete)

| Endpoint / acción | Efecto |
|-------------------|--------|
| `DELETE /targets/{id}` | `targets.is_active = false` |
| `DELETE /attack-documents/{id}` | `attack_documents.is_active = false` |
| Revocar API key | `api_keys.is_active = false` |
| `PATCH /members/{id}/active` | activa/desactiva membresía |

No hay hard delete de campañas, hallazgos ni `audit_events` desde la API pública.

Detalle legal/operativo: `../docs/POLITICA_ELIMINACION.md`.
