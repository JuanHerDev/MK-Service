# 05 — Manual Técnico de la API
## MK Service

| Campo              | Valor                                      |
|--------------------|--------------------------------------------|
| **Versión de la API** | v1                                      |
| **Versión del documento** | 1.0                                 |
| **Fecha**          | Septiembre 2026                            |
| **Estado**         | Aprobado para MVP                          |
| **Base URL**       | `https://api.mk-service.com/api/v1`        |
| **Estilo**         | REST + JSON                                |
| **Autenticación**  | Bearer JWT + API Keys                      |

---

## 1. Introducción

Este documento describe el contrato de la API pública de **MK Service**.  
Sirve como referencia para el desarrollo del frontend, integraciones futuras y como documentación técnica del producto.

La API es **REST + JSON**, versionada en la URL (`/api/v1/`) y diseñada bajo el principio de auditoría externa: el cliente solo necesita proporcionar endpoints, no se integra a su CI/CD.

### 1.1 Recursos principales

- Auth
- Organizations & Users
- Targets
- Attack Documents
- Campaigns
- Findings / Backlog
- Reports
- Exports

---

## 2. Autenticación y Autorización

### 2.1 Resumen

MK Service soporta dos métodos de autenticación:

1. **JWT** (usuarios humanos) — usado por la aplicación web.
2. **API Keys** (acceso programático) — usado por scripts o sistemas externos.

Todos los endpoints protegidos requieren:

```http
Authorization: Bearer <token>
```

### 2.2 Inicio de sesión (Email + Contraseña)

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "auditor@empresa.com",
  "password": "contraseña-en-texto-plano"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

El **refresh token** se envía como cookie `HttpOnly`, `Secure` y `SameSite=Strict`.

**Medidas de seguridad:**
- Contraseñas hasheadas con **Argon2id**.
- Rate limiting estricto en login.
- Bloqueo temporal tras varios intentos fallidos.

### 2.3 Renovación del token (Refresh)

**Endpoint:** `POST /api/v1/auth/refresh`

El navegador envía automáticamente la cookie del refresh token.  
No se requiere body.

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

Se recomienda rotar el refresh token en cada uso.

### 2.4 Cierre de sesión

**Endpoint:** `POST /api/v1/auth/logout`

Invalida el refresh token actual (y opcionalmente todos los del usuario).

### 2.5 API Keys

- Pueden ser creadas por **Owner** (de su organización) y **Admin** (plataforma).
- Se muestran **una sola vez** al crearse.
- Se almacenan **hasheadas** en la base de datos.
- Pueden tener scopes (`read`, `campaigns:write`, etc.).

**Uso:**
```http
Authorization: Bearer mk_live_xxxxxxxxxxxxxxxx
```
o
```http
X-API-Key: mk_live_xxxxxxxxxxxxxxxx
```

### 2.6 Roles y permisos

| Rol      | Permisos principales                                          |
|----------|---------------------------------------------------------------|
| Owner    | Control total de su organización + lanzar campañas            |
| Auditor  | Gestionar targets, campañas y backlog de su organización      |
| Viewer   | Acceso de solo lectura a reportes y backlog                   |
| Admin    | Administración a nivel de plataforma                          |

---

## 3. Convenciones Generales

### 3.1 Formato
- `Content-Type: application/json`
- Fechas en ISO 8601 UTC (`2026-09-28T18:30:00Z`)
- Identificadores: UUID v4

### 3.2 Paginación

```
GET /api/v1/campaigns?page=1&per_page=20
```

```json
{
  "items": [...],
  "total": 47,
  "page": 1,
  "per_page": 20,
  "pages": 3
}
```

### 3.3 Filtrado y ordenamiento
- Filtros: `?status=completed&severity=high`
- Orden: `?sort=-created_at` (`-` = descendente)

### 3.4 Códigos de estado HTTP

| Código | Significado                        |
|--------|------------------------------------|
| 200    | OK                                 |
| 201    | Creado                             |
| 202    | Aceptado (asíncrono)               |
| 400    | Petición incorrecta                |
| 401    | No autenticado                     |
| 403    | No autorizado                      |
| 404    | No encontrado                      |
| 422    | Error de validación                |
| 429    | Rate limit excedido                |
| 500    | Error interno                      |

### 3.5 Formato de errores

```json
{
  "detail": "Mensaje legible del error",
  "code": "campaign_not_found",
  "status": 404
}
```

### 3.6 Rate Limiting

Límites por defecto del MVP (por organización):

| Acción                      | Límite     | Ventana    |
|-----------------------------|------------|------------|
| Login / Refresh             | 10         | 1 minuto   |
| Crear campaña               | 20         | 1 hora     |
| Llamadas generales a la API | 120        | 1 minuto   |
| Subida de documentos        | 30         | 1 hora     |

**Headers de respuesta:**
```http
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1695849600
```

Al exceder el límite se responde `429 Too Many Requests`.

---

## 4. Recursos

### 4.1 Targets

Representa el sistema RAG del cliente.

| Método | Endpoint                            | Descripción                     | Roles                |
|--------|-------------------------------------|---------------------------------|----------------------|
| POST   | `/api/v1/targets`                   | Crear Target                    | Owner, Auditor       |
| GET    | `/api/v1/targets`                   | Listar Targets                  | Owner, Auditor, Viewer |
| GET    | `/api/v1/targets/{target_id}`       | Detalle                         | Owner, Auditor, Viewer |
| PATCH  | `/api/v1/targets/{target_id}`       | Actualizar                      | Owner, Auditor       |
| DELETE | `/api/v1/targets/{target_id}`       | Eliminar                        | Owner, Auditor       |
| POST   | `/api/v1/targets/{target_id}/test`  | Probar conectividad             | Owner, Auditor       |

**Modelo:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "RAG Producción Banco XYZ",
  "description": "Sistema RAG de atención al cliente",
  "mode": "complete",
  "chat_endpoint": "https://rag.cliente.com/v1/chat",
  "upload_endpoint": "https://rag.cliente.com/v1/documents",
  "auth_type": "bearer",
  "headers_extra": {
    "X-Organization-Id": "org_123"
  },
  "rate_limit_rpm": 30,
  "status": "active",
  "last_tested_at": "2026-09-28T18:00:05Z",
  "last_test_result": {
    "success": true,
    "chat_reachable": true,
    "upload_reachable": true,
    "message": "Conectividad verificada correctamente"
  },
  "created_at": "2026-09-28T18:00:00Z",
  "updated_at": "2026-09-28T18:00:05Z"
}
```

**Comportamiento al crear:**  
Se ejecuta automáticamente la prueba de conectividad.  
- Éxito → `status: "active"`  
- Fallo → se crea con `status: "error"` y se guarda el motivo (evita Targets fantasma).

---

### 4.2 Campaigns

| Método | Endpoint                                         | Descripción                              | Roles                |
|--------|--------------------------------------------------|------------------------------------------|----------------------|
| POST   | `/api/v1/campaigns`                              | Crear y encolar campaña                  | Owner, Auditor       |
| GET    | `/api/v1/campaigns`                              | Listar campañas                          | Owner, Auditor, Viewer |
| GET    | `/api/v1/campaigns/{campaign_id}`                | Detalle                                  | Owner, Auditor, Viewer |
| POST   | `/api/v1/campaigns/{campaign_id}/cancel`         | Cancelar                                 | Owner, Auditor       |
| POST   | `/api/v1/campaigns/{campaign_id}/re-run`         | Re-ejecutar (crea campaña vinculada)     | Owner, Auditor       |
| GET    | `/api/v1/campaigns/{campaign_id}/comparison`     | Comparar con campaña padre               | Owner, Auditor, Viewer |

**Creación (Request):**

```json
{
  "name": "Auditoría Q3 - RAG Clientes",
  "target_id": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "complete",
  "audit_scope": ["prompt_injection", "data_leakage"],
  "document_ids": ["doc_01", "doc_02", "doc_custom_45"],
  "config": {
    "queries_per_document": 3,
    "temperature": 0.1,
    "max_tokens": 1024,
    "timeout_seconds": 60,
    "stop_on_first_critical": false
  },
  "schedule_at": null
}
```

**Estados:** `queued` | `running` | `completed` | `failed` | `cancelled`

**Re-run:**  
Se puede enviar body opcional para modificar configuración.  
Si no se envía body, se copia exactamente la configuración original.  
Siempre se crea una nueva campaña con `parent_campaign_id`.

---

### 4.3 Findings / Backlog

| Método | Endpoint                                      | Descripción                              | Roles                |
|--------|-----------------------------------------------|------------------------------------------|----------------------|
| GET    | `/api/v1/findings`                            | Listar hallazgos                         | Owner, Auditor, Viewer |
| GET    | `/api/v1/findings/{finding_id}`               | Detalle                                  | Owner, Auditor, Viewer |
| PATCH  | `/api/v1/findings/{finding_id}`               | Actualizar estado, recomendación, asignar, comentar | Owner, Auditor |
| GET    | `/api/v1/campaigns/{campaign_id}/findings`    | Hallazgos de una campaña                 | Owner, Auditor, Viewer |

**Modelo:**

```json
{
  "id": "fnd_9a8b7c6d-...",
  "campaign_id": "cmp_7f8a9b2c-...",
  "title": "System Prompt Leakage vía documento canario",
  "severity": "critical",
  "category": "prompt_injection",
  "description": "El modelo reprodujo parte del system prompt...",
  "recommendation": "Aislar el contenido recuperado usando delimitadores y JSON encoding.",
  "priority_order": 1,
  "status": "open",
  "assigned_to": null,
  "evidence": {
    "query_used": "¿Cuáles son las políticas de reembolso?",
    "response_excerpt": "...",
    "canary_found": true,
    "document_id": "doc_01"
  },
  "comments": [],
  "status_history": [
    {
      "from_status": null,
      "to_status": "open",
      "changed_by": "system",
      "changed_at": "2026-09-28T19:15:00Z"
    }
  ],
  "created_at": "2026-09-28T19:15:00Z",
  "updated_at": "2026-09-28T19:15:00Z"
}
```

**Estados del backlog:**

| Estado           | Quién lo pone     | Cuándo se usa                                      |
|------------------|-------------------|----------------------------------------------------|
| `open`           | Sistema           | Al crearse el hallazgo                             |
| `in_progress`    | Auditor / Owner   | Se empezó a trabajar en la mitigación              |
| `resolved`       | Auditor / Owner   | Se considera solucionado                           |
| `false_positive` | Auditor / Owner   | No es un hallazgo real                             |
| `accepted_risk`  | Owner (recomendado) | Se acepta conscientemente el riesgo              |

El sistema solo asigna `open` automáticamente. El resto es manual y queda registrado en `status_history`.

---

### 4.4 Reports

| Método | Endpoint                                      | Descripción                              | Roles                |
|--------|-----------------------------------------------|------------------------------------------|----------------------|
| POST   | `/api/v1/campaigns/{campaign_id}/reports`     | Generar informe(s)                       | Owner, Auditor       |
| GET    | `/api/v1/reports/{report_id}`                 | Metadata del informe                     | Owner, Auditor, Viewer |
| GET    | `/api/v1/reports/{report_id}/download`        | Descargar PDF                            | Owner, Auditor, Viewer |
| GET    | `/api/v1/campaigns/{campaign_id}/reports`     | Listar informes de una campaña           | Owner, Auditor, Viewer |

**Request de generación:**
```json
{
  "type": "both",
  "language": "es",
  "include_evidence": true
}
```

**Comportamiento:**
- Al terminar una campaña se genera **automáticamente** el Informe Técnico.
- El Informe Ejecutivo se genera solo bajo demanda.
- Se puede solicitar `executive`, `technical` o `both`.
- Idioma por defecto de la organización: `es` (configurable). Al generar se puede elegir `es`, `en` o ambos.

---

### 4.5 Exports

| Método | Endpoint                                                      | Descripción                    |
|--------|---------------------------------------------------------------|--------------------------------|
| GET    | `/api/v1/campaigns/{campaign_id}/findings/export?format=csv`  | Exportar backlog a CSV         |
| GET    | `/api/v1/campaigns/{campaign_id}/findings/export?format=json` | Exportar hallazgos a JSON      |

Endpoints separados intencionalmente para mantener responsabilidades claras.

---

### 4.6 Attack Documents

| Método | Endpoint                                      | Descripción                              | Roles                |
|--------|-----------------------------------------------|------------------------------------------|----------------------|
| GET    | `/api/v1/attack-documents`                    | Listar (globales + de la organización)   | Owner, Auditor, Viewer |
| GET    | `/api/v1/attack-documents/{doc_id}`           | Detalle                                  | Owner, Auditor, Viewer |
| POST   | `/api/v1/attack-documents`                    | Subir documento personalizado            | Owner, Auditor       |
| DELETE | `/api/v1/attack-documents/{doc_id}`           | Eliminar documento personalizado         | Owner, Auditor       |
| GET    | `/api/v1/admin/attack-documents`              | Gestión biblioteca global                | Admin                |

**Modelo:**

```json
{
  "id": "doc_01",
  "name": "Indirect Instruction Override - Classic",
  "description": "Documento que intenta sobrescribir instrucciones del sistema.",
  "category": "prompt_injection",
  "technique": "instruction_override",
  "scope": "global",
  "organization_id": null,
  "file_name": "indirect_override_v2.txt",
  "file_size_bytes": 1540,
  "version": "1.2.0",
  "is_active": true,
  "created_at": "2026-09-01T10:00:00Z"
}
```

- El backend devuelve lista mixta con campo `scope`.
- El frontend muestra dos listas separadas (Global / Organización).
- Documentos personalizados: `category` obligatorio, `technique` opcional.
- Versionado solo en documentos globales en el MVP.

---

### 4.7 Organizations & Users

| Método | Endpoint                                      | Descripción                              | Roles     |
|--------|-----------------------------------------------|------------------------------------------|-----------|
| GET    | `/api/v1/organizations/me`                    | Datos de la organización actual          | Owner, Auditor, Viewer |
| PATCH  | `/api/v1/organizations/me`                    | Actualizar organización                  | Owner     |
| GET    | `/api/v1/organizations/me/users`              | Listar usuarios                          | Owner     |
| POST   | `/api/v1/organizations/me/users`              | Invitar usuario (por email)              | Owner     |
| PATCH  | `/api/v1/organizations/me/users/{user_id}`    | Cambiar rol / desactivar                 | Owner     |
| DELETE | `/api/v1/organizations/me/users/{user_id}`    | Eliminar usuario                         | Owner     |

**Invitación de usuarios:**  
Se realiza por email (enlace de activación). El usuario define su propia contraseña. Estado inicial: `invited` → `active`.

**Owners:** Puede haber **varios** Owners por organización.

**Endpoints de Admin (plataforma):**

| Método | Endpoint                                      | Descripción                              |
|--------|-----------------------------------------------|------------------------------------------|
| GET    | `/api/v1/admin/organizations`                 | Listar todas las organizaciones          |
| GET    | `/api/v1/admin/organizations/{org_id}`        | Detalle de una organización              |
| PATCH  | `/api/v1/admin/organizations/{org_id}`        | Activar / desactivar organización        |
| GET    | `/api/v1/admin/users`                         | Listar usuarios de la plataforma         |

---

## 5. Seguridad

- HTTPS obligatorio (TLS 1.2+).
- Contraseñas y API Keys hasheadas (Argon2id).
- Refresh tokens en cookie HttpOnly + Secure + SameSite.
- Access tokens de corta duración (15-30 min).
- Multi-tenancy estricto (Row Level Security + aislamiento de archivos).
- Rate limiting por organización.
- Registro de auditoría de acciones sensibles (cambios de estado, invitaciones, etc.).

---

## 6. Apéndices

### A. Relación con otros documentos
- Requisitos: `03_srs_requisitos.md` v1.0
- Arquitectura: `04_sad_arquitectura.md` v1.0

### B. Historial de cambios

| Versión | Fecha            | Descripción                                      |
|---------|------------------|--------------------------------------------------|
| 1.0     | Septiembre 2026  | Primera versión completa construida colaborativamente |

---

**Fin del Manual Técnico de la API v1.0**

> Este documento ha sido construido de forma iterativa y colaborativa.  
> Cualquier cambio posterior debe versionarse.
