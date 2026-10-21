# 08 — Documento general
## MK Service: Plataforma de Auditoría de Prompt Injection y Data Leakage en Sistemas RAG

| Campo | Valor |
|-------|--------|
| **Producto** | MK Service |
| **Versión del documento** | 1.0 |
| **Fecha** | 01 Octubre 2026 |
| **Enfoque** | Documento general del proyecto |
| **Estado** | En desarrollo |

---

## 1. Introducción

### 1.1 Presentación del proyecto

**MK Service** es una plataforma SaaS orientada a la auditoría externa y automatizada de sistemas de Inteligencia Artificial basados en RAG (Retrieval-Augmented Generation).

El sistema permite detectar vulnerabilidades de:

- Prompt Injection Directo
- Prompt Injection Indirecto
- Data Leakage

y generar un backlog priorizado de recomendaciones junto con informes ejecutivos y técnicos.

A diferencia de documentos especializados (base de datos, investigación o arquitectura de software), este documento describe el **proyecto de forma integral**: problema, objetivos, alcance, metodología, tecnologías, módulos, interfaz y plan de trabajo.

### 1.2 Contexto

Los sistemas RAG combinan modelos de lenguaje con recuperación de documentos. Esa arquitectura introduce riesgos de seguridad específicos: instrucciones maliciosas ocultas en documentos (inyección indirecta) y fuga de información del contexto o de la base de conocimiento.

En el mercado colombiano y regional existe una oferta limitada de herramientas especializadas en auditoría automatizada de estos riesgos, con backlog de mitigación e informes reutilizables para compliance.

MK Service se plantea como solución académica con proyección comercial: útil para la universidad y viable como producto SaaS.

---

## 2. Planteamiento del problema

Las organizaciones que adoptan asistentes RAG (atención al cliente, legal, conocimiento interno, etc.) carecen de mecanismos sistemáticos para:

1. Probar de forma externa y repetible la resistencia del sistema ante Prompt Injection y Data Leakage.
2. Obtener evidencia ordenada (hallazgos, severidad, recomendación).
3. Hacer seguimiento de mitigaciones mediante re-auditorías comparables.
4. Entregar informes comprensibles tanto a perfiles técnicos como gerenciales.

Sin una herramienta de este tipo, las pruebas suelen ser manuales, poco repetibles y difíciles de documentar ante auditorías internas o regulatorias.

---

## 3. Objetivos

### 3.1 Objetivo general

Diseñar e implementar una plataforma web SaaS que permita auditar de forma externa y automatizada sistemas RAG, detectando Prompt Injection (directo e indirecto) y Data Leakage, y generando backlog de recomendaciones e informes de seguridad.

### 3.2 Objetivos específicos

1. Definir los requisitos funcionales y no funcionales del producto (alcance MVP).
2. Diseñar la arquitectura de software (API, workers asíncronos, multi-tenancy, almacenamiento).
3. Modelar e implementar la base de datos relacional normalizada (3FN) con seguridad por roles.
4. Desarrollar el backend (API REST) y el frontend (aplicación web responsive).
5. Implementar la ejecución de campañas de auditoría, detección de hallazgos y generación de informes.
6. Diseñar una interfaz usable para perfiles técnicos (Auditor) y no técnicos (Owner, Viewer).
7. Documentar el proyecto de forma que sirva tanto para evaluación académica como para evolución comercial.

---

## 4. Alcance

### 4.1 Incluido en el MVP

- Dos modos de conexión al RAG del cliente:
  - **Básico:** solo endpoint de chat (Prompt Injection directo).
  - **Completo:** chat + carga temporal de documentos (Prompt Injection indirecto y Data Leakage).
- Roles: Owner, Admin (plataforma), Auditor, Viewer.
- Biblioteca de documentos de ataque (globales y por organización).
- Campañas de auditoría con alcance configurable, programación, re-ejecución y comparación.
- Backlog de hallazgos (severidad, estado, recomendación, comentarios, historial).
- Informes PDF (técnico automático al finalizar; ejecutivo bajo demanda) y exportación CSV/JSON.
- Despliegue prioritario en la nube como aplicación web.

### 4.2 Fuera de alcance del MVP

- Integración con CI/CD del cliente.
- Despliegue on-premise.
- Monitoreo continuo 24/7.
- Aplicaciones nativas móviles.
- Jailbreaking de modelos sin componente RAG.

---

## 5. Justificación

- **Académica:** Integra programación backend/frontend, bases de datos, seguridad, arquitectura y UX en un producto coherente.
- **Técnica:** Aborda un problema real de seguridad en sistemas de IA generativa.
- **Comercial:** Responde a una necesidad poco cubierta de auditoría externa automatizada con entregables claros (backlog + informes).
- **Metodológica:** Permite aplicar buenas prácticas (API versionada, multi-tenancy, colas asíncronas, least privilege, documentación).

---

## 6. Metodología de trabajo

El desarrollo se organiza en fases, con documentación previa al código cuando es posible:

| Fase | Actividad principal | Entregables |
|------|---------------------|-------------|
| 1 | Investigación y planteamiento | Anteproyecto / research |
| 2 | Requisitos | SRS |
| 3 | Arquitectura | SAD, manual de API |
| 4 | Datos | Modelo relacional, scripts SQL Server y PostgreSQL |
| 5 | Diseño de interfaz | Mockups (Figma / exportaciones) |
| 6 | Implementación | Backend, frontend, workers |
| 7 | Pruebas y ajustes | Casos de prueba, correcciones |
| 8 | Documentación final | Manuales, informe de proyecto |

---

## 7. Stack tecnológico

| Capa | Tecnología | Uso |
|------|------------|-----|
| Frontend | React + Vite + Tailwind CSS | Interfaz web responsive |
| Backend | Python + FastAPI | API REST, autenticación JWT |
| Cola de trabajos | Redis + RQ | Campañas asíncronas |
| Base de datos (desarrollo) | PostgreSQL | Datos de negocio y multi-tenancy |
| Base de datos (académica) | SQL Server | Script y seguridad para la asignatura de BD |
| Almacenamiento de archivos | Object Storage S3-compatible (MinIO / R2 / S3) | Documentos de ataque e informes PDF |
| Autenticación | JWT + API Keys | Usuarios e integraciones |

---

## 8. Arquitectura (visión general)

MK Service se estructura como SaaS multi-tenant:

- **Frontend web** consume la API.
- **API (FastAPI)** gestiona autenticación, organizaciones, targets, campañas y backlog.
- **Workers** ejecutan las campañas de forma asíncrona (envío de pruebas al RAG del cliente, detección, reportes).
- **PostgreSQL** almacena metadata y estados; los archivos van a object storage.
- La auditoría es **externa**: el cliente solo expone endpoints; no hay integración a su CI/CD.

Detalle técnico: ver `architecture/04_sad_architecturea.md` y `architecture/05_api_technical_manual.md`.

---

## 9. Módulos funcionales del sistema

1. **Autenticación y usuarios** — Login JWT, invitaciones, roles por organización.
2. **Organizaciones** — Multi-tenancy; varios Owners por organización.
3. **Targets** — Registro de sistemas RAG (modo básico/completo), prueba de conectividad.
4. **Documentos de ataque** — Biblioteca global y documentos personalizados por organización.
5. **Campañas** — Creación, alcance (Prompt Injection / Data Leakage), ejecución, re-run y comparación.
6. **Hallazgos / Backlog** — Severidad, estados, recomendaciones, comentarios e historial.
7. **Informes y exportaciones** — PDF técnico/ejecutivo, CSV y JSON.
8. **Administración de plataforma** — Gestión de organizaciones y biblioteca global (rol Admin).

---

## 10. Interfaz de usuario (mockups)

La interfaz es una **aplicación web responsive**, orientada a datos útiles (score de riesgo, hallazgos críticos, estado de campañas) y usable por perfiles técnicos y no técnicos.

### 10.1 Acceso a los mockups

- **Figma (diseño en curso):**  
  https://www.figma.com/design/Je7ZrALvR2fYkw1A38qcIV/MK-SERVICE?node-id=1-2&t=jFhDE45pGpRbbuIN-1

- **Exportaciones de referencia del proyecto:** mockups consolidados (Login, Dashboard, Targets, Campañas, Documentos, Organización).

> Nota: Si el enlace de Figma requiere permisos, usar las exportaciones PDF/PNG del repositorio de diseño del proyecto.

### 10.2 Pantallas prioritarias del MVP

| # | Pantalla | Propósito |
|---|----------|-----------|
| 1 | Login | Acceso seguro a la plataforma |
| 2 | Dashboard | Resumen de riesgo, métricas, campañas y hallazgos críticos |
| 3 | Lista / crear Target | Registrar y validar el RAG del cliente |
| 4 | Lista de Campañas | Seguimiento de auditorías |
| 5 | Crear Campaña | Scope, documentos de ataque, programación |
| 6 | Detalle de Campaña | Progreso, acciones, enlace a backlog e informes |
| 7 | Backlog de hallazgos | Gestión de vulnerabilidades y estados |
| 8 | Detalle de hallazgo | Evidencia, recomendación, comentarios |
| 9 | Documentos de ataque | Biblioteca global y de la organización |
| 10 | Organización y usuarios | Miembros, roles e invitación |

### 10.3 Criterios de diseño

- Estilo SaaS B2B profesional (claro, denso en datos, no decorativo).
- Light mode prioritario; dark mode previsto.
- Badges de severidad y estado bien diferenciados.
- Accesibilidad básica (contraste, foco visible, no depender solo del color).

---

## 11. Base de datos (resumen)

Existen dos scripts alineados al mismo modelo conceptual:

| Entorno | Motor | Archivo |
|---------|--------|---------|
| Académico (clase de BD) | SQL Server | `db/mk_service_sqlserver.sql` |
| Desarrollo del producto | PostgreSQL | `db/mk_service_postgresql.sql` |

Características:

- Normalización a tercera forma normal.
- Multi-tenancy por organizaciones.
- Catálogos (roles, severidades, estados, categorías de ataque, modos de conexión).
- Campañas, hallazgos con historial, documentos de ataque, reportes y API keys.
- En SQL Server: logins por rol, enmascaramiento de datos sensibles y principio de menor privilegio.

El detalle del modelo y la seguridad de logins se documentan en la asignatura de bases de datos; aquí solo se referencia el diseño como parte del proyecto de programación.

---

## 12. Roles de usuario (aplicación)

| Rol | Descripción |
|-----|-------------|
| **Admin** | Administrador de la plataforma (todas las organizaciones). |
| **Owner** | Dueño de la organización; gestiona miembros y puede lanzar auditorías. |
| **Auditor** | Configura targets, ejecuta campañas y gestiona el backlog. |
| **Viewer** | Solo lectura de reportes y backlog. |

Puede haber varios Owners por organización.

---

## 13. Resultados esperados

Al finalizar el desarrollo del MVP se espera:

1. API documentada y funcional según el manual técnico.
2. Frontend que cubra los flujos principales de auditoría.
3. Campañas ejecutables de forma asíncrona con generación de hallazgos e informes.
4. Base de datos desplegable (SQL Server para clase; PostgreSQL para el producto).
5. Documentación de proyecto suficiente para evaluación académica y continuidad del producto.

---

## 14. Cronograma orientativo

| Etapa | Contenido |
|-------|-----------|
| Definición | Problema, objetivos, alcance, SRS |
| Diseño | Arquitectura, API, BD, mockups |
| Implementación base | Auth, organizaciones, targets |
| Implementación núcleo | Campañas, workers, detección, backlog |
| Informes y UX | PDFs, exportaciones, pulido de UI |
| Cierre | Pruebas, documentación, entrega |


---

## 15. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Endpoints del cliente inestables o mal documentados | Prueba de conectividad al crear el Target; estados `active` / `error` |
| Campañas largas que bloquean la UI | Procesamiento asíncrono con cola (RQ) |
| Alcance excesivo | MVP estricto (solo PI + Data Leakage, sin CI/CD ni on-prem) |
| Usabilidad para no técnicos | Dashboard orientado a datos; roles con vistas diferenciadas |
| Cumplimiento académico vs producto | Dos scripts de BD (SQL Server / PostgreSQL) y documentación por asignatura |

---

## 16. Relación con otros documentos del proyecto

| Documento | Contenido |
|-----------|-----------|
| Anteproyecto / research | Investigación y justificación académica |
| Documento de BD | Modelo, scripts, seguridad de logins (asignatura BD) |
| `03_srs_requirements.md` | Requisitos de software |
| `04_sad_architecture.md` | Arquitectura y ADRs |
| `05_api_technical_manual.md` | Contrato de la API |
| `08_general_document.md` (este) | Visión general del proyecto de programación |

---

## 17. Conclusión

MK Service integra en un solo producto los elementos propios de un proyecto integrador: análisis, diseño, implementación full-stack, datos, seguridad y experiencia de usuario, aplicados a un problema actual de ciberseguridad en sistemas RAG.

Este documento sirve como marco general. El detalle técnico se desarrolla en los documentos de requisitos, arquitectura, API y base de datos, y la interfaz se valida mediante los mockups referenciados.

---

## 18. Referencias

- OWASP Top 10 for Large Language Model Applications
- NIST AI Risk Management Framework
- Documentación interna del proyecto: SRS, SAD, Manual de API, scripts de BD
- Mockups de interfaz (Figma y exportaciones del diseño)

---

**Fin del documento 08 — Documento general v1.0**
