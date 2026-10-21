# 04 — Software Architecture Document (SAD)
## MK Service: Auditoría Automatizada de Prompt Injection y Data Leakage en Sistemas RAG

| Campo              | Valor                                      |
|--------------------|--------------------------------------------|
| **Versión**        | 1.0                                        |
| **Fecha**          | Septiembre 2026                            |
| **Estado**         | Aprobado para MVP                          |
| **Producto**       | MK Service                                 |
| **Relacionado con**| 03_srs_requisitos.md v1.0                  |
| **Estilo**         | Conceptual + Técnico                       |

---

## 1. Introducción

Este documento describe la arquitectura de software de **MK Service**.  
Su propósito es definir *cómo* se construirá el sistema para cumplir los requisitos especificados en el SRS, garantizando seguridad, escalabilidad, mantenibilidad y una experiencia de usuario adecuada tanto para perfiles técnicos como no técnicos.

MK Service es una plataforma SaaS de auditoría externa. No se integra al pipeline CI/CD ni a la infraestructura interna del cliente. Una vez el cliente proporciona los endpoints necesarios, el sistema genera y envía automáticamente los documentos y consultas de prueba.

---

## 2. Objetivos Arquitectónicos

| Objetivo                          | Prioridad | Cómo se logra                                                |
|-----------------------------------|-----------|--------------------------------------------------------------|
| Seguridad por diseño              | Crítica   | Multi-tenancy estricto, cifrado, least privilege, logs de auditoría |
| Procesamiento asíncrono           | Alta      | Cola de trabajos (RQ) para campañas largas                   |
| Escalabilidad horizontal          | Alta      | Workers independientes + Object Storage                      |
| Aislamiento entre organizaciones  | Crítica   | PostgreSQL + Row Level Security + paths separados en storage |
| Facilidad de actualización de ataques | Alta  | Biblioteca de documentos desacoplada del core                |
| Usabilidad multi-perfil           | Alta      | Una sola aplicación web que adapta la información según el rol |

---

## 3. Vista de Contexto (C4 Level 1)

MK Service interactúa con los siguientes actores y sistemas externos:

**Actores humanos:**
- Owner
- Auditor
- Viewer
- Admin (plataforma)

**Sistemas externos:**
- Target RAG del cliente (endpoint de chat y, en Modo Completo, endpoint de carga de documentos)
- Object Storage (documentos de ataque e informes PDF)
- Redis (cola de trabajos)

```text
┌─────────────────┐          ┌──────────────────────┐          ┌─────────────────────┐
│  Owner          │          │                      │          │  Target RAG         │
│  Auditor        │─────────▶│     MK Service       │◀─────────│  (Cliente)          │
│  Viewer         │          │     (SaaS Cloud)     │          │  - Chat endpoint    │
│  Admin          │          │                      │          │  - Upload endpoint  │
└─────────────────┘          └──────────┬───────────┘          └─────────────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
               ┌──────────────────────┐    ┌──────────────────────┐
               │  Object Storage      │    │  Redis (Queue)       │
               │  (docs + PDFs)       │    │                      │
               └──────────────────────┘    └──────────────────────┘
```

---

## 4. Vista de Contenedores (C4 Level 2)

### 4.1 Componentes principales

| Componente              | Responsabilidad principal                                      | Tecnología                          |
|-------------------------|----------------------------------------------------------------|-------------------------------------|
| **Web Frontend**        | Interfaz de usuario (dashboard, campañas, backlog, informes)  | React + Vite + Tailwind CSS         |
| **API Backend**         | Expone la API REST, autenticación, lógica de negocio          | FastAPI (Python)                    |
| **Auth Module**         | Login, emisión y validación de JWT, gestión de roles          | Dentro de FastAPI                   |
| **Campaign Manager**    | Crea campañas, las encola y gestiona su ciclo de vida         | FastAPI + lógica de dominio         |
| **Worker Pool**         | Ejecuta las campañas de forma asíncrona                       | Python + RQ                         |
| **Detection Engine**    | Analiza las respuestas del Target y genera hallazgos          | Python (dentro de los workers)      |
| **Report Generator**    | Genera los PDF ejecutivo y técnico                            | Python (WeasyPrint o similar)       |
| **PostgreSQL**          | Datos de usuarios, organizaciones, campañas, hallazgos, backlog | PostgreSQL + Row Level Security   |
| **Object Storage**      | Documentos de ataque e informes PDF                           | S3-compatible (MinIO / R2 / S3)     |
| **Message Queue**       | Cola de trabajos para las campañas                            | Redis + RQ                          |

### 4.2 Diagrama lógico de contenedores

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MK Service (Cloud)                             │
│                                                                             │
│  ┌──────────────┐       ┌──────────────────────────────────────────────┐   │
│  │ Web Frontend │──────▶│              FastAPI Backend                 │   │
│  │ React +      │       │  - Auth (JWT)                                │   │
│  │ Tailwind     │       │  - Campaign Manager                          │   │
│  └──────────────┘       │  - API REST                                  │   │
│                         └──────────────────┬───────────────────────────┘   │
│                                            │                               │
│                                            ▼                               │
│                         ┌──────────────────────────────────────────────┐   │
│                         │           Redis + RQ (Queue)                 │   │
│                         └──────────────────┬───────────────────────────┘   │
│                                            │                               │
│                                            ▼                               │
│                         ┌──────────────────────────────────────────────┐   │
│                         │           Worker Pool                        │   │
│                         │  - Detection Engine                          │   │
│                         │  - Report Generator                          │   │
│                         └──────────────────┬───────────────────────────┘   │
│                                            │                               │
│              ┌─────────────────────────────┼─────────────────────────┐     │
│              ▼                             ▼                         ▼     │
│  ┌──────────────────┐          ┌──────────────────┐      ┌──────────────┐ │
│  │   PostgreSQL     │          │ Object Storage   │      │ Target RAG   │ │
│  │   (+ RLS)        │          │ (docs + PDFs)    │      │ (Cliente)    │ │
│  └──────────────────┘          └──────────────────┘      └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Decisiones de Arquitectura (ADRs)

### ADR-001 — Backend con FastAPI
**Decisión:** Usar Python + FastAPI como backend principal.  
**Estado:** Aceptada  
**Contexto:** Se necesita una API robusta, tipada y con buen soporte para tareas relacionadas con IA y procesamiento asíncrono.  
**Consecuencias:** Desarrollo rápido, excelente ecosistema de librerías y buen rendimiento para el caso de uso.

### ADR-002 — Base de datos PostgreSQL + Row Level Security
**Decisión:** PostgreSQL como base de datos principal, usando Row Level Security (RLS) para multi-tenancy.  
**Estado:** Aceptada  
**Contexto:** Se requiere aislamiento fuerte entre organizaciones y soporte sólido para relaciones y cumplimiento.  
**Consecuencias:** Seguridad a nivel de base de datos y consultas más seguras por defecto.

### ADR-003 — Procesamiento asíncrono con RQ + Redis
**Decisión:** Las campañas se procesan de forma asíncrona usando RQ (Redis Queue).  
**Estado:** Aceptada  
**Contexto:** Las campañas pueden tardar minutos y varias pueden ejecutarse en paralelo dentro de la misma u otras organizaciones.  
**Consecuencias:** Mejor experiencia de usuario y capacidad de escalar workers horizontalmente.

### ADR-004 — Almacenamiento híbrido (PostgreSQL + Object Storage)
**Decisión:** Metadata y estados en PostgreSQL. Archivos (documentos de ataque e informes PDF) en Object Storage S3-compatible.  
**Estado:** Aceptada  
**Contexto:** Se necesita disponibilidad, capacidad y separación clara entre datos estructurados y archivos binarios.  
**Consecuencias:** Escalabilidad de almacenamiento y menor carga en la base de datos.

### ADR-005 — Autenticación propia con JWT dentro de FastAPI
**Decisión:** Autenticación implementada dentro de FastAPI usando JWT.  
**Estado:** Aceptada  
**Contexto:** Se busca simplicidad en el MVP manteniendo buenas prácticas de seguridad.  
**Consecuencias:** Control total del flujo de autenticación. Posibilidad de evolucionar a SSO (SAML/OIDC) más adelante.

### ADR-006 — Aplicación web responsive con React + Tailwind
**Decisión:** La interfaz de usuario se entrega como aplicación web responsive desarrollada con React + Vite + Tailwind CSS.  
**Estado:** Aceptada  
**Contexto:** Priorizar velocidad de desarrollo, actualizaciones instantáneas y acceso multi-dispositivo.  
**Consecuencias:** Una sola base de código para todos los perfiles de usuario (Owner, Auditor, Viewer, Admin).

---

## 6. Flujo de una Campaña de Auditoría

1. El **Auditor** (o Owner) crea una campaña desde el Frontend:
   - Selecciona Target
   - Elige modo (Básico o Completo)
   - Selecciona documentos de ataque (predefinidos + personalizados)
   - Confirma la creación

2. El **Frontend** envía la petición a la **API (FastAPI)**.

3. El **Campaign Manager**:
   - Valida permisos y datos
   - Crea el registro de la campaña en PostgreSQL (estado: `queued`)
   - Encola un trabajo en **RQ (Redis)**

4. Un **Worker** toma el trabajo de la cola y ejecuta la campaña:
   - Si es Modo Completo → sube los documentos de ataque al endpoint del cliente
   - Envía las consultas al endpoint de chat del Target
   - Recibe las respuestas

5. El **Detection Engine** (dentro del Worker):
   - Analiza cada respuesta
   - Genera los hallazgos (vulnerabilidades)
   - Crea las entradas correspondientes en el Backlog

6. El **Report Generator**:
   - Genera el PDF Ejecutivo y el PDF Técnico
   - Los guarda en Object Storage
   - Actualiza las rutas en PostgreSQL

7. El Worker marca la campaña como `completed` en la base de datos.

8. El Frontend (mediante polling o mecanismo equivalente) muestra el estado actualizado y permite descargar los informes y consultar el backlog.

---

## 7. Seguridad de la Arquitectura

- **Multi-tenancy:** Aislamiento estricto mediante Row Level Security en PostgreSQL y rutas separadas en Object Storage.
- **Autenticación:** JWT de corta duración + refresh tokens. Contraseñas hasheadas con algoritmos seguros (Argon2 o bcrypt).
- **Comunicación:** HTTPS obligatorio (TLS 1.2+).
- **Secretos de Targets:** Almacenados cifrados en la base de datos.
- **Principio de menor privilegio:** Cada rol solo puede realizar las acciones definidas en el SRS.
- **Auditoría:** Todas las acciones relevantes se registran en un log de auditoría.
- **Documentos de ataque:** Los documentos personalizados de una organización nunca son visibles ni accesibles por otras organizaciones.

---

## 8. Despliegue (visión MVP)

| Entorno       | Tecnología recomendada                          |
|---------------|-------------------------------------------------|
| Desarrollo    | Docker Compose (FastAPI + PostgreSQL + Redis + MinIO) |
| Producción    | Contenedores en un proveedor Cloud (Railway, Render, Fly.io, o Kubernetes básico) |
| Object Storage| MinIO (desarrollo) / Cloudflare R2 o AWS S3 (producción) |
| Workers       | Procesos RQ escalables horizontalmente          |

---

## 9. Consideraciones de Evolución

- **On-premise:** Se deja fuera del MVP. Se evaluará en una fase posterior (Enterprise).
- **SSO:** Se podrá agregar soporte SAML/OIDC sin cambiar la arquitectura base de autenticación.
- **Notificaciones:** Se pueden agregar webhooks o email de forma incremental.
- **Más vector stores / proveedores:** El diseño de Targets permite extender los tipos de conexión.

---

## 10. Apéndices

### A. Relación con el SRS

Este documento de arquitectura implementa todos los requisitos funcionales (RF-01 a RF-10) y no funcionales definidos en `03_srs_requisitos.md` v1.0.

### B. Historial de cambios

| Versión | Fecha            | Descripción                                      | Autor              |
|---------|------------------|--------------------------------------------------|--------------------|
| 1.0     | Septiembre 2026  | Primera versión completa construida colaborativamente | Equipo MK Service |

---

**Fin del documento SAD v1.0**

> Este documento ha sido construido de forma iterativa y colaborativa.  
> Cualquier cambio posterior debe versionarse y comunicarse al equipo.
