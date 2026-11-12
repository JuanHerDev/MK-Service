# Checklist — base de datos de producción (Neon / PostgreSQL)

## Separar dos mundos

| Capa | Dónde | Nombres |
|------|--------|---------|
| **Motor (PostgreSQL)** | Neon | Usuario de conexión de la app (ej. `neondb_owner` o rol dedicado). **No** existe `sa` (eso es SQL Server). |
| **Aplicación** | Tabla `users` / `roles` | `is_platform_admin`, `role_code=admin` mostrado como **Admin de plataforma** — nunca “sys” ni “sa”. |

La entrega académica con SQL Server (`login_mk_superadmin`, `datareader`, etc.) es del **script de clase**, no de Neon.

## Producción (Neon) — qué revisar

1. **Un usuario de aplicación** con permisos DML sobre el schema `public` (o el schema de la app).
2. **No** uses la contraseña del owner de Neon en el front ni la subas a git.
3. Conexión con **`sslmode=require`** (ya en la URL de Neon).
4. **No** abras el puerto 5432 a internet salvo el acceso de Neon (ellos ya lo gestionan).
5. Rotar la password si alguna vez estuvo en un repo o chat.
6. Backups: activar historial/PITR según el plan de Neon.

## Qué no hacer

- No crear un login llamado `sa`, `sys`, `sysadmin` en la app.
- No conceder superuser al usuario que usa Render día a día si puedes usar un rol más acotado (en plan free a menudo solo tienes el owner de Neon; documenta esa limitación).
- No mezclar en la UI “sys admin de SQL” con “admin de plataforma MK”.

## App — nombre del rol

- Código estable: `role_code = "admin"` + flag `is_platform_admin`.
- Etiqueta visible: **Admin de plataforma** / **Platform admin**.
- Promoción: `python scripts/promote_platform_admin.py email@dominio.com` contra `DATABASE_URL` de producción.

## SQL Server (solo parcial académico)

- Logins: `login_mk_superadmin`, `login_mk_owner`, `login_mk_reader`, `login_mk_writer`, `login_mk_app`.
- Deshabilitar o no usar `sa` en la instancia de demostración.
- Evidencia: script de verificación CID del documento formal.
