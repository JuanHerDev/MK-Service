# MK Service

Plataforma para **auditar sistemas de IA basados en RAG** frente a **Prompt Injection** (directo e indirecto) y **Data Leakage**.

Detecta vulnerabilidades de forma automatizada (MVP con motor stub), genera un **backlog priorizado de recomendaciones** e **informes** de seguridad orientados a equipos técnicos y de negocio.

> MVP v0.1 — circuito completo: auth, targets, campañas, hallazgos, payloads y reportes.

---

## Qué incluye este repositorio

| Ruta | Descripción |
|------|-------------|
| `backend/` | API REST (FastAPI, PostgreSQL, Alembic, JWT) |
| `frontend/` | Aplicación web (Next.js 16, React 19, Tailwind v4) |
| `docs/` | Documentación de producto, arquitectura e investigación |
| `docker-compose.yml` | PostgreSQL + Redis para desarrollo local |

- Backend → [`backend/README.md`](backend/README.md)
- Frontend → [`frontend/README.md`](frontend/README.md)

---

## Stack

| Capa | Tecnología |
|------|------------|
| API | Python 3.12, FastAPI, SQLAlchemy 2, Alembic |
| Base de datos | PostgreSQL 16 |
| Cola / caché | Redis (infra lista; ejecución de campañas en MVP vía stub) |
| Auth | JWT (access + refresh), bcrypt |
| Frontend | Next.js, React, Tailwind CSS |
| Contenedores | Docker Compose |

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose)
- Python 3.12+
- Node.js 20+
- Git

---

## Arranque rápido (desarrollo local)

### 1. Clonar

```bash
git clone https://github.com/JuanHerDev/MK-Service.git
cd MK-Service
```

### 2. Variables de entorno

**No se sube `.env` al repo.** Copia plantillas:

```bash
# Backend (obligatorio para uvicorn / Alembic)
cp backend/.env.example backend/.env
```

Edita `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://mk_user:TU_PASSWORD@localhost:5432/mk_service
JWT_SECRET_KEY=genera_con_python_-c_"import secrets; print(secrets.token_hex(32))"
POSTGRES_USER=mk_user
POSTGRES_PASSWORD=TU_PASSWORD
POSTGRES_DB=mk_service
```

- Con **uvicorn en el PC** y Postgres en Docker → host **`localhost`**
- Password sin caracteres problemáticos en URL (`@ ? #`) o URL-encoded

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Si usas `docker compose` con un `.env` en la **raíz**, alinea `POSTGRES_*` con el mismo password.

### 3. Infra (Postgres + Redis)

```bash
docker compose up -d postgres redis
docker compose ps
# Esperar a que Postgres acepte conexiones:
docker exec mk_postgres pg_isready -U mk_user -d mk_service
```

(Si el contenedor tiene otro nombre: `docker ps`.)

### 4. Backend

```bash
cd backend
python -m venv venv

# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
python scripts/seed_catalogs.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API docs: http://127.0.0.1:8000/docs  
- Health: http://127.0.0.1:8000/health  

### 5. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:3000

### 6. Primera cuenta

1. Ve a **http://localhost:3000/register**
2. Crea organización + usuario (rol **Owner**)
3. O usa Swagger: `POST /api/v1/auth/register`

```json
{
  "email": "owner@empresa.com",
  "password": "passwordsegura",
  "full_name": "Demo Owner",
  "organization_name": "Demo Org"
}
```

---

## Flujo demo (MVP)

1. Login / Register  
2. **Targets** → registrar endpoint (ej. `https://httpbin.org/get`) → Probar conexión  
3. **Campañas** → crear → Run → (opcional) Rerun  
4. **Hallazgos** → estado y comentarios  
5. **Payloads** → listar globales / org  
6. **Reportes** → listar o generar desde campaña  

> El motor de ataque del MVP es **stub**: genera hallazgos de demostración. Los PDF reales y el ataque real son post-MVP.

---

## Worker de campañas (producción)

Las campañas no se ejecutan dentro del request HTTP. Un proceso **worker (RQ)** consume la cola Redis.

En producción / Docker el worker es **persistente** (no se lanza a mano en cada demo):

```bash
docker compose up -d postgres redis backend worker
docker compose logs -f worker
```

Detalle, Windows local y variables: backend/README.md → sección Worker RQ.

---

## Scripts útiles

```bash
# Solo infra
docker compose up -d postgres redis

# Rebuild imágenes (si usas backend/frontend en Compose)
docker compose build

# Seed de catálogos (roles, estados, modos, severidades, docs globales)
cd backend && python scripts/seed_catalogs.py
```

---

## Estructura de commits

Conventional Commits, con scope cuando aplica:

```text
feat(frontend): ...
fix(backend): ...
chore: ...
docs: ...
```

---

## Versión

MVP presentable: **v0.1.0**.

```bash
git tag -a v0.1.0 -m "MVP presentable: auth, targets, campaigns, findings, reports"
git push origin v0.1.0
```

---

## Licencia / equipo

Uso académico y desarrollo del producto MK Service (ETITC / equipo del proyecto).
