# Política de versionado — MK Service

## 1. API (contrato HTTP)

Formato en URL: /api/v{MAJOR}

| Cambio | Acción |
|--------|--------|
| Rompe clientes existentes (quitar endpoint, renombrar campo obligatorio, cambiar significado) | Nueva **MAJOR** (v1 → v2) |
| Agrega endpoints/campos opcionales sin romper lo anterior | Se mantiene **v1**; se documenta en el manual como revisión menor |
| Bugfix, mensajes de error, performance | No cambia la versión de la API |

Regla: si un cliente que ya funciona debe modificar su código para seguir operando → MAJOR nueva.

## 2. Documentos del proyecto (SRS, SAD, API, BD, programación, etc.)

Formato: MAJOR.MINOR  (ejemplo: 1.0, 1.1, 2.0)

| Tipo de cambio | Versión |
|----------------|---------|
| Primera versión estable / aprobada | **1.0** |
| Aclaraciones, correcciones, reemplazo de contenido sin cambiar el alcance del producto | **MINOR** (1.0 → 1.1) |
| Typos, formato, fecha | Opcional: 1.0.1 o solo actualizar la fecha en el historial |
| Cambio de alcance del MVP, eliminación de módulos, rediseño fuerte del sistema descrito | **MAJOR** (1.x → 2.0) |

### Ejemplos aplicados

| Situación | Versión resultante |
|-----------|-------------------|
| Reemplazar el ER y el script SQL por el modelo alineado a la arquitectura (sin módulos nuevos) | **1.1** |
| Agregar un RF nuevo al alcance del MVP | **1.1** o **2.0** si redefine el producto |
| Quitar Data Leakage del MVP | **2.0** |
| Corregir un typo en el SRS | 1.0 (o 1.0.1) |
| Agregar endpoint opcional a la API documentada | Manual API **1.1**; URL sigue en **/api/v1** |
| Renombrar un campo JSON obligatorio de la API | API **/api/v2** + manual **2.0** |

## 3. Scripts SQL

En el encabezado del archivo:

-- Versión: 1.1
-- Fecha: 2026-10-01
-- Cambio: modelo alineado a arquitectura (multi-tenant, campañas, backlog)

Misma lógica: reemplazo/corrección del esquema → 1.1; cambio estructural de alcance → 2.0.

## 4. Historial obligatorio en cada documento

| Versión | Fecha | Descripción del cambio | Autor |
|---------|-------|------------------------|-------|
| 1.0 | AAAA-MM-DD | Versión inicial | ... |
| 1.1 | AAAA-MM-DD | ... | ... |

## 5. Resumen en una frase

- **API URL:** v2 solo si rompe compatibilidad.
- **Documentos y SQL:** 1.1 = mejorar/corregir/reemplazar sin cambiar qué es el producto; 2.0 = el producto o el alcance descrito ya no es el mismo.