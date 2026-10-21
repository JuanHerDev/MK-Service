# MK Service

Plataforma para **auditar sistemas de IA basados en RAG** frente a **Prompt Injection** (directo e indirecto) y **Data Leagake**.

Detecta vulnerabilidades de forma automatizada (MVP con motor stub), genera un **backlog priorizado de recomendaciones** e **informes** de seguridad orientados a equipos técnicos y de negocio.

> Proyecto end-to-end

---

## Qué incluye este repositorio

| Ruta | Descripción |
|------|-------------|
| `backend/` | API REST (FastAPI, PostgreSQL, Alembic, JWT) |
| `frontend/` | Aplicación web (React + Tailwind) |
| `docs/` | Documentación de producto, arquitectura e investigación |
| `docker-compose.yml` | PostgreSQL + Redis para desarrollo local |

Detalle de cada servicio:

- Backend → [`backend/README.md`](backend/README.md)
- Frontend → [`frontend/README.md`](frontend/README.md)

---

## Stack (resumen)

| Capa | Tecnología |
|------|------------|
| API | Python, FastAPI, SQLAlchemy, Alembic |
| Base de datos | PostgreSQL 16 |
| Cola / caché | Redis (infra lista; ejecución de campañas en MVP vía stub) |
| Auth | JWT (access + refresh), bcrypt |
| Frontend | React, Tailwind CSS |
| Contenedores | Docker Compose |

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (o Docker Engine + Compose)
- Python 3.12 (backend)
- Node.js 20+ (frontend)
- Git

---

## Arranque rápido (desarrollo)

### 1. Clonar e infra

```bash
git clone https://github.com/JuanHerDev/MK-Service.git
cd MK-Service

docker compose up -d postgres redis

# Comprobar que PostgreSQL responde:
docker compose ps
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows Powershell
.\.venv\Scripts\Activate.ps1

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt

alembic upgrade head
python scripts/seed_catalogs.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

API: http://127.0.0.1:8000
Swagger: http://127.0.0.1:8000/docs
```

Más detalle: [`ver backend README`](backend/README.md)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Configura la URL del API en las variables de entorno del frontend [`ver frontend README`](frontend/README.md)

---

## Arquitectura (visión)

[ Frontend React ]
        │  HTTPS / JSON
        ▼
[ Backend FastAPI ]  ──►  PostgreSQL
        │
        └── (futuro) workers ──► Redis

* Multi-tenant por **organización**
* Auditoría externa (el cliente no integra CI/CD obligatorio en el MVP)
* Targets en modo `basic` (chat) o `complete` (chat + carga de documentos)

Documentación de diseño: carpeta [`docs/architecture`].

---

## Flujo de uso (MVP)

1. Registro / Login
2. Crear un target (endpoint del RAG del cliente)
3. Crear una campaña (alcance Prompt Injection y/o Data Leagake)
4. Ejecutar campaña (`/run` stub en MVP)
5. Revisar hallazgos y backlog
6. Generar reporte (stub de metadatos; PDF real en desarrollo)
7. Opcional: **re-run** de una campaña finalizada

---

## Convenciones del repositorio

* **Commits:** Conventional Commits
    Ejemplos: `feat(backend): ...`, `fix(frontend): ...`, `docs:...`
* **Código de aplicación (PostgreSQL):** nombres en inglés (users, campaigns)
* **Documentación académica / script SQL Server:** en español según requisitos de clase

---

## Estado de la app

### MVP (v1)

| **Módulo** | **Estado** |
|------|------------|
| Auth JWT + organizaciones | Listo |
| Targets + test de conectividad | Listo |
| Campañas + cancel + run stub + rerun | Listo |
| Findings + comentarios | Listo |
| Attack documents (metadatos) | Listo |
| Reports (stub) | Listo |
| Frontend integrado | En progreso |
| Motor de ataque real + PDF | Pendiente |
| API keys | pendiente |


---

## Documentación Académica

Los documentos solicitados por los docentes de la **Escuela Tecnológica Instituto Técnico Central (ETITC)** se desarrollan mediante archivos `.md` presentes en este repositorios para llevar un control e historial de versiones completo.

### 1. Instalar pandoc, miktek y lua:

Se necesita instalar:
* [`pandoc`]

```bash
# Windows
winget install Pandoc

# Linux
sudo apt update && sudo apt install pandoc -y

# macOS
brew install pandoc
```

* [`lua`]
```bash
# Windows
winget install --id DEVCOM.Lua

# Linux
sudo apt update && sudo apt install lua5.4 -y

# macOS
brew install lua
```

* [`miktek`](https://miktex.org/howto/install-miktex)

### 2. Convertir los archivos `.md` a `.pdf`:

```bash
# Pandoc y miktek
pandoc <nombre-del-documento.md> -o <nombre-del-documento.pdf> --pdf-engine=xelatex -V geometry:margin=1in

# Tablas de contenido dinámicas
pandoc <nombre-del-documento.md> -o <nombre-del-documento.pdf> --pdf-engine=xelatex --lua-filter=mk-tablas.lua
```

---

## Equipo / Contexto

Desarrollo en el marco de la **Escuela Tecnológica Instituto Técnico Central (ETITC)** y producto orientado a auditoría de seguridad en sistemas RAG.

Historia de desarrollo previa en AVI-RAG (archivado). Este repositorio inicia en el MVP consolidado.