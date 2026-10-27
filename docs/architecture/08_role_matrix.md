# C.1 — Matriz de roles (MK Service)

**Versión:** 1.0  
**Estado:** Implementado en código (`app/core/permissions.py` + `app/core/deps.py`)

## Roles

| role_code | Ámbito | Descripción |
|-----------|--------|-------------|
| `viewer` | Organización | Solo lectura de campañas, hallazgos, reportes, payloads |
| `auditor` | Organización | Ejecuta auditorías (targets, campañas, findings, docs) |
| `owner` | Organización | Todo lo de auditor + miembros, invitaciones, API keys |
| `admin` | Plataforma | Flag `users.is_platform_admin`; operaciones cross-tenant |

## Matriz resumida

| Acción | viewer | auditor | owner | admin* |
|--------|:------:|:-------:|:-----:|:------:|
| Listar/ver targets, campañas, findings, reports | sí | sí | sí | sí |
| Crear/editar targets, run campaña, upload payloads | no | sí | sí | sí |
| Generar reportes PDF | no | sí | sí | sí |
| API Keys (crear/listar/revocar) | no | no | sí | sí |
| Invitaciones y roles de miembros | no | no | sí | sí |
| Admin global (orgs, suspender) | no | no | no | sí |

\*admin de plataforma además requiere membresía activa en una org para operaciones *tenant-scoped*.

## Dependencias FastAPI (C.2)

| Dependency | Uso |
|------------|-----|
| `require_read_role` | GET de lectura |
| `require_write_role` | Mutaciones de auditoría |
| `require_owner_role` | Miembros e invitaciones |
| `require_keys_role` | API keys |
| `require_platform_admin` | Rutas `/platform/*` |
| `require_action("targets.create")` | Opcional, ligado a `ROLE_MATRIX` |

## D.1 — Invitations

Tabla `invitations`: token hasheado (SHA-256), prefijo visible, `role_id`, `email` opcional, `expires_at`, un solo uso (`accepted_at`), revocable (`revoked_at` / `is_active`).
