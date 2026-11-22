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
  - \usepackage{fvextra}
  - \usepackage{mdframed}
  - \RecustomVerbatimEnvironment{verbatim}{Verbatim}{breaklines=true,fontsize=\footnotesize}
  - \setlength{\parskip}{6pt}
  - \setlength{\parindent}{0pt}
include-before:
  - |
    \thispagestyle{empty}
    \begin{center}
    \vspace*{1cm}

    {\LARGE\bfseries MK SERVICE}\\[6pt]
    {\large Auditoría automatizada de \textit{Prompt Injection} y \textit{Data Leakage}\\ en sistemas de IA basados en RAG}

    \vspace{1.5cm}

    \includegraphics[width=0.35\textwidth]{../../assets/academic/01_data_base/etitc-logo.png}

    \vspace{1.5cm}

    \textbf{Documento de entrega final del proyecto}\\[8pt]
    \textbf{Presentado por:}\\[4pt]
    Juan Herrera\\
    Jonathan Pérez\\
    Cristhian Bermúdez

    \vspace{1.2cm}

    \textbf{Asignatura / espacio académico:}\\[4pt]
    Proyecto de Investigación | Programación | Bases de Datos | Ingles IV\\
    Escuela Tecnológica Instituto Técnico Central — ETITC

    \vfill

    Bogotá D.C., Colombia\\
    2026

    \vspace*{0.8cm}
    \end{center}
    \newpage
---

\newpage

# Abstract

Organizations increasingly deploy retrieval-augmented generation (RAG) systems so that large language models can answer questions using internal documents. While this improves usefulness, it expands the attack surface: malicious instructions embedded in chat messages or in retrieved documents (**prompt injection**, direct and indirect) and unintended disclosure of secrets or personal data (**data leakage**). Existing practice often relies on ad-hoc manual tests, generic LLM red-teaming tools, or costly consulting engagements that are difficult to repeat at scale.

**MK Service** is a cloud multi-tenant platform that connects externally to a client RAG (chat endpoint and, in complete mode, document upload), runs configurable audit campaigns against controlled attack payloads, scores responses using verifiable **canary tokens**, and produces prioritized findings plus technical and executive PDF reports. The solution includes asynchronous campaign execution, role-based access (including founding-owner protections), an in-house RAG laboratory (vulnerable, proxy, and lightweight open RAG modes), and operational controls aligned with security and data-protection good practices.

This document states the bilingual objectives required for final delivery, develops the problem, methodology, architecture, implementation, and evaluation in Spanish, and closes with conclusions in English and Spanish. Results show a closed loop—from target connection through campaign, evidence-based findings, reporting, and re-audit—validated in a controlled laboratory and in a deployed environment.

**Keywords:** RAG security, prompt injection, data leakage, automated audit, canary tokens, LLM applications, OWASP.

\newpage

# Resumen

Las organizaciones adoptan cada vez más sistemas de generación aumentada por recuperación (RAG), de modo que los modelos de lenguaje responden con base en documentos internos. Aunque ello mejora la utilidad, amplía la superficie de ataque: instrucciones maliciosas en el chat o en documentos recuperados (**prompt injection**, directa e indirecta) y divulgación no intencional de secretos o datos personales (**data leakage**). En la práctica predominan pruebas manuales ad hoc, herramientas genéricas de *red team* para LLM o consultorías costosas y poco repetibles.

**MK Service** es una plataforma *cloud* multi-tenant que se conecta de forma externa al RAG del cliente (endpoint de chat y, en modo completo, de carga de documentos), ejecuta campañas de auditoría con *payloads* de ataque controlados, evalúa las respuestas mediante **tokens canary** verificables y genera hallazgos priorizados e informes PDF técnicos y ejecutivos. Incluye ejecución asíncrona de campañas, control de acceso por roles (con protección del *owner* fundador), un laboratorio RAG propio (modos vulnerable, *proxy* y RAG abierto liviano) y controles operativos alineados a buenas prácticas de seguridad y protección de datos.

El presente documento presenta los objetivos en inglés y en español exigidos para la entrega final, desarrolla en español la problemática, la metodología, la arquitectura, la implementación y la evaluación, y cierra con conclusiones en ambos idiomas. Los resultados muestran un ciclo cerrado —desde la conexión del *target* hasta la campaña, los hallazgos con evidencia, el informe y la re-auditoría— validado en laboratorio controlado y en un entorno desplegado.

**Palabras clave:** seguridad en RAG, inyección de *prompts*, fuga de datos, auditoría automatizada, *canary tokens*, aplicaciones con LLM, OWASP.

\newpage

# General Objective

To design and implement a multi-tenant cloud platform that automatically and repeatedly audits prompt injection and data leakage risks in RAG-based AI systems, producing evidence-based findings, a prioritized remediation backlog, and technical and executive reports usable by both engineering and business stakeholders.

# Specific Objectives

1. Model organization-scoped multi-tenancy with roles (owner, auditor, viewer) and governance rules that protect the founding owner.
2. Integrate external RAG targets through chat and optional document-upload endpoints, including connectivity checks.
3. Execute asynchronous audit campaigns with configurable scope (prompt injection, data leakage, or both) and selectable attack payloads.
4. Detect confirmed findings using canary-token evidence, severity classification, and a trackable remediation backlog.
5. Generate technical and executive PDF reports in Spanish and English and support campaign re-runs for before/after comparison.
6. Validate the attack engine with control payload sets and an in-house RAG laboratory (vulnerable, proxy, and lightweight open-RAG modes).
7. Apply security and operational controls appropriate to a SaaS audit product (authentication, authorization, soft deletion, rate limiting, durable storage of reports and payloads).

\newpage

# Objetivo general

Diseñar e implementar una plataforma *cloud* multi-tenant que audite de forma automática y repetible los riesgos de *prompt injection* y *data leakage* en sistemas de IA basados en RAG, produciendo hallazgos con evidencia, un *backlog* priorizado de remedición e informes técnicos y ejecutivos utilizables por perfiles de ingeniería y de negocio.

# Objetivos específicos

1. Modelar el multi-tenancy por organización con roles (*owner*, *auditor*, *viewer*) y reglas de gobierno que protejan al *owner* fundador.
2. Integrar *targets* RAG externos mediante endpoints de chat y, opcionalmente, de carga de documentos, incluyendo pruebas de conectividad.
3. Ejecutar campañas de auditoría asíncronas con alcance configurable (*prompt injection*, *data leakage* o ambos) y *payloads* de ataque seleccionables.
4. Detectar hallazgos confirmados mediante evidencia de *tokens canary*, clasificación por severidad y un *backlog* de remedición con estados.
5. Generar informes PDF técnicos y ejecutivos en español e inglés, y permitir re-ejecuciones de campaña para comparar resultados.
6. Validar el motor de ataque con conjuntos de *payloads* de control y un laboratorio RAG propio (modos vulnerable, *proxy* y RAG abierto liviano).
7. Aplicar controles de seguridad y operación propios de un producto SaaS de auditoría (autenticación, autorización, borrado lógico, límite de tasa, almacenamiento durable de informes y *payloads*).

\newpage

# Cuerpo del trabajo

## Introducción

El uso de modelos de lenguaje de gran tamaño (LLM) en entornos empresariales se ha acelerado con patrones de **generación aumentada por recuperación (RAG)**: el sistema recupera fragmentos de una base documental y los entrega al modelo para fundamentar la respuesta (Lewis et al., 2020). Esta arquitectura mejora la utilidad sobre conocimiento privado, pero introduce vectores de ataque distintos a los de la aplicación web clásica.

Entre ellos destacan la **inyección de *prompts*** —directa, cuando el atacante controla el mensaje de chat, e indirecta, cuando la instrucción maliciosa viaja dentro de un documento que el recuperador indexa y el modelo “obedece”— y la **fuga de datos (*data leakage*)**, cuando secretos, credenciales o datos personales presentes en el corpus aparecen en la salida del modelo (Greshake et al., 2023; OWASP Foundation, 2024).

El presente proyecto responde a esa necesidad con **MK Service**, una plataforma de auditoría externa, automatizada y repetible, orientada específicamente a sistemas RAG.

## Problemática y vacío de conocimiento

### Situación problemática

Las organizaciones colombianas y regionales adoptan asistentes y *chatbots* con RAG sobre manuales, contratos, bases de clientes o runbooks internos. Sin embargo, la capacidad de **demostrar** que esos sistemas resisten inyección y fugas de información suele ser limitada: las pruebas son manuales, no estandarizadas y difíciles de repetir tras cada cambio de *prompt*, índice o modelo.

Liu et al. (2024) señalan que buena parte de la literatura sobre *prompt injection* se concentra en estudios de caso, lo que dificulta una comprensión sistemática de ataques y defensas. En la práctica del mercado coexisten:

- Pruebas manuales *ad hoc* por equipos de seguridad o desarrollo.
- Herramientas genéricas de *red team* para LLM (por ejemplo, enfoques alineados al OWASP Top 10 for LLM Applications).
- Consultoría especializada de alto costo y baja frecuencia.

Escasean, en cambio, servicios que ofrezcan **campañas automatizadas contra el RAG del cliente**, con *payloads* versionados, evidencia verificable, *backlog* de remedición e informes diferenciados para técnico y para negocio.

### Problema concreto

No se dispone de una plataforma que permita auditar de forma automatizada el proceso de lectura y respuesta de sistemas de IA basados en RAG, detectando *prompt injection* y *data leakage*, y que traduzca los resultados en hallazgos priorizados, impacto y recomendaciones accionables.

### Pregunta de investigación

¿Cómo diseñar e implementar una plataforma que audite de forma automatizada sistemas de IA basados en RAG, detectando vulnerabilidades de *prompt injection* y *data leakage*, y que traduzca los hallazgos en severidad, evidencia e informes técnicos y ejecutivos?

## Solución propuesta: MK Service

MK Service **no sustituye** el RAG del cliente: lo audita **desde fuera**, de forma análoga a un *pentest* automatizado de la capa de IA.

El flujo operativo es el siguiente:

1. La organización registra un **target** (endpoint de chat y, en modo *complete*, de *upload*).
2. Un auditor o *owner* configura una **campaña** con alcance (PI, *leakage* o ambos) y selecciona documentos de ataque (*payloads*).
3. La campaña se encola y un *worker* ejecuta los *probes* de forma asíncrona.
4. El motor evalúa las respuestas; la presencia de **canaries** (`MK_CANARY_…`) confirma hallazgos con evidencia reproducible.
5. Se generan **informes** PDF (técnico / ejecutivo) y es posible **re-auditar** para comparar antes y después de mitigaciones.

### Comparación con lo ya existente

| Enfoque existente | Limitación frecuente | Aporte de MK Service |
|-------------------|----------------------|----------------------|
| Prueba manual | No escala ni se repite igual | Campañas y *payloads* versionados |
| *Red team* LLM genérico | Poco enfocado en el pipeline RAG (recuperación + *upload*) | Modos *basic* / *complete* y lab RAG |
| Consultoría puntual | Costosa y episódica | Plataforma multi-tenant reutilizable |
| Escáneres tradicionales | No modelan inyección vía documentos recuperados | *Payloads* indirectos y scoring por canary |

## Marco conceptual y metodología

### Conceptos clave

- **RAG.** Combinación de recuperación documental y generación; el riesgo no reside solo en el LLM, sino en el contenido recuperado y en cómo el modelo lo integra (Lewis et al., 2020).
- **Prompt injection directa e indirecta.** Manipulación del comportamiento del modelo mediante el mensaje de usuario o mediante contenido hostil en la base de conocimiento (Greshake et al., 2023).
- **Data leakage.** Exposición de información sensible presente en el contexto recuperado o en el propio sistema.
- **OWASP Top 10 for LLM Applications.** Marco de referencia para clasificar riesgos en aplicaciones con modelos generativos (OWASP Foundation, 2024).
- **Canary tokens.** Cadenas únicas insertadas en *payloads*; si reaparecen en la respuesta del target, el hallazgo se considera **confirmado**, reduciendo falsos positivos basados solo en heurísticas.
- **Multi-tenancy y roles.** Aislamiento por organización; roles *owner*, *auditor* y *viewer*; el *owner* fundador no puede perder el control por decisión de *owners* posteriores.
- **Borrado lógico.** Preferencia por desactivación (`is_active`) frente a destrucción inmediata de evidencia de auditoría, en línea con buenas prácticas de seguridad y con un enfoque prudente frente al tratamiento de datos personales en Colombia (Ley 1581 de 2012).

### Metodología de trabajo

El desarrollo siguió un enfoque iterativo de producto técnico:

1. **Especificación** (requisitos, arquitectura, manual de API) antes de codificar el núcleo de negocio.
2. **Implementación por capas:** autenticación y organizaciones; targets; campañas y cola; documentos de ataque; hallazgos e informes; gobierno de equipo y auditoría de acciones.
3. **Validación en laboratorio** con un servicio RAG controlado (modos vulnerable, *proxy* y RAG con recuperación BM25).
4. **Juegos de control:** *payloads* benignos (sin canary) frente a positivos conocidos, para calibrar el motor.
5. **Despliegue** en entorno cloud (API, *worker*, base de datos, almacenamiento de objetos, laboratorio) y ajustes operativos (p. ej. despertar del lab en planes con *cold start*).

## Arquitectura y desarrollo

### Arquitectura lógica

- **Frontend:** aplicación web (Next.js) orientada a perfiles técnicos y no técnicos, con interfaz en español.
- **Backend API:** FastAPI, autenticación JWT (y API keys para integraciones), autorización por rol y por organización.
- **Persistencia:** PostgreSQL con migraciones (Alembic); multi-tenancy a nivel de filas de negocio.
- **Cola:** Redis y *workers* RQ para ejecutar campañas sin bloquear la interfaz.
- **Almacenamiento de archivos:** local en desarrollo; objeto durable (compatible S3 / R2) en producción para *payloads* e informes.
- **Laboratorio RAG (`mk_rag_lab`):** target OpenAI-compatible usado para demos y pruebas sin depender exclusivamente del RAG del cliente final.

### Desarrollo realizado

Entre los componentes entregados se encuentran:

- Registro e inicio de sesión; organizaciones y membresías.
- CRUD de targets con prueba de conectividad.
- Campañas (creación, ejecución, cancelación, re-ejecución y comparación).
- Catálogo de documentos de ataque globales y por organización.
- Hallazgos con severidad, estado y comentarios.
- Generación y vista previa de informes PDF.
- Gestión de equipo, invitaciones (sin otorgar rol *owner* por enlace) y solicitudes de promoción a *owner*.
- Registro de eventos de auditoría consultable desde la aplicación.

### Seguridad de la plataforma

Se aplicaron controles básicos de producto SaaS: hash de contraseñas, tokens de refresco, restricción CORS, límite de tasa en autenticación, validación de tipos y tamaño de archivos, borrado lógico de recursos sensibles, y distinción entre errores de reconfirmación de contraseña (403) y sesión inválida (401), para no cerrar la sesión del usuario ante un fallo de confirmación de privilegio.

## Pruebas y hallazgos

### Estrategia de pruebas

- Pruebas de API sobre autenticación, targets, campañas, documentos e informes.
- Ejecución de campañas con *worker* asíncrono.
- Validación del laboratorio local y desplegado (`/health`, *seed* de corpus sintético, chat de prueba).
- Controles benignos frente a *payloads* con canary.
- Pruebas de interfaz (flujos críticos, vista previa de PDF, usabilidad en móvil en listados densos).

### Hallazgos técnicos y de producto

**Motor de auditoría.** Exigir canary para confirmar hallazgos redujo falsos positivos. Los controles benignos sin `MK_CANARY_*` no deben generar hallazgos confirmados. El modo RAG del laboratorio (recuperación BM25 + generación o respuesta extractiva) hace más realistas las pruebas de *leakage* que un lab únicamente “vulnerable” por reglas fijas.

**Operación.** En planes *cloud* gratuitos, API y laboratorio pueden dormirse de forma independiente; se incorporó un mecanismo de *wake* del lab al iniciar campañas. El almacenamiento efímero del contenedor motivó el uso de almacenamiento de objetos para no perder informes tras un *redeploy*.

**Producto y usabilidad.** La interfaz y los informes se orientaron a lenguaje comprensible en español. En dispositivos móviles se evitaron tablas que obligaran a desplazamiento horizontal para alcanzar las acciones. El gobierno de *owners* impide que un *owner* hijo desplace al fundador o otorgue privilegios equivalentes sin control.

## Criterios de evaluación del proyecto

| Criterio | Indicador de éxito |
|----------|-------------------|
| Funcionalidad de punta a punta | Target → campaña → hallazgos → informe PDF |
| Confiabilidad del scoring | Mínimos hallazgos en benignos; canary presente implica hallazgo confirmado |
| Cobertura | Ramas PI directo, PI indirecto y *data leakage* con *payloads* representativos |
| Usabilidad | Flujo operable por *owner* no técnico y por auditor |
| Seguridad de la plataforma | Roles respetados; secretos fuera del frontend; evidencias retenidas de forma lógica |
| Operación | Campaña ejecutable en entorno desplegado |

## Consideraciones éticas y de datos

MK Service está pensado para **auditoría autorizada** del propio sistema del cliente (o de un laboratorio de prueba). Los *payloads* y el corpus sintético del laboratorio no sustituyen datos reales de terceros. Respecto a datos personales, el producto adopta desactivación y retención de evidencia de seguridad de forma prudente frente al marco de la Ley 1581 de 2012, sin pretender sustituir asesoría jurídica formal.

\newpage

# Conclusions

MK Service addresses a concrete gap between the rapid adoption of RAG systems and the limited ability of organizations to **measure**, in a repeatable way, their exposure to prompt injection and data leakage. By combining external connectivity to client endpoints, controlled attack payloads, canary-based confirmation, asynchronous campaigns, and dual technical/executive reporting, the project delivers a closed audit loop rather than isolated scripts.

The work also demonstrates that academic and product constraints can coexist: formal objectives and documentation, a multi-tenant architecture, a controlled RAG laboratory, and deployment lessons (durable object storage, lab wake-up on cold start) that keep the platform usable beyond a classroom demo.

Limitations remain. Scoring still depends on well-designed canaries and payload quality; full semantic retrieval in the laboratory is intentionally lightweight; and legal retention schedules for personal data should be finalized with organizational policy. Future work includes richer payload packs per attack technique, optional embedding-based retrieval in the lab, scheduled purging/anonymization jobs, and broader automated regression suites.

Overall, the project meets its general objective: an automated, evidence-oriented audit platform for RAG-oriented injection and leakage risks, validated through design, implementation, laboratory controls, and operational deployment.

\newpage

# Conclusiones

MK Service responde a un vacío concreto entre la adopción acelerada de sistemas RAG y la limitada capacidad de las organizaciones para **medir**, de forma repetible, su exposición a *prompt injection* y *data leakage*. Al combinar conexión externa a los endpoints del cliente, *payloads* de ataque controlados, confirmación por *canaries*, campañas asíncronas e informes técnicos y ejecutivos, el proyecto entrega un ciclo de auditoría cerrado y no únicamente scripts aislados.

El trabajo muestra además que las exigencias académicas y de producto pueden convivir: objetivos y documentación formales, arquitectura multi-tenant, laboratorio RAG controlado y lecciones de despliegue (almacenamiento durable, despertar del laboratorio ante *cold start*) que mantienen la plataforma usable más allá de una demostración de aula.

Persisten limitaciones. El *scoring* depende de canaries y de la calidad de los *payloads*; la recuperación semántica del laboratorio es deliberadamente liviana; y los plazos exactos de retención de datos personales deben cerrarse con política organizacional. Como trabajo futuro se proponen packs más densos por técnica de ataque, recuperación opcional por *embeddings* en el lab, trabajos programados de purga o anonimización, y suites de regresión más amplias.

En conjunto, el proyecto cumple su objetivo general: una plataforma de auditoría automatizada y orientada a evidencia frente a riesgos de inyección y fuga en sistemas RAG, validada mediante diseño, implementación, controles de laboratorio y despliegue operativo.

\newpage

# References

Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., & Fritz, M. (2023). Not what you’ve signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection. *Proceedings of the 16th ACM Workshop on Artificial Intelligence and Security*, 79–90. https://doi.org/10.1145/3605764.3623985

IBM. (2024). *Cost of a data breach report 2024*. IBM Security.

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33*, 9459–9474.

Liu, Y., Jia, Y., Geng, R., Jia, J., & Gong, N. Z. (2024). Formalizing and benchmarking prompt injection attacks and defenses. *Proceedings of the 33rd USENIX Security Symposium*. USENIX Association.

OWASP Foundation. (2024). *OWASP Top 10 for large language model applications*. https://genai.owasp.org/llm-top-10/

Congreso de la República de Colombia. (2012). *Ley 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales*. Diario Oficial.
