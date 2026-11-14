# MK Service — Frontend

Aplicación web para operar auditorías RAG: panel, targets, campañas, hallazgos, payloads, reportes y API Keys.

---

## Stack

| Pieza | Tecnología |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript |
| Estilos | Tailwind CSS v4 |
| Iconos | lucide-react |
| Auth cliente | JWT en `localStorage` + refresh automático |

---

## Requisitos

- Node.js **20+**
- Backend API en marcha (por defecto `http://127.0.0.1:8000`)

---

## Variables de entorno

Crear `frontend/.env.local` (no commitear secretos; este solo expone URL pública):

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Sin barra final. En el navegador del usuario esa URL debe ser **alcanzable** (no uses el hostname Docker `backend` en el browser).

---

## Arranque

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000  
- API docs (backend): http://127.0.0.1:8000/docs  

Otros scripts:

```bash
npm run build    # build de producción
npm run start    # sirve el build
npm run lint     # ESLint
```

---

## Estructura

```text
frontend/
  app/
    (auth)/          # login, register
    (app)/           # shell autenticado
      dashboard/
      targets/
      campaigns/
      findings/
      documents/     # payloads + upload
      reports/       # listado + descarga PDF
      api-keys/      # crear / revelar una vez / revocar
  components/        # app-shell, ui, etc.
  lib/
    api.ts           # fetch + refresh + downloadReport + uploadForm
    auth.tsx         # sesión
    types.ts
    format.ts
```

Rutas de grupo `(app)` y `(auth)` usan **route groups** de Next (paréntesis): no aparecen en la URL; solo organizan layouts.

---

## Auth en el cliente

1. `POST /api/v1/auth/login` → guarda `access_token` y `refresh_token` (`mk.access` / `mk.refresh`).  
2. Cada request con `Authorization: Bearer …`.  
3. Ante `401`, un solo refresh compartido; si falla → logout y redirect a `/login`.  
4. Roles de escritura (owner, auditor, admin): `canWrite()` en `lib/auth.tsx`.

---

## Integración con la API

| Helper | Uso |
|--------|-----|
| `api<T>(path, opts)` | JSON REST |
| `uploadForm(path, FormData)` | Multipart (payloads) |
| `downloadReport(id, filename?)` | Blob PDF con Bearer |

Base: `NEXT_PUBLIC_API_URL` + `/api/v1`.

---

## Pantallas

| Ruta | Capacidad |
|------|-----------|
| `/login`, `/register` | Acceso y alta de org |
| `/dashboard` | KPIs básicos |
| `/targets` | Alta, test de conectividad |
| `/campaigns` | Crear, run, cancel, re-run; polling si `queued`/`running` |
| `/findings` | Backlog, filtros |
| `/documents` | Listado + **upload archivo** o texto → disco backend |
| `/reports` | Generar + **descargar PDF** |
| `/api-keys` | Alta (secreto una vez), listado, revocar |

---

## Flujo demo desde UI

1. Register / Login  
2. Target → mock `9000` en modo **complete** → Test  
3. Payloads → Nuevo payload (archivo o canary en texto)  
4. Campañas → lanzar (worker backend debe estar activo)  
5. Hallazgos → revisar  
6. Reportes → generar → botón **PDF**  
7. API Keys → crear → copiar → (opcional) probar con curl  

Mensaje tras Run: **encolada** (no “ejecutada”). El worker completa el trabajo.

---

## Docker

Imagen multi-stage en `frontend/Dockerfile`. Compose inyecta `NEXT_PUBLIC_API_URL` en **build time** (Next embebe las `NEXT_PUBLIC_*`).

```bash
# desde la raíz
docker compose build frontend
docker compose up -d frontend
```

---

## Troubleshooting

| Síntoma | Causa / arreglo |
|---------|------------------|
| CORS / network error | Backend up; `CORS_ORIGINS` incluye el origin del front; URL en `.env.local` correcta |
| 401 en todas las rutas | Token viejo → logout; mismo `JWT_SECRET` en backend |
| 403 en listados | Usuario sin membership activa |
| Campaña no avanza | Worker RQ; ver backend README |
| Upload falla | Backend multipart; tamaño ≤ 2 MiB |
| TS `string \| null` en clipboard | Usar variable local tras el guard (`secretValue`) |
| Página lenta | Cargas paralelas; cache Next; no bloquea el MVP |

---

## Commits

```text
feat(frontend): ...
fix(frontend): ...
style(frontend): ...
```

---

## Relación con el monorepo

Vista general y arranque conjunto: [`../README.md`](../README.md).  
API, worker y mock: [`../backend/README.md`](../backend/README.md).

---

## Responsive (móvil)

- `PageHeader`: en pantallas pequeñas el bloque de **acciones** ocupa el ancho completo debajo del título (`flex-wrap`), sin desbordar horizontalmente.
- Tablas: contenedor `TableScroll`; en campañas la celda de acciones usa `sticky right` + `RowActions` para mantener botones visibles mientras se desplaza el resto de columnas.
- Shell: más padding inferior en `main` (`pb-24` en móvil) para que la última fila de botones no quede bajo la barra del navegador.

Componentes: `components/ui.tsx` (`PageHeader`, `TableScroll`, `RowActions`, `stickyActionsTd` / `Th`).
