```{=latex}
\begin{center}
\vspace*{2cm}

{\LARGE\bfseries Auditoría de Vulnerabilidades en Procesos de Lectura de Documentos por IA (RAG)}

\vspace{2cm}
```

![](../../assets/academic/02_research_project/etitc-logo.png){width=35%}

```{=latex}
\vspace{2.5cm}

\textbf{Asignatura:}\\[4pt]
Proyecto de Investigación | S6C

\vspace{2cm}

\textbf{Presentado por:}\\[4pt]
Juan Herrera\\
Jonathan Pérez\\
Cristhian Bermúdez

\vfill

Escuela Tecnológica Instituto Técnico Central\\
Bogotá D.C., 2026

\vspace*{1cm}
\end{center}
```

\newpage

## Contenido

- [1. Planteamiento del Problema](#planteamiento-del-problema)
  - [1.1 Contexto general](#contexto-general)
  - [1.2 Situación problemática](#situación-problemática)
  - [1.3 Qué se sabe actualmente](#qué-se-sabe-actualmente)
  - [1.4 Qué falta por conocer (vacío de conocimiento)](#qué-falta-por-conocer-vacío-de-conocimiento)
  - [1.5 Problema concreto que se investigará](#problema-concreto-que-se-investigará)
- [2. Pregunta de Investigación](#pregunta-de-investigación)
- [3. Justificación](#justificación)
- [4. Objetivos](#objetivos)
  - [Objetivo General](#objetivo-general)
  - [Objetivos Específicos](#objetivos-específicos)
- [5. Estado del Arte (Antecedentes)](#estado-del-arte-antecedentes)
  - [5.1 Discusión Comparativa de Investigaciones Previas](#discusión-comparativa-de-investigaciones-previas)
  - [5.2 Síntesis del Vacío de Conocimiento (Research Gap)](#síntesis-del-vacío-de-conocimiento-research-gap)
- [6. Marco Teórico](#marco-teórico)
  - [6.1 Arquitectura de Recuperación Aumentada por Generación (RAG)](#arquitectura-de-recuperación-aumentada-por-generación-rag)
  - [6.2 Vectores de Ataque en Aplicaciones de IA Generativa](#vectores-de-ataque-en-aplicaciones-de-ia-generativa)
  - [6.3 Metodologías de Auditoría, Clasificación y Gestión de Riesgos](#metodologías-de-auditoría-clasificación-y-gestión-de-riesgos)
- [7. Metodología](#metodología)
- [7.1 Enfoque metodológico](#enfoque-metodológico)
- [7.2 Fases del proyecto](#fases-del-proyecto)
- [7.3 Diseño técnico de la solución](#diseño-técnico-de-la-solución)
- [7.4 Instrumentos y casos de prueba](#instrumentos-y-casos-de-prueba)
- [7.5 Criterios de evaluación](#criterios-de-evaluación)
- [8. Resultados Esperados](#resultados-esperados)
- [9. Referencias](#referencias)

\newpage

# Planteamiento del Problema

## Contexto general

Cada vez más aplicaciones de IA incorporan RAG (Retrieval-Augmented Generation), técnica que combina un modelo de lenguaje con un mecanismo de recuperación de información externa (Lewis et al., 2020), para permitir que el modelo "lea" y razone sobre documentos externos —manuales, contratos, bases de conocimiento, correos, etc.— y responda o actúe a partir de ese contenido. Este mecanismo, sin embargo, es también la vía por la cual la IA puede terminar ejecutando instrucciones para las que no fue programada, si dichas instrucciones vienen ocultas dentro del propio documento que está leyendo; a este fenómeno se le conoce como inyección indirecta de prompts (Greshake et al., 2023).

## Situación problemática

Cuando un sistema de IA con permisos (local o no) procesa documentos mediante RAG, un documento manipulado puede contener instrucciones encubiertas (prompt injection) que lleven a la IA a revelar información sensible (data leak), ejecutar acciones no autorizadas o desviarse de su tarea original (Greshake et al., 2023; Liu et al., 2024). La OWASP Foundation (2024) ubica la inyección de prompts y la divulgación de información sensible como los dos primeros riesgos de su Top 10 para aplicaciones basadas en modelos de lenguaje, y estudios recientes muestran que la base de conocimiento de un sistema RAG puede ser tanto extraída como contaminada mediante contenido y consultas diseñados para ello (Zeng et al., 2024; Zou et al., 2025). En la práctica, muchos equipos que integran RAG en sus aplicaciones no cuentan con un proceso sistemático para auditar qué tan expuesto está su sistema a este tipo de ataques ni para dimensionar el impacto de una vulnerabilidad detectada.

## Qué se sabe actualmente

Existe literatura que describe la inyección de prompts como vector de ataque a sistemas de IA generativa (Perez & Ribeiro, 2022; Greshake et al., 2023), y el NIST la incluye dentro de su taxonomía de ataques contra este tipo de sistemas (Vassilev et al., 2024). Asimismo, se reconoce la fuga de datos (data leak) como una de sus consecuencias más críticas (OWASP Foundation, 2024). Han surgido herramientas incipientes para probar la seguridad de modelos de lenguaje, como garak (Derczynski et al., 2024) y PyRIT (Microsoft, 2024), y existen escáneres de seguridad tradicionales orientados a SQLi, XSS y demás riesgos del OWASP Top 10 para aplicaciones web convencionales (OWASP Foundation, 2021).

## Qué falta por conocer (vacío de conocimiento)

Liu et al. (2024) señalan que buena parte de los trabajos sobre inyección de prompts se limitan a estudios de caso, lo que dificulta una comprensión sistemática de estos ataques y de sus defensas. En ese sentido, existe poca evidencia sobre cómo estructurar una auditoría automatizada, repetible y con métricas claras (rango de vulnerabilidad, nivel de impacto) que se enfoque específicamente en el proceso de lectura de documentos por parte de una IA que usa RAG, más allá de pruebas puntuales o manuales.

## Problema concreto que se investigará

No se cuenta con una plataforma que permita auditar de forma automatizada el proceso de lectura de documentos por parte de sistemas de IA basados en RAG, detectando vulnerabilidades de inyección de prompts y fuga de datos, y que entregue como resultado un rango de vulnerabilidad, su impacto y un backlog priorizado de recomendaciones.

\newpage

# Pregunta de Investigación

*¿Cómo diseñar e implementar una plataforma que audite de forma automatizada el proceso de lectura de documentos por parte de sistemas de IA basados en RAG, detectando vulnerabilidades de inyección de prompts y fuga de datos, y que traduzca los hallazgos en un rango de vulnerabilidad, su impacto y un backlog de recomendaciones?*


# Justificación

El proyecto aporta un modelo sistemático para evaluar un vector de ataque relativamente nuevo —la inyección de prompts a través de RAG— en el proceso de lectura de documentos por IA, un área todavía poco formalizada en términos de métricas de auditoría. Para ello se desarrolla una herramienta funcional (MK SERVICE) capaz de ejecutar pruebas automatizadas contra sistemas de IA con permisos de lectura de documentos, calcular un rango de vulnerabilidad y su impacto, y generar un backlog de recomendaciones accionables.

De esta manera, los equipos que integren IA con RAG sobre documentos propios o de terceros (manuales, contratos, información de clientes) podrán usar MK SERVICE para identificar riesgos antes de que se traduzcan en fugas de información reales, protegiendo tanto a la organización como a los usuarios cuyos datos podrían verse expuestos. Además, detectar este tipo de vulnerabilidades de forma temprana y automatizada reduce el costo asociado a los incidentes de fuga de datos, que suelen ser mucho más costosos de remediar una vez ocurren que de prevenir: según IBM (2024), el costo promedio global de una filtración de datos alcanzó los USD 4,88 millones.

\newpage

# Objetivos

## Objetivo General

Diseñar e implementar MK SERVICE, una plataforma que audite de forma automatizada el proceso de lectura de documentos por parte de sistemas de IA basados en RAG, detectando vulnerabilidades de inyección de prompts y fuga de datos, y que entregue como resultado un rango de vulnerabilidad, su impacto y un backlog priorizado de recomendaciones.

## Objetivos Específicos

- Diseñar el modelo de datos y la arquitectura backend que soporten la gestión de sistemas de IA objetivo (locales o remotos, con distintos niveles de permisos), sus sesiones de escaneo y los hallazgos detectados, con trazabilidad completa por usuario y marca temporal.
- Definir y catalogar casos de prueba (payloads) orientados a inyección de prompts y fuga de datos a través de RAG, categorizados por nivel de severidad.
- Implementar el motor de ejecución que envíe estos casos de prueba a través de documentos "cebo" hacia el sistema de IA auditado y capture su respuesta como evidencia.
- Desarrollar el módulo de cálculo del rango de vulnerabilidad y su nivel de impacto a partir de los hallazgos verificados de cada escaneo.
- Construir el módulo de generación del backlog de recomendaciones, priorizado según la severidad e impacto de las vulnerabilidades detectadas.

*Nota: cada objetivo específico corresponde a un componente concreto de MK SERVICE (gestión de targets y escaneos, catálogo de payloads, motor de ejecución, cálculo de vulnerabilidad/impacto, backlog de recomendaciones), asegurando coherencia con la pregunta de investigación y con la metodología que se desarrollará más adelante.*

\newpage

# Estado del Arte (Antecedentes)

Para la construcción del Estado del Arte se analiza la literatura reciente enfocada en la seguridad en modelos de lenguaje de gran tamaño (LLM), recuperación aumentada por generación (RAG) y pruebas de penetración o auditoría de seguridad.

## Discusión Comparativa de Investigaciones Previas

A continuación se presenta el análisis comparativo de la literatura científica y técnica relevante:

| Autor(es) y Año | Enfoque de Investigación | Alcance / Aporte Principal | Limitación / Oportunidad de Mejora |
|---|---|---|---|
| **Perez & Ribeiro (2022)** | Ataques de inyección de prompts directos en LLM. | Demostraron la viabilidad de ignorar instrucciones previas mediante payloads. | Centrado en la interactividad por prompt directo, sin evaluar el canal de documentos externos ni sistemas RAG. |
| **Greshake et al. (2023)** | Inyección indirecta de prompts en aplicaciones integradas con LLM. | Confirmaron que datos de fuentes externas (emails, webs, documentos) pueden ejecutar acciones no autorizadas. | Estudio cualitativo sobre casos prácticos, careciendo de métricas cuantitativas y de un framework de escaneo automatizado. |
| **Derczynski et al. (2024)** | Framework de sondeo de seguridad para LLM ("garak"). | Evaluador de vulnerabilidades estilo fuzzing tradicional para modelos de lenguaje. | No está especializado en la ingesta de documentos en arquitecturas RAG ni genera un backlog priorizado de recomendaciones. |
| **Microsoft (2024)** | Herramienta de AI Red Teaming ("PyRIT"). | Automatización de pruebas de riesgo y ataques iterativos contra modelos de lenguaje. | Requiere configuración técnica avanzada y está orientada al Red Teaming general en lugar de a la auditoría estandarizada sobre RAG. |
| **Liu et al. (2024)** | Benchmarking de inyecciones de prompts. | Sistematización de la taxonomía de ataques; evidencia la falta de defensas sólidas. | Concluye que gran parte de los trabajos son estudios aislados y señala el vacío de metodologías de auditoría continua. |
| **Zeng et al. (2024) / Zou et al. (2025)** | Riesgos de privacidad y "PoisonedRAG". | Demostración de extracción e inyección de conocimientos mediante documentos cebo en RAG. | Muestran el vector de ataque pero no proveen una plataforma de evaluación periódica con cálculo de severidad e impacto. |

## Síntesis del Vacío de Conocimiento (Research Gap)

A partir de la revisión de la literatura se observa que, aunque existen investigaciones sobre inyección indirecta y herramientas generales de exploración de LLM como *garak* o *PyRIT*, existe una ausencia de herramientas automatizadas orientadas específicamente a auditar el proceso de ingesta y lectura de documentos en sistemas RAG.

Las soluciones actuales carecen de un motor de prueba estandarizado con documentos "cebo", cálculo de métricas concretas de vulnerabilidad e impacto, y la generación automática de un backlog de recomendaciones priorizado para el equipo de desarrollo. En este vacío de conocimiento se fundamenta el desarrollo de MK SERVICE.


# Marco Teórico

El Marco Teórico provee los fundamentos conceptuales necesarios para entender e interpretar el problema de auditoría de vulnerabilidades en sistemas RAG.

## Arquitectura de Recuperación Aumentada por Generación (RAG)

- **Retrieval-Augmented Generation (RAG):** Técnica propuesta por Lewis et al. (2020) que combina un modelo lingüístico preentrenado con un índice de búsqueda vectorial de documentos para fundamentar las respuestas en bases de conocimiento externas.
- **Vector Embeddings y Vector Database:** Proceso mediante el cual el contenido no estructurado de los documentos se convierte en representaciones vectoriales densas para medir la similitud semántica durante la búsqueda de fragmentos (*chunks*).
- **Mecanismos de Ingesta y Permisos:** Proceso mediante el cual un sistema RAG procesa, segmenta y lee archivos PDF, DOCX, TXT, otorgando acceso implícito al LLM para responder sobre su contenido.

## Vectores de Ataque en Aplicaciones de IA Generativa

- **Indirect Prompt Injection (Inyección Indirecta de Prompts):** Ataque donde las instrucciones maliciosas están incrustadas en fuentes de datos de terceros (ej. documentos leídos por la IA) en lugar de ser ingresadas directamente por el usuario (Greshake et al., 2023).
- **Fuga de Datos (Data Leakage):** Situación en la que el LLM expone involuntariamente información privada o datos confidenciales almacenados en el contexto o en el almacén vectorial hacia usuarios no autorizados (OWASP, 2024).
- **Contaminación del Contexto (Context / Knowledge Poisoning):** Manipulación deliberada de los documentos recuperados por RAG para alterar el comportamiento o razonamiento del modelo de lenguaje (Zou et al., 2025).

## Metodologías de Auditoría, Clasificación y Gestión de Riesgos

- **Estándar OWASP Top 10 para LLMs:** Marco de referencia defensivo que posiciona a *LLM01 Prompt Injection* y *LLM06 Sensitive Information Disclosure* como los riesgos más prominentes en aplicaciones de IA (OWASP Foundation, 2024).
- **Métricas de Vulnerabilidad e Impacto:** Modelos cuantitativos y cualitativos para ponderar la severidad de un hallazgo técnico, evaluando probabilidad, exposición de permisos y nivel de acceso concedido al sistema de IA.
- **Gestión de Remediación (Backlog Priorizado):** Transformación de los hallazgos de seguridad en tareas accionables estructuradas según la severidad, para guiar al equipo de desarrollo en la mitigación del riesgo.

\newpage

\newpage

# Metodología

## Enfoque metodológico

El proyecto se desarrolla bajo un enfoque **aplicado** y **tecnológico**, con diseño de tipo **investigación-desarrollo (I+D)**. No se limita a describir el fenómeno de la inyección de prompts en RAG: construye un artefacto funcional —MK SERVICE— que permite auditar de forma automatizada ese vector de ataque y traducir los hallazgos en métricas y recomendaciones accionables.

La estrategia combina:

1. **Revisión sistemática de literatura** (estado del arte y marco teórico), para delimitar el vacío de conocimiento y los vectores de ataque prioritarios.
2. **Ingeniería de software orientada a seguridad**, siguiendo el ciclo: requisitos → arquitectura → implementación → pruebas → validación.
3. **Evaluación experimental controlada**, mediante campañas de auditoría contra sistemas RAG de prueba (o endpoints simulados) con documentos "cebo" catalogados.

Este enfoque es coherente con la pregunta de investigación: el resultado no es solo un marco conceptual, sino una plataforma medible (detección, severidad, impacto y backlog).

## Fases del proyecto

| Fase | Actividad principal | Producto esperado |
|------|---------------------|-------------------|
| 1. Diagnóstico y diseño | Planteamiento del problema, requisitos (SRS) y arquitectura (SAD) | Documentación de diseño y alcance MVP |
| 2. Modelado de datos | Esquema relacional multi-tenant, integridad y roles | Modelo de datos y scripts de base de datos |
| 3. Catálogo de ataques | Definición de documentos y técnicas para prompt injection (directo/indirecto) y data leakage | Biblioteca de documentos de ataque (global + por organización) |
| 4. Implementación del backend | API REST (auth, organizaciones, targets, campañas, hallazgos, reportes) | Servicios operativos del MVP |
| 5. Motor de auditoría | Envío de pruebas al sistema RAG objetivo, captura de evidencia y clasificación de hallazgos | Campañas ejecutables con estados y progreso |
| 6. Métricas y backlog | Cálculo de severidad/impacto y generación de recomendaciones priorizadas | Hallazgos con prioridad y estado de remediación |
| 7. Validación | Pruebas funcionales, de integridad y escenarios de auditoría controlados | Evidencia de funcionamiento y limitaciones del MVP |

## Diseño técnico de la solución

MK SERVICE se diseña como una plataforma **SaaS multi-tenant** de auditoría externa (no se integra al CI/CD del cliente). Los componentes principales son:

- **Gestión de targets:** registro de sistemas RAG del cliente (modo *basic*: solo chat; modo *complete*: chat + carga de documentos), con prueba de conectividad al crear el target.
- **Campañas de auditoría:** configuración del alcance (`prompt_injection`, `data_leakage` o ambos), selección de documentos de ataque y ejecución asíncrona.
- **Motor de pruebas:** envío de documentos/consultas de ataque, registro de la respuesta del modelo y detección de indicadores (por ejemplo, canarios o patrones de filtración).
- **Hallazgos y backlog:** título, severidad, recomendación, prioridad, estado y trazabilidad de cambios.
- **Reportes:** salida ejecutiva y técnica (PDF), con posibilidad de exportación estructurada.

Stack de referencia del MVP: backend en Python (FastAPI), PostgreSQL, autenticación JWT, procesamiento asíncrono de campañas y frontend web orientado a perfiles técnicos y no técnicos.

## Instrumentos y casos de prueba

Los instrumentos de recolección de evidencia son:

1. **Documentos de ataque predefinidos** (alcance global), orientados a:
   - inyección de prompt directa;
   - inyección de prompt indirecta (contenido malicioso en documentos recuperados);
   - fuga de datos (extracción de contexto, secretos o información sensible).
2. **Documentos personalizados** por organización (alcance *organization*), para escenarios específicos del cliente.
3. **Registros de campaña:** consultas enviadas, extractos de respuesta, severidad asignada y estado del hallazgo.

Cada caso de prueba se asocia a una categoría de ataque y a un nivel de severidad, de modo que el resultado de la campaña sea comparable entre ejecuciones (incluida la re-auditoría).

## Criterios de evaluación

El éxito del MVP se evalúa con los siguientes criterios:

| Criterio | Indicador |
|----------|-----------|
| Funcionalidad | Capacidad de registrar un target, lanzar una campaña y obtener hallazgos con evidencia |
| Cobertura de ataques | Ejecución de al menos los vectores prioritarios del MVP (prompt injection y data leakage) |
| Trazabilidad | Asociación de hallazgos a campaña, severidad, recomendación y estado |
| Utilidad práctica | Generación de un backlog priorizado interpretable por equipos técnicos y de negocio |
| Repetibilidad | Posibilidad de re-ejecutar una campaña y comparar resultados (re-auditoría) |

Las limitaciones del MVP (por ejemplo, no integración CI/CD, cifrado avanzado de secretos del target o cobertura exhaustiva de todas las variantes de ataque) se documentan como alcance y trabajo futuro.

\newpage

# Resultados Esperados

Al finalizar el proyecto se espera obtener los siguientes resultados, alineados con el objetivo general y los objetivos específicos:

1. **Plataforma funcional MK SERVICE (MVP)** capaz de auditar de forma externa sistemas de IA basados en RAG, enfocándose en inyección de prompts y fuga de datos durante el proceso de lectura de documentos.

2. **Modelo de datos y arquitectura documentados**, que soporten multi-tenancy, gestión de targets, campañas, hallazgos, reportes y roles (owner, auditor, viewer, admin de plataforma).

3. **Catálogo inicial de documentos de ataque** clasificados por técnica y severidad, utilizables de forma global y, opcionalmente, personalizados por organización.

4. **Motor de ejecución de campañas** que permita programar o lanzar auditorías, registrar progreso y almacenar evidencia de las respuestas del sistema auditado.

5. **Módulo de hallazgos y backlog priorizado**, con severidad, recomendación de mitigación, orden de atención y estados de seguimiento (abierta, en progreso, resuelta, falso positivo, riesgo aceptado).

6. **Informes de salida** (al menos en formato técnico y, en evolución del MVP, ejecutivo) que faciliten la comunicación del riesgo a perfiles técnicos y no técnicos.

7. **Evidencia empírica de validación** mediante escenarios controlados (targets de prueba y campañas reales sobre el MVP), que demuestre la viabilidad de una auditoría automatizada y repetible en el dominio RAG.

En términos académicos, el resultado esperado es demostrar que es posible cerrar parcialmente el vacío identificado en el estado del arte: pasar de estudios de caso y herramientas genéricas de red teaming de LLM a una **auditoría orientada a RAG con métricas y recomendaciones estructuradas**.

\newpage

# Referencias

Derczynski, L., Galinkin, E., Martin, J., Majumdar, S., & Inie, N. (2024). *garak: A framework for security probing large language models* (arXiv:2406.11036). arXiv. https://doi.org/10.48550/arXiv.2406.11036

Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., & Fritz, M. (2023). Not what you've signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection. En *Proceedings of the 16th ACM Workshop on Artificial Intelligence and Security* (pp. 79–90). ACM. https://doi.org/10.1145/3605764.3623985

IBM. (2024). *Cost of a data breach report 2024*. IBM Security. https://www.ibm.com/reports/data-breach

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33*, 9459–9474.

Liu, Y., Jia, Y., Geng, R., Jia, J., & Gong, N. Z. (2024). Formalizing and benchmarking prompt injection attacks and defenses. En *Proceedings of the 33rd USENIX Security Symposium*. USENIX Association.

Microsoft. (2024). *PyRIT: Python Risk Identification Tool for generative AI* [Software]. GitHub. https://github.com/Azure/PyRIT

OWASP Foundation. (2021). *OWASP Top 10:2021*. https://owasp.org/Top10/

OWASP Foundation. (2024). *OWASP Top 10 for LLM applications 2025*. https://genai.owasp.org/llm-top-10/

Perez, F., & Ribeiro, I. (2022). *Ignore previous prompt: Attack techniques for language models* (arXiv:2211.09527). arXiv. https://doi.org/10.48550/arXiv.2211.09527

Vassilev, A., Oprea, A., Fordyce, A., & Anderson, H. (2024). *Adversarial machine learning: A taxonomy and terminology of attacks and mitigations* (NIST AI 100-2e2023). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.AI.100-2e2023

Zeng, S., Zhang, J., He, P., Xing, Y., Liu, Y., Xu, H., Ren, J., Wang, S., Yin, D., Chang, Y., & Tang, J. (2024). The good and the bad: Exploring privacy issues in retrieval-augmented generation (RAG). En *Findings of the Association for Computational Linguistics: ACL 2024*. Association for Computational Linguistics.

Zou, W., Geng, R., Wang, B., & Jia, J. (2025). PoisonedRAG: Knowledge corruption attacks to retrieval-augmented generation of large language models. En *Proceedings of the 34th USENIX Security Symposium*. USENIX Association.