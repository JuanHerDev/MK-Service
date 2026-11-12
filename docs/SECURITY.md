# MK Service — Informe de seguridad (MVP)

Fecha de revisión: 2026-11-11  
Alcance: backend FastAPI, frontend Next.js, PostgreSQL, despliegue (Render/Vercel/Neon).

## Resumen ejecutivo

| Severidad | Cantidad aproximada |
|-----------|---------------------|
| Crítico / alto (acción operativa) | 3 |
| Medio (código endurecido o pendiente) | 6 |
| Bajo / informativo | 8 |

El núcleo de autenticación (bcrypt, JWT, refresh con hash y rotación, roles, SQLAlchemy) estaba en buen estado.  
Los cambios de esta pasada refuerzan **rate limit**, **cabeceras**, **CORS**, **uploads**, **docs en prod** y **cuenta activa**.  
Quedan acciones **tuyas** en despliegue e historial git (no automatizables desde el código).

---

## Hallazgos y estado

### 1. Autenticación (hash + cuenta activa)
| Antes | Ahora |
|-------|--------|
| Login con `verify_password` (bcrypt) y rechazo si status ≠ `active` | Mantiene; refresh también exige cuenta `active` |
| JWT access + refresh; refresh guardado como **SHA-256**, rotación al usar | Sin cambio de diseño |
| API Key: secreto solo al crear; en DB solo `key_hash` | Correcto; usuario de la key también debe estar `active` |

**Validación servidor:** `RegisterRequest` / `LoginRequest` con Pydantic (`EmailStr`, `min_length`, normalización de email).

### 2. Claves API en el navegador
- El front **no debe persistir** el secreto de API key tras el modal de creación (solo mostrarlo una vez).
- Tokens JWT están en `localStorage` → riesgo **XSS** si hay script malicioso.
- **Mitigación futura:** cookies `HttpOnly` + `Secure` + `SameSite` para refresh; access en memoria.
- **Ahora:** React escapa JSX (reduce XSS).

### 3. Base de datos
- Acceso solo desde backend vía SQLAlchemy (**consultas parametrizadas**).
- Multi-tenant por `organization_id` en servicios.
- **Operativo:** Neon/Postgres con SSL (`sslmode=require`), usuario de app sin privilegios de superuser, backups.

### 4. HTTPS
- Middleware: `FORCE_HTTPS=true` + `APP_ENV=production` redirige a HTTPS (usa `X-Forwarded-Proto`).
- En Render/Vercel el TLS lo termina el proveedor.

### 5. Contraseñas con hash
- `hash_password` / `verify_password` con **bcrypt** (truncado a 72 bytes).
- Nunca se almacena plaintext.

### 6. Validación de formularios en servidor
- Schemas Pydantic en auth y resto de endpoints.
- Registro: password ≥ 8, org ≥ 2, email válido.

### 7. XSS
- Front: React por defecto escapa texto.
- API JSON no refleja HTML libre en páginas admin sin sanitizar.
- CSP en producción (API): `default-src 'none'`.

### 8. Actividad sospechosa
- Módulo `audit_events` para acciones sensibles (API keys, etc.).
- Rate limit en `/auth/login` y `/auth/register` (default 20/min/IP).
- Rate limit general API (default 120/min/IP).
- **Pendiente:** alertas automáticas / bloqueo tras N fallos de login.

### 9. Rutas admin / roles
- `require_write_role`, `require_owner_role`, `require_keys_role`, `require_platform_admin`, `require_action`.
- Matriz en `permissions.py`.

### 10. Consultas parametrizadas
- SQLAlchemy ORM / binds; no concatenar SQL de usuario.

### 11. Secretos solo en `.env`
- Settings vía `pydantic-settings`.
- `.gitignore` debe incluir `.env`, `.env.local`.

### 12. Rate limit
- Implementado in-process (`app/core/rate_limit.py`).
- En multi-instancia, migrar contadores a Redis.

### 13. CORS
- Orígenes solo desde `CORS_ORIGINS` (lista).
- Métodos y headers acotados (no `*`).

### 14. Cabeceras de seguridad
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Producción: `HSTS` + CSP estricta para API.

### 15–16. Cookies de sesión y CSRF
- **Estado actual:** Bearer en header + localStorage (no cookies de sesión).
- CSRF clásico de formularios cross-site **no aplica** igual que con cookies de sesión.

### 17. Uploads
- Máx. 2 MiB (configurable `MAX_UPLOAD_BYTES`).
- Extensiones y `Content-Type` permitidos (texto / json / csv / html / md).
- Nombre de archivo sanitizado (`Path.name`).

### 18–19. Dependencias
- Revisar periódicamente: `pip audit` / `npm audit`.
- Quitar `passlib` si ya no se usa (bcrypt directo); `boto3` solo si usáis S3/R2.

### 20. Archivos expuestos
- No servir `.env`, `storage/` ni dumps por el front.
- En producción: `ENABLE_API_DOCS=false` o `APP_ENV=production` desactiva `/docs` y OpenAPI.

### 21–22. Git e historial / claves
- Escanear: `gitleaks` o `trufflehog` en el repo.
- Rotar: `JWT_SECRET_KEY`, passwords DB, Groq, Neon, Upstash si hubo exposición.



---

## Variables de entorno de seguridad (producción)

```env
APP_ENV=production
DEBUG=false
FORCE_HTTPS=true
ENABLE_API_DOCS=false
CORS_ORIGINS=https://tu-front.vercel.app
JWT_SECRET_KEY=<aleatorio largo, rotado>
RATE_LIMIT_AUTH_PER_MINUTE=20
RATE_LIMIT_API_PER_MINUTE=120
MAX_UPLOAD_BYTES=2097152
```

## Archivos tocados en esta pasada

- `backend/app/core/rate_limit.py` (nuevo)
- `backend/app/core/middleware_security.py` (nuevo)
- `backend/app/core/config.py`
- `backend/app/main.py`
- `backend/app/schemas/auth.py`
- `backend/app/core/deps.py`
- `backend/app/services/auth_service.py`
- `backend/app/api/v1/attack_documents.py`
- `docs/SECURITY.md` (este informe)
