---
lang: es-ES
toc: true
toc-depth: 3
toc-title: "Tabla de Contenido"
numbersections: true
geometry: margin=2.5cm
fontsize: 11pt
colorlinks: true
linkcolor: black
urlcolor: mkblue
header-includes:
  - \usepackage{graphicx}
  - \usepackage{xcolor}
  - \definecolor{mkblue}{HTML}{1F4E79}
  - \definecolor{mkgreen}{HTML}{2E7D32}
  - \definecolor{mkgray}{HTML}{F5F5F5}
  - \definecolor{mkline}{HTML}{BFBFBF}
  - \usepackage{colortbl}
  - \usepackage{longtable}
  - \usepackage{array}
  - \usepackage{etoolbox}
  - \usepackage{caption}
  - \captionsetup{labelformat=empty,font={small,it},justification=centering}
  - \usepackage{float}
  - \floatplacement{figure}{H}
  - \usepackage{tocloft}
  - \setlength{\cftsecnumwidth}{2.4em}
  - \setlength{\cftsubsecnumwidth}{3.4em}
  - \renewcommand{\cfttoctitlefont}{\Large\bfseries\color{mkblue}}
  - \usepackage{sectsty}
  - \allsectionsfont{\color{mkblue}\bfseries}
  - \renewcommand{\thesection}{\arabic{section}.}
  - \renewcommand{\thesubsection}{\arabic{section}.\arabic{subsection}.}
  - \IfFontExistsTF{Calibri}{\setmainfont{Calibri}}{\IfFontExistsTF{Carlito}{\setmainfont{Carlito}}{}}
  - \IfFontExistsTF{Consolas}{\setmonofont{Consolas}}{\IfFontExistsTF{DejaVu Sans Mono}{\setmonofont[Scale=0.85]{DejaVu Sans Mono}}{}}
  - \usepackage{newunicodechar}
  - \IfFontExistsTF{Segoe UI Symbol}{\newfontfamily\symfont{Segoe UI Symbol}}{\newfontfamily\symfont{DejaVu Sans}}
  - \newunicodechar{✔}{{\symfont ✔}}
  - \newunicodechar{⋈}{{\symfont ⋈}}
  - \usepackage{fvextra}
  - \usepackage{mdframed}
  - \RecustomVerbatimEnvironment{verbatim}{Verbatim}{breaklines=true,fontsize=\footnotesize}
  - \surroundwithmdframed[backgroundcolor=mkgray,linecolor=black!80,linewidth=0.6pt,innerleftmargin=6pt,innerrightmargin=6pt,innertopmargin=5pt,innerbottommargin=5pt]{verbatim}
  - \setlength{\parskip}{6pt}
  - \setlength{\parindent}{0pt}
include-before:
  - |
    \thispagestyle{empty}
    \begin{center}
    \vspace*{1cm}

    {\LARGE\bfseries MK SERVICE - Auditoría Automatizada de Prompt Injection y Data Leakage en Sistemas RAG}

    \vspace{1.5cm}

    \includegraphics[width=0.35\textwidth]{../assets/academic/01_data_base/etitc-logo.png}

    \vspace{1.5cm}

    \textbf{Presentado por:}\\[4pt]
    Juan Herrera\\
    Jonathan Pérez\\
    Cristhian Bermúdez

    \vspace{1.5cm}

    \textbf{Asignatura:}\\[4pt]
    Bases de Datos II | S6C

    \vfill

    Escuela Tecnológica Instituto Técnico Central\\
    Bogotá D.C., 2026\\
    v1.3

    \vspace*{0.5cm}
    \end{center}
    \newpage
---

\newpage

# Nota sobre esta versión (1.3) {-}

Esta versión **reemplaza el modelo relacional de 11 tablas** (v1.2) por el modelo alineado a la arquitectura del producto MK Service (SRS, SAD y Manual de API), sin cambiar el propósito del proyecto: auditoría de Prompt Injection y Data Leakage en sistemas RAG.

Cambios principales respecto a v1.2:

- Multi-tenancy real mediante `organizaciones` y `organizacion_miembros` (varios Owners por organización).
- Targets con modos de conexión `basic` / `complete`, prueba de conectividad y metadatos de autenticación.
- Campañas con alcance (`audit_scope`), documentos de ataque, re-ejecución (`campania_padre_id`) e historial de estados.
- Biblioteca de documentos de ataque (global y por organización).
- Backlog de hallazgos con estados de gestión, asignación, comentarios e historial.
- Reportes tipados (ejecutivo / técnico) y API keys.
- Script académico canónico en **SQL Server** (`mk_service_sqlserver.sql`) con 4 logins de clase + login de aplicación, Dynamic Data Masking y roles de menor privilegio.
- Script de desarrollo en **PostgreSQL** (`mk_service_postgresql.sql`), nomenclatura en inglés.
- Se conservan y refuerzan integridad (PK/FK/UNIQUE/CHECK), catálogos, trazabilidad, seeds y evidencia de ejecución.

Según la política de versionado del proyecto (`versioning.md`): Aclaraciones, correcciones, reemplazo de contenido **sin cambiar el alcance del producto** → **MINOR (1.2 → 1.3)**.

\newpage

# Introducción y contexto

El presente documento establece la documentación formal, siguiendo la estructura exigida por la asignatura, del diseño relacional de base de datos de **MK Service**: Auditoría Automatizada de Prompt Injection y Data Leakage en Sistemas RAG.

**MK Service no es el sistema auditado**, es la plataforma que registra targets, ejecuta campañas de prueba (Prompt Injection directo/indirecto y Data Leakage), genera hallazgos con backlog de recomendaciones e informes de seguridad.

La base de datos está diseñada en **Tercera Forma Normal (3FN)**, con catálogos de dominio, multi-tenancy, historiales de estado inmutables y controles de integridad (PK, FK, UNIQUE, CHECK, DEFAULT).

## Antecedentes e intentos o proyectos previos

La evaluación de seguridad de sistemas de inteligencia artificial generativa es un campo emergente y, a diferencia de dominios más maduros (por ejemplo, gestión académica o financiera), no cuenta aún con un estándar de base de datos consolidado. Los antecedentes identificados se agrupan de la siguiente manera:

- Pruebas manuales ad hoc: equipos de seguridad redactan y ejecutan manualmente prompts de ataque, registrando resultados en hojas de cálculo o documentos de texto. El problema principal es la falta de trazabilidad histórica y la imposibilidad de comparar auditorías entre sí de forma estructurada.
- Herramientas de red-teaming de código abierto para LLM (p. ej. frameworks tipo Garak, PyRIT o Promptfoo): automatizan la generación y ejecución de payloads de ataque, pero su enfoque está puesto en el motor de ataque, no en un modelo organizacional multi-tenant con backlog e informes.
- Bases de datos internas de equipos de ciberseguridad tradicional: diseñadas para pentesting de aplicaciones web clásicas (OWASP Top 10 web), no contemplan entidades específicas para sistemas RAG (modelo LLM, proveedor, base vectorial) ni para las categorías de ataque propias de estos sistemas (Prompt Injection, Data Leakage).

MK Service parte de estos antecedentes para proponer un modelo relacional propio, centrado en organizaciones, campañas, documentos de ataque y backlog gestionable.

## Marco tecnológico

| Aspecto | Valor |
|:--|:--|
| Motor académico (clase) | Microsoft SQL Server (script `mk_service_sqlserver.sql`) |
| Motor de desarrollo del producto | PostgreSQL (script `mk_service_postgresql.sql`) |
| Normalización | 3FN |
| Nomenclatura académica (SQL Server) | Español, snake_case |
| Nomenclatura desarrollo (PostgreSQL) | Inglés, snake_case |
| Seguridad académica | Logins por rol, Dynamic Data Masking, least privilege |
| Diagrama ER | Generable desde el esquema (SSMS Database Diagrams o dbdiagram.io) |

## Situación actual del área en Colombia

En Colombia, la adopción de modelos de lenguaje y arquitecturas RAG por parte de empresas y entidades públicas ha crecido de forma acelerada, mientras que las capacidades formales de auditoría de seguridad para este tipo de sistemas aún están en una etapa temprana. La **Ley 1581 de 2012** (protección de datos personales), el **Decreto 1377 de 2013** y la **Circular SIC 002 de 2024** (datos personales en sistemas de IA) motivan plataformas como MK Service, capaces de dejar un registro trazable de pruebas sobre sistemas que procesan información sensible.

\newpage

# Objetivos del proyecto

## Objetivo general

Diseñar e implementar una base de datos relacional para la plataforma MK Service, que permita registrar, ejecutar y auditar de manera estructurada la resiliencia de sistemas RAG frente a ataques de Prompt Injection y riesgos de Data Leakage, garantizando trazabilidad completa e integridad referencial.

## Objetivos específicos

1. Definir el modelo entidad–relación alineado a la arquitectura del producto (SRS/SAD/API).
2. Implementar el esquema en SQL Server para la asignatura, con catálogos, restricciones e índices.
3. Incorporar multi-tenancy (`organizaciones`, `organizacion_miembros`) y roles de negocio (Owner, Auditor, Viewer, Admin de plataforma).
4. Modelar campañas con alcance de auditoría, documentos de ataque, re-ejecución e historial de estados y backlog de hallazgos.
5. Configurar seguridad de logins académicos y enmascaramiento de datos sensibles.
6. Entregar script equivalente de desarrollo en PostgreSQL.
7. Documentar diccionario de datos, cardinalidades y política de integridad.


\newpage

# Alcance del proyecto

## Alcance funcional

- Catálogos de dominio: roles, estados de usuario, severidades, estados de campaña, estados de hallazgo, categorías de ataque, modos de conexión.
- Multi-tenancy: organizaciones y miembros con rol por organización.
- Targets (sistemas RAG): modo basic/complete, endpoints, autenticación, rate limit, estado de conectividad.
- Documentos de ataque: alcance global u organización.
- Campañas: scope Prompt Injection / Data Leakage, documentos asociados, programación, progreso, campaña padre (re-run).
- Hallazgos: severidad, estado de backlog, evidencia, asignación, comentarios, historial.
- Reportes: tipo ejecutivo/técnico, idioma, estado de generación.
- API keys por organización.
- Logins y roles de SQL Server para cumplimiento académico.

## Exclusiones

- No se implementa en este entregable la aplicación web ni el motor de detección.
- No se integra CI/CD del cliente.
- El motor de escaneo se representa por datos y estados; la ejecución real corresponde al backend del producto.

## Límites y restricciones

- Script canónico de clase: SQL Server.
- Script de desarrollo: PostgreSQL.
- Ambos deben mantenerse sincronizados en el modelo conceptual.

\newpage

# Planteamiento del problema y justificación

## Problema central

¿Cómo estructurar e implementar una base de datos relacional que soporte auditoría externa multi-tenant de sistemas RAG, con campañas repetibles, backlog de hallazgos y exidencia trazable, evitando el uso de texto libre no controlado y garantizando la reconstrucción histórica exacta de cada auditoría?

## Justificación

Los riesgos de Prompt Injection y Data Leakage requieren registro estructurado de targets, vectores de ataque, resultados y seguimiento de mitigaciones. El modelo permite:

- Aislar datos por organización.
- Reconstruir el ciclo de vida de cada campaña y de cada hallazgo.
- Separar severidad del hallazgo del estado de gestión del backlog.
- Cumplir requisitos académicos de integridad, seguridad de logins y documentación formal.

El crecimiento de sistemas RAG en empresas y entidades públicas, junto con exigencias de la Ley 1581 de 2012 y lineamientos de la SIC sobre IA, refuerza la necesidad de evidencia auditable de las pruebas realizadas.

\newpage

# Glosario

| Término | Definición |
|:--|:--|
| BD | Base de datos. |
| DBMS / SGBD | Sistema gestor de bases de datos; en este proyecto, MySQL 8.0+ (motor alterno: SQL Server). |
| DDM | Dynamic Data Masking (SQL Server). |
| PK | Primary Key o clave primaria. |
| FK | Foreign Key o clave foránea. |
| UQ / UNIQUE | Restricción que evita duplicidad de valores. |
| CHECK | Restricción que limita los valores aceptados por una expresión. |
| DEFAULT | Valor asignado automáticamente cuando no se proporciona uno. |
| ER | Entidad–Relación. |
| N:M / 1:N | Cardinalidad muchos a muchos / uno a muchos. |
| 3FN | Tercera forma normal. |
| RAG | Retrieval-Augmented Generation: arquitectura que combina un modelo de lenguaje (LLM) con una base de conocimiento externa recuperada en tiempo de consulta. |
| LLM | Large Language Model o modelo de lenguaje de gran escala. |
| Prompt Injection | Técnica de ataque en la que se manipulan las instrucciones dadas a un LLM para alterar su comportamiento previsto; puede ser directa (en el prompt del usuario) o indirecta (embebida en contenido recuperado). |
| Data Leakage | Fuga de información confidencial desde la base de conocimiento, el prompt de sistema o el contexto del modelo. |
| Target | Sistema RAG del cliente registrado para auditoría. |
| Campaña | Ejecución de un conjunto de pruebas de ataque sobre un target. |
| Hallazgo | Vulnerabilidad o resultado detectado en una campaña. |
| Backlog | Conjunto de hallazgos gestionables (estado, prioridad, asignación). |
| Multi-tenancy | Aislamiento de datos por organización. |
| Payload | Contenido del caso de prueba utilizado para intentar provocar una vulnerabilidad en el sistema evaluado. |
| OWASP LLM Top 10 | Marco de referencia de la OWASP Foundation que clasifica los riesgos de seguridad más críticos en aplicaciones basadas en LLM. |

: Tabla 1. Glosario

\newpage

# Método de desarrollo

Fases técnicas:

1. Alineación del modelo con SRS, SAD y Manual de API.
2. Diseño ER y nomenclatura.
3. Implementación DDL en SQL Server (académico) y PostgreSQL (desarrollo).
4. Restricciones PK, FK, UNIQUE, CHECK, DEFAULT e índices.
5. Seguridad: logins, roles de DB, masking, DENY sobre historiales.
6. Seeds de catálogo.
7. Documentación (diccionario, cardinalidades, versionado).
8. Validación de ejecución en SSMS.

\newpage

# Requisitos del sistema de base de datos

Se describen requisitos funcionales verificables del producto.

| ID | Requisito | Prioridad | Evidencia |
|:--|:--|:--|:--|
| RF-BD-01 | Centralizar dominios controlados en catálogos | Must | roles, severidades, estados_*, categorias_ataque, modos_conexion |
| RF-BD-02 | Soportar multi-tenancy por organización | Must | organizaciones, organizacion_miembros |
| RF-BD-03 | Registrar usuarios y membresía con rol por org | Must | usuarios, organizacion_miembros |
| RF-BD-04 | Registrar targets con modo basic/complete y estado de conexión | Must | targets |
| RF-BD-05 | Gestionar documentos de ataque globales y por organización | Must | documentos_ataque |
| RF-BD-06 | Registrar campañas con scope, progreso y re-run | Must | campanias, campania_documentos |
| RF-BD-07 | Conservar historial de estados de campaña | Must | historial_estados_campania |
| RF-BD-08 | Registrar hallazgos con backlog gestionable | Must | hallazgos, hallazgo_comentarios, historial_estados_hallazgo |
| RF-BD-09 | Registrar reportes asociados a campañas | Must | reportes |
| RF-BD-10 | Soportar API keys por organización | Should | api_keys |
| RF-BD-11 | Impedir inconsistencias mediante CHECK y FK | Must | constraints del script |
| RF-BD-12 | Logins académicos con menor privilegio | Must | login_mk_* y roles de BD |

: Tabla 2. Requisitos del sistema de base de datos (RF-11 añadido en esta versión)

\newpage

# Ficha técnica / ficha de caso digital

| Aspecto | Valor documentado |
|:--|:--|
| Nombre del proyecto | MK Service — Auditoría Automatizada de Prompt Injection y Data Leakage en Sistemas RAG |
| Modelo | Relacional, normalizado hasta 3FN. |
| BD académica | `mk_service` (SQL Server) |
| BD desarrollo | `mk_service` (PostgreSQL) |
| Versión del esquema documentado | 1.3 |
| Autores | Juan Herrera, Jonathan Pérez, Cristhian Bermúdez |
| Asignatura | Bases de Datos II \| S6C |
| Certeza de requisitos | Alta: modelo alineado a SRS/SAD/API e implementado en script ejecutable |
| Riesgo técnico | Bajo-medio: relaciones y restricciones definidas; validación en SSMS |

: Tabla 3. Ficha técnica

\newpage

# Dimensiones de gestión del proyecto

| Dimensión | Situación documentada |
|:--|:--|
| Alcance | 20 tablas; multi-tenancy; campañas; backlog; reportes; seguridad de logins |
| Tiempo | Definido por el calendario de la asignatura |
| Costo | Proyecto académico |
| Riesgos | Ver sección de restricciones y gestión de riesgos |
| Adquisiciones / infraestructura | SQL Server (clase) y PostgreSQL (desarrollo); SSMS / cliente PostgreSQL |

: Tabla 4. Dimensiones de gestión del proyecto

# Stakeholders y clientes

| Stakeholder | Interés |
|:--|:--|
| Admin de plataforma | Gestión global de organizaciones y catálogos |
| Owner | Control del tenant, miembros y auditorías |
| Auditor | Targets, campañas, backlog |
| Viewer | Solo lectura de reportes y hallazgos |
| Docente | Evaluación de diseño, integridad y seguridad |
| DBA / desarrollo | Mantenimiento del esquema y scripts |
| Clientes potenciales | Empresas que operan sistemas RAG y equipos de seguridad |

: Tabla 5. Stakeholders y clientes

\newpage

# Restricciones y gestión de riesgos

| Riesgo / restricción | Impacto | Mitigación / estado |
|:--|:--|:--|
| Modelo v1.2 (11 tablas) desalineado de la arquitectura del producto | Alto | RESUELTO en v1.3: modelo de 20 tablas multi-tenant alineado a SRS/SAD/API |
| Uso del login `sa` | Medio | No se usa `sa` en la aplicación; logins propios; se recomienda deshabilitar `sa` a nivel de instancia |
| Falta de multi-tenancy | Alto | RESUELTO: `organizaciones` + `organizacion_miembros` |
| Historiales modificables | Medio | DENY UPDATE/DELETE sobre tablas de historial para `public` |
| Scripts de distintos motores desincronizados | Medio | Canónico académico = SQL Server; desarrollo = PostgreSQL; mismo modelo conceptual |
| Evidencia de ejecución incompleta | Alto | Ejecutar script en SSMS y adjuntar capturas (Anexo B) |

: Tabla 6. Restricciones y gestión de riesgos (estado actualizado tras corrección)

\newpage

# EDT / WBS y estimación de trabajo

| ID | Paquete | Actividad | Dependencia |
|:--|:--|:--|:--|
| 1 | Análisis del dominio | Entidades alineadas a arquitectura del producto | — |
| 2 | Modelo conceptual | Diagrama entidad–relación | 1 |
| 3 | Diseño lógico | PK, FK, nomenclatura, CHECK | 2 |
| 4 | Implementación SQL Server | DDL académico completo | 3 |
| 5 | Seguridad | Logins, roles, masking, DENY | 4 |
| 6 | Script PostgreSQL | Equivalente de desarrollo | 3 |
| 7 | Seeds | Catálogos de dominio | 4 |
| 8 | Validación | Ejecución en SSMS y pruebas de restricción | 5, 7 |
| 9 | Documentación | Diccionario, ER, anexos, control de cambios | 8 |

: Tabla 7. EDT / WBS

\newpage

# Infraestructura necesaria

| Componente | Requisito / situación |
|:--|:--|
| Motor académico | Microsoft SQL Server + SSMS 22 |
| Motor de desarrollo | PostgreSQL 14+ |
| Administración | SSMS (clase); psql / pgAdmin (desarrollo) |
| Seguridad | password_hash / hash_contrasena; nunca texto plano; DDM en SQL Server |
| Licenciamiento | SQL Server según política institucional; PostgreSQL libre |

: Tabla 8. Infraestructura necesaria

# Metadatos del proyecto de base de datos

| Metadato | Valor |
|:--|:--|
| Nombre BD | mk_service |
| Motor académico | SQL Server |
| Motor desarrollo | PostgreSQL |
| Versión del esquema | 1.3 |
| Autores | Juan Herrera, Jonathan Pérez, Cristhian Bermúdez |
| Propósito | Auditoría automatizada de Prompt Injection y Data Leakage en sistemas RAG |
| Normalización | 3FN |
| Tablas | 20 |

: Tabla 9. Metadatos del proyecto

\newpage

# Nomenclatura propuesta

Con el fin de garantizar consistencia, legibilidad y facilidad de mantenimiento del modelo, se adoptan las siguientes convenciones de nomenclatura en todo el esquema:

| Aspecto | SQL Server (académico) | PostgreSQL (desarrollo) |
|:--|:--|:--|
| Idioma | Español | Inglés |
| Estilo | snake_case | snake_case |
| PK | `<entidad>_id` | `<entity>_id` |
| Banderas | activo, verificado | is_active, is_verified |
| Fechas | fecha_creacion, *_at | created_at, *_at |
| Tablas | Plural (campanias, hallazgos) | Plural (campaigns, findings) |

: Tabla 10. Nomenclatura propuesta

\newpage

# Descripción del modelo de datos

El modelo se organiza en módulos normalizados a 3FN: catálogos, multi-tenant e identidad, targets y documentos de ataque, campañas, hallazgos/backlog, reportes y API keys.

## Catálogo de tablas

| # | Tabla (SQL Server) | Clasificación | Propósito |
|:--|:--|:--|:--|
| 1 | roles | Catálogo | Roles de negocio y de plataforma |
| 2 | estados_usuario | Catálogo | Estados de cuenta |
| 3 | severidades | Catálogo | Low a Critical (nivel 1–4) |
| 4 | estados_campania | Catálogo | queued, running, completed, failed, cancelled |
| 5 | estados_hallazgo | Catálogo | open, in_progress, resolved, false_positive, accepted_risk |
| 6 | categorias_ataque | Catálogo | PI directo, PI indirecto, Data Leakage |
| 7 | modos_conexion | Catálogo | basic, complete |
| 8 | organizaciones | Multi-tenant | Tenants del SaaS |
| 9 | usuarios | Identidad | Cuentas de la plataforma |
| 10 | organizacion_miembros | Multi-tenant | Usuario–organización–rol |
| 11 | targets | Negocio | Sistemas RAG auditables |
| 12 | documentos_ataque | Negocio | Payloads / datasets de ataque |
| 13 | campanias | Transaccional | Ejecuciones de auditoría |
| 14 | campania_documentos | N:M | Documentos usados en una campaña |
| 15 | historial_estados_campania | Historial | Transiciones de estado de campaña |
| 16 | hallazgos | Transaccional | Resultados / vulnerabilidades |
| 17 | hallazgo_comentarios | Negocio | Comentarios del backlog |
| 18 | historial_estados_hallazgo | Historial | Transiciones de estado del hallazgo |
| 19 | reportes | Transaccional | Informes generados |
| 20 | api_keys | Seguridad | Claves de acceso programático |

: Tabla 11. Catálogo de tablas (20 tablas)

## Diagrama Entidad–Relación

![Ilustración 1. Diagrama Entidad–Relación de MK Service (generado con dbdiagram.io a partir del esquema ejecutado)](../assets/academic/01_data_base/mk-erd.png){height=20cm}

\newpage

## Cardinalidades principales

| Origen | Destino | Cardinalidad | Interpretación |
|:--|:--|:--|:--|
| organizaciones | organizacion_miembros | 1:N | Una org tiene muchos miembros |
| usuarios | organizacion_miembros | 1:N | Un usuario puede pertenecer a varias orgs |
| roles | organizacion_miembros | 1:N | Un rol se asigna a muchas membresías |
| organizaciones | targets | 1:N | Targets aislados por tenant |
| targets | campanias | 1:N | Varias campañas por target |
| campanias | campanias | 1:0..N | Re-run vía campania_padre_id |
| campanias | hallazgos | 1:N | Hallazgos por campaña |
| campanias | reportes | 1:N | Informes por campaña |
| hallazgos | hallazgo_comentarios | 1:N | Comentarios del backlog |
| documentos_ataque | campania_documentos | 1:N | Documento reutilizable en campañas |
| campanias | campania_documentos | 1:N | Campaña usa varios documentos |

: Tabla 12. Cardinalidades principales

\newpage

# Diccionario de datos

Resumen por módulo. El detalle de tipos y constraints está en el script `mk_service_sqlserver.sql`.

## Catálogos

**roles:** rol_id (PK), codigo_rol (UQ), nombre_rol (UQ), descripcion, es_plataforma, activo, fecha_creacion.

**estados_usuario:** active, invited, disabled, blocked, pending.

**severidades:** codigo, nombre, nivel (CHECK 1–4), descripcion.

**estados_campania:** queued, running, completed, failed, cancelled.

**estados_hallazgo:** open, in_progress, resolved, false_positive, accepted_risk.

**categorias_ataque:** prompt_injection_direct, prompt_injection_indirect, data_leakage.

**modos_conexion:** basic (solo chat), complete (chat + upload).

## Multi-tenant e identidad

**organizaciones:** nombre, idioma_default (CHECK es|en), activo.

**usuarios:** correo (UQ, CHECK formato, MASKED email), hash_contrasena (MASKED), nombre_completo (MASKED partial), es_admin_plataforma, estado_usuario_id, verificado.

**organizacion_miembros:** UQ (organizacion_id, usuario_id); rol por membresía (permite varios Owners).

## Targets y documentos

**targets:** modo_conexion_id, chat_endpoint (CHECK http/https), upload_endpoint, tipo_auth (bearer|api_key|none), auth_valor_cifrado (MASKED), headers_extra_json, rate_limit_rpm, estado_conexion, último test.

**documentos_ataque:** alcance global|organization con CHECK de coherencia con organizacion_id; categoria; version_doc; ruta de almacenamiento.
## Campañas y hallazgos

**campanias:** scope_prompt_injection / scope_data_leakage (al menos uno), config_json, programada_at, progreso 0–100, campania_padre_id, fechas con CHECK de coherencia.

**campania_documentos:** N:M campaña–documento.

**historial_estados_campania / historial_estados_hallazgo:** orientados a append; DENY UPDATE/DELETE a public.

**hallazgos:** titulo, descripcion, recomendacion, prioridad_orden, evidencia, asignado_a, estado, severidad.

**hallazgo_comentarios:** mensaje, usuario, fecha.

## Reportes y API keys

**reportes:** tipo executive|technical, idioma es|en, estado generating|ready|failed.

**api_keys:** prefijo + hash, scopes_json, organizacion_id.

\newpage

# Relaciones entre tablas

Las claves foráneas conectan:

- usuarios → estados_usuario
- organizacion_miembros → organizaciones, usuarios, roles
- targets → organizaciones, modos_conexion, usuarios
- documentos_ataque → organizaciones, categorias_ataque, usuarios
- campanias → organizaciones, targets, modos_conexion, estados_campania, campanias (padre), usuarios
- campania_documentos → campanias, documentos_ataque
- historial_estados_campania → campanias, estados_campania, usuarios
- hallazgos → campanias, documentos_ataque, categorias_ataque, severidades, estados_hallazgo, usuarios
- hallazgo_comentarios → hallazgos, usuarios
- historial_estados_hallazgo → hallazgos, estados_hallazgo, usuarios
- reportes → campanias, usuarios
- api_keys → organizaciones, usuarios

\newpage

# Restricciones e índices

## Integridad

- PK en las 20 tablas.
- FK con políticas explícitas (CASCADE en ciclos de vida de campaña/historial donde corresponde).
- UNIQUE en códigos de catálogo, correo y membresía org–usuario.
- CHECK en idiomas, scopes, estados, URLs, rate limit, progreso, coherencia global/organización de documentos y severidad.
- DEFAULT de fechas y banderas activas.

## Índices

Índices sobre FKs y columnas de filtro frecuentes: organizacion_id, estado_conexion, estado de campaña/hallazgo, severidad, asignado_a, campania_padre_id, etc.

## Seguridad académica (SQL Server)

| Login | Rol BD | Permiso |
|:--|:--|:--|
| login_mk_superadmin | rol_mk_superadmin | CONTROL + UNMASK |
| login_mk_owner | rol_mk_owner_db | SELECT/INSERT/UPDATE/DELETE + UNMASK |
| login_mk_reader | rol_mk_datareader | Solo SELECT |
| login_mk_writer | rol_mk_datawriter | INSERT/UPDATE (+ SELECT mínimo), DENY DELETE |
| login_mk_app | rol_mk_aplicacion | SELECT/INSERT/UPDATE, DENY DELETE, UNMASK |

No se utiliza el login `sa` para la aplicación. Se recomienda deshabilitarlo a nivel de instancia.

Dynamic Data Masking aplicado a correo, hash de contraseña, nombre completo, secretos de target y extractos sensibles de hallazgos.

\newpage

# Script completo de creación

El DDL ejecutable y la seguridad de logins están en:

| Archivo | Motor | Uso |
|:--|:--|:--|
| `db/mk_service_sqlserver.sql` | SQL Server | Entrega académica / SSMS |
| `db/mk_service_postgresql.sql` | PostgreSQL | Desarrollo del producto |

El script SQL Server:

1. Elimina y recrea la base `mk_service`.
2. Crea catálogos, multi-tenant, targets, documentos, campañas, hallazgos, reportes y api_keys.
3. Crea índices.
4. Inserta seeds de catálogo.
5. Crea logins, usuarios de BD, roles y permisos.
6. Verifica el conteo de tablas al final.

> Se mantiene el DDL en archivos `.sql` del repositorio para evitar divergencia entre documento y script ejecutable.

## Seeds de catálogo

- 4 roles (admin, owner, auditor, viewer)
- 5 estados de usuario
- 4 severidades
- 5 estados de campaña
- 5 estados de hallazgo
- 3 categorías de ataque
- 2 modos de conexión

Los datos operativos de demostración (organizaciones, usuarios de app, campañas) pueden ampliarse en un `seed_demo.sql` sin alterar el DDL.

\newpage

# Resultado de los scripts ejecutados

Ejecutar en SSMS el archivo `mk_service_sqlserver.sql`.

Evidencia esperada:

- Creación de la base sin errores de objeto faltante.
- 20 tablas (`SELECT name FROM sys.tables ORDER BY name`).
- Logins listados al final del script.
- Pruebas recomendadas:
  - URL de target inválida → falla CHECK.
  - Documento `organization` sin `organizacion_id` → falla CHECK.
  - `login_mk_reader` intentando INSERT → permiso denegado.


\newpage

# Resumen técnico final de la base de datos

| Característica | v1.2 | v1.3 |
|:--|:--|:--|
| Nombre BD | rag_audit_platform | mk_service |
| Tablas | 11 | 20 |
| Multi-tenancy | No | Sí |
| Campañas / re-run | audits simples | campanias + padre |
| Documentos de ataque | test_cases planos | documentos_ataque global/org |
| Backlog | findings básicos | estados + comentarios + historial |
| Reportes tipados | path simple | executive/technical + idioma |
| API keys | No | Sí |
| Logins académicos | Parcial | 4 + app, least privilege |
| Masking | Limitado | DDM en campos sensibles |
| Scripts | MySQL + T-SQL antiguo | SQL Server + PostgreSQL alineados |

: Tabla 13. Resumen técnico comparativo

\newpage

# Conclusiones

- El modelo v1.3 unifica el entregable académico con la arquitectura real del producto MK Service.
- Se mantiene 3FN, integridad referencial fuerte y trazabilidad por historiales de campaña y hallazgo.
- La seguridad de clase (logins propios, roles, masking, sin uso de `sa`) queda cubierta.
- El diagrama ER y las capturas de ejecución en SSMS completan el ciclo de evidencia solicitado por el docente.

# Recomendaciones

- Embeber el PNG del ER generado (SSMS o dbdiagram.io).
- Adjuntar Anexo B con capturas reales de ejecución y pruebas de CHECK/permisos.
- Añadir `seed_demo.sql` con organizaciones y campañas de ejemplo si se exigen datos en tablas operativas.
- Mantener sincronizados SQL Server y PostgreSQL ante cambios futuros.
- Documentar la deshabilitación recomendada de `sa` a nivel de instancia.

\newpage

# Resumen técnico final de la base de datos

| Característica | v1.2 | v1.3 |
|:--|:--|:--|
| Nombre BD | rag_audit_platform | mk_service |
| Tablas | 11 | 20 |
| Multi-tenancy | No | Sí |
| Campañas / re-run | audits simples | campanias + padre |
| Documentos de ataque | test_cases planos | documentos_ataque global/org |
| Backlog | findings básicos | estados + comentarios + historial |
| Reportes tipados | path simple | executive/technical + idioma |
| API keys | No | Sí |
| Logins académicos | Parcial | 4 + app, least privilege |
| Masking | Limitado | DDM en campos sensibles |
| Scripts | MySQL + T-SQL antiguo | SQL Server + PostgreSQL alineados |

: Tabla 13. Resumen técnico comparativo

\newpage

# Conclusiones

- El modelo v1.3 unifica el entregable académico con la arquitectura real del producto MK Service.
- Se mantiene 3FN, integridad referencial fuerte y trazabilidad por historiales de campaña y hallazgo.
- La seguridad de clase (logins propios, roles, masking, sin uso de `sa`) queda cubierta.
- El diagrama ER y las capturas de ejecución en SSMS completan el ciclo de evidencia solicitado por el docente.

# Recomendaciones

- Embeber el PNG del ER generado (SSMS o dbdiagram.io).
- Adjuntar Anexo B con capturas reales de ejecución y pruebas de CHECK/permisos.
- Añadir `seed_demo.sql` con organizaciones y campañas de ejemplo si se exigen datos en tablas operativas.
- Mantener sincronizados SQL Server y PostgreSQL ante cambios futuros.
- Documentar la deshabilitación recomendada de `sa` a nivel de instancia.

\newpage

# Anexos

## Anexo A. Consultas de metadatos (SQL Server)

```sql
USE mk_service;

SELECT name FROM sys.tables ORDER BY name;

SELECT fk.name AS fk_name, tp.name AS tabla, ref.name AS referenciada
FROM sys.foreign_keys fk
JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
JOIN sys.tables ref ON fk.referenced_object_id = ref.object_id
ORDER BY tp.name;

SELECT t.name AS tabla, c.name AS check_name
FROM sys.check_constraints c
JOIN sys.tables t ON c.parent_object_id = t.object_id
ORDER BY t.name;
```

## Anexo B. Evidencia de ejecución {-}

Incluir capturas de:

1. Ejecución completa del script.
2. Listado de 20 tablas.
3. Prueba de CHECK fallida (controlada).
4. Intento de escritura con `login_mk_reader` denegado.

## Anexo C. Relación con otros documentos {-}

| Documento | Relación |
|:--|:--|
| SRS | Requisitos de producto que el modelo soporta |
| SAD | Decisiones de arquitectura |
| Manual de API | Recursos REST mapeados a tablas |
| `db/*.sql` | Fuente ejecutable del esquema |
| Política de versionado | 1.3 = reemplazo de modelo sin cambio de alcance |

\newpage

# Referencias documentales

- Ley 1581 de 2012 y Decreto 1377 de 2013 (protección de datos personales).
- Circular SIC 002 de 2024 (datos personales en sistemas de IA).
- OWASP Top 10 for Large Language Model Applications.
- SRS, SAD y Manual técnico de API de MK Service.
- `mk_service_sqlserver.sql` / `mk_service_postgresql.sql`.
- Informe de evaluación docente (base de mejoras de v1.2) y alineación arquitectónica de v1.3.

\newpage

# Control de cambios {-}

| Fecha | Versión | Descripción | Elaboró |
|:--|:--|:--|:--|:--|
| 23/08/2026 | 1.0 | Creación del documento fuente: especificación técnica y diseño relacional de MK Service. | Cristhian Bermudez, Jonathan Pérez, Juan Herrera |
| 07/09/2026 | 1.1 | Adaptación de la especificación técnica a la estructura formal de documentación exigida por la asignatura (ETITC). | Cristhian Bermudez, Jonathan Pérez, Juan Herrera |
| 10/09/2026 | 1.2 | Corrección integral según Informe de Evaluación (4.4/5.0): diagrama ER embebido, restricciones CHECK añadidas y probadas, datos de ejemplo en las 11 tablas, evidencia real de ejecución del script en servidor MySQL/MariaDB, e índices adicionales. | Cristhian Bermudez, Jonathan Pérez, Juan Herrera |
| 02/10/2026 | 1.3 | Reemplazo del modelo por esquema multi-tenant alineado a arquitectura (20 tablas), SQL Server académico y PostgreSQL de desarrollo; corrección de numeración de secciones en PDF | Cristhian Bermudez, Jonathan Pérez, Juan Herrera |
