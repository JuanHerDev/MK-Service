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
  - [5.2 Discusión General: Posicionamiento de MK SERVICE](#discusión-general-posicionamiento-de-mk-service)
  - [5.3 Síntesis del Vacío de Conocimiento (Research Gap)](#síntesis-del-vacío-de-conocimiento-research-gap)
- [6. Marco Teórico](#marco-teórico)
  - [6.1 Arquitectura de Recuperación Aumentada por Generación (RAG)](#arquitectura-de-recuperación-aumentada-por-generación-rag)
  - [6.2 Vectores de Ataque en Aplicaciones de IA Generativa](#vectores-de-ataque-en-aplicaciones-de-ia-generativa)
  - [6.3 Metodologías de Auditoría, Clasificación y Gestión de Riesgos](#metodologías-de-auditoría-clasificación-y-gestión-de-riesgos)
  - [6.4 Fundamentos Tecnológicos de la Plataforma](#fundamentos-tecnológicos-de-la-plataforma)
  - [6.5 Metodologías de Ingeniería de Software](#metodologías-de-ingeniería-de-software)
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

## Discusión General: Posicionamiento de MK SERVICE

La revisión anterior permite identificar una evolución clara en la forma en que la comunidad ha entendido la inyección de prompts, y al mismo tiempo deja ver en qué punto de esa evolución se ubica MK SERVICE.

**De la curiosidad al riesgo operativo.** Los primeros trabajos (Perez & Ribeiro, 2022) trataron la inyección de prompts como un fenómeno del diálogo directo entre usuario y modelo: alguien escribe "ignora las instrucciones anteriores" y el modelo obedece. Greshake et al. (2023) cambian el foco de forma decisiva al mostrar que el atacante no necesita hablar con el modelo; le basta con contaminar algo que el modelo vaya a leer. Este hallazgo es el punto de partida conceptual de MK SERVICE: en un sistema RAG, cada documento que entra a la base de conocimiento es, potencialmente, un canal de instrucciones. Zeng et al. (2024) y Zou et al. (2025) confirman además que la misma base de conocimiento puede ser extraída (fuga de datos) o envenenada (corrupción del conocimiento), lo que justifica que el proyecto audite simultáneamente las dos categorías: *prompt injection* y *data leakage*.

**De la demostración a la medición.** Un rasgo común de los estudios revisados es que *demuestran* que el ataque funciona, pero no *miden* cuánto expone a un sistema concreto. Greshake et al. (2023) trabajan con casos cualitativos; Zou et al. (2025) reportan tasas de éxito en condiciones experimentales controladas, pero no un indicador que una organización pueda usar para decidir qué corregir primero. Liu et al. (2024) avanzan en la formalización y el benchmarking, y precisamente concluyen que el campo carece de métodos sistemáticos de evaluación. MK SERVICE toma esa conclusión como requisito de diseño: cada prueba debe producir un resultado comparable (severidad, rango de vulnerabilidad, impacto) y repetible entre auditorías, de modo que sea posible verificar si una corrección realmente funcionó (re-auditoría).

**De la herramienta del investigador a la herramienta del equipo.** garak (Derczynski et al., 2024) y PyRIT (Microsoft, 2024) son los referentes más cercanos en términos de automatización. Sin embargo, ambos están pensados para evaluar el *modelo* y no el *proceso de ingesta de documentos* de una aplicación RAG ya desplegada; además, están dirigidos a especialistas que operan desde línea de comandos o código, y su salida son registros técnicos de sondeo, no un plan de remediación. MK SERVICE se diferencia en tres decisiones: (1) audita la aplicación desde fuera, a través de sus endpoints de chat y de carga de documentos, sin requerir acceso al modelo ni a la base vectorial; (2) traduce los hallazgos en un backlog priorizado con estados de seguimiento, que es el lenguaje con el que trabajan los equipos de desarrollo; y (3) ofrece informes diferenciados para perfiles técnicos y no técnicos, lo que acerca el riesgo a quienes toman decisiones de negocio y de cumplimiento (por ejemplo, frente a la Ley 1581 de 2012).

| Criterio | garak | PyRIT | Estudios académicos (Greshake, Zou, Zeng) | **MK SERVICE** |
|---|---|---|---|---|
| Objeto auditado | Modelo de lenguaje | Modelo / aplicación (red teaming general) | Prototipos experimentales | Aplicación RAG desplegada (caja negra) |
| Canal de ataque | Prompt directo | Prompt directo e iterativo | Documentos y fuentes externas | Prompt directo + documentos cebo cargados al target |
| Métrica de salida | Tasa de fallo por sonda | Puntajes por objetivo de ataque | Tasa de éxito experimental | Severidad, rango de vulnerabilidad e impacto |
| Remediación | No incluida | No incluida | Recomendaciones generales | Backlog priorizado con estados |
| Repetibilidad / re-auditoría | Manual | Manual | No aplica | Integrada (campañas vinculadas y comparación) |
| Usuario objetivo | Especialista | Especialista | Investigador | Auditor, Owner y Viewer (técnico y no técnico) |

**Límites que el proyecto reconoce.** Esta discusión también obliga a ser honestos sobre lo que MK SERVICE no resuelve. Al ser una auditoría de caja negra, el sistema observa respuestas, no razonamientos internos, y los modelos de lenguaje son no deterministas: un mismo documento cebo puede tener éxito en un intento y fallar en otro. Por eso el diseño contempla repeticiones por caso de prueba y el uso de tasas de éxito en lugar de resultados binarios. Del mismo modo, ningún catálogo de payloads es exhaustivo; las técnicas de inyección evolucionan, y por esa razón la biblioteca de documentos de ataque se diseña desacoplada del núcleo de la aplicación, para poder actualizarse sin redesplegarla (RNF-05). Finalmente, una herramienta capaz de atacar sistemas RAG exige un marco ético de uso: MK SERVICE solo debe ejecutarse contra targets cuya propiedad o autorización de prueba haya sido acreditada por la organización cliente.

En síntesis, la literatura aporta el *qué* (los vectores de ataque existen y son efectivos) y algunas herramientas aportan el *cómo automatizar* el sondeo de modelos; MK SERVICE busca aportar el *cuánto* (métricas comparables) y el *qué hacer después* (backlog priorizado), aplicado específicamente al proceso de lectura de documentos en sistemas RAG.

## Síntesis del Vacío de Conocimiento (Research Gap)

A partir de la revisión de la literatura se observa que, aunque existen investigaciones sobre inyección indirecta y herramientas generales de exploración de LLM como *garak* o *PyRIT*, existe una ausencia de herramientas automatizadas orientadas específicamente a auditar el proceso de ingesta y lectura de documentos en sistemas RAG.

Las soluciones actuales carecen de un motor de prueba estandarizado con documentos "cebo", cálculo de métricas concretas de vulnerabilidad e impacto, y la generación automática de un backlog de recomendaciones priorizado para el equipo de desarrollo. En este vacío de conocimiento se fundamenta el desarrollo de MK SERVICE.

\newpage

# Marco Teórico

El Marco Teórico provee los fundamentos conceptuales y técnicos necesarios para entender el problema de auditoría de vulnerabilidades en sistemas RAG y para sustentar las decisiones de implementación de MK SERVICE: lenguajes, frameworks, patrones de arquitectura y metodologías de desarrollo.

## Arquitectura de Recuperación Aumentada por Generación (RAG)

**Retrieval-Augmented Generation (RAG).** Técnica propuesta por Lewis et al. (2020) que combina un modelo de lenguaje preentrenado (memoria paramétrica) con un índice de documentos externo (memoria no paramétrica). En lugar de responder solo con lo que aprendió durante el entrenamiento, el modelo recibe en su contexto fragmentos de documentos relevantes a la consulta y genera la respuesta a partir de ellos.

**Flujo técnico de un sistema RAG.** El proceso se divide en dos etapas, y ambas son relevantes para la auditoría:

1. *Ingesta (offline):* el documento (PDF, DOCX, TXT) se convierte a texto plano mediante un extractor (*parser*); el texto se divide en fragmentos o *chunks* de tamaño fijo o semántico, normalmente con cierto solapamiento; cada fragmento se transforma en un vector numérico (*embedding*) y se almacena en una base de datos vectorial junto con sus metadatos.
2. *Consulta (online):* la pregunta del usuario se convierte también en un embedding; el sistema recupera los *k* fragmentos más similares (búsqueda *top-k* por similitud del coseno u otra métrica de distancia); estos fragmentos se insertan en el *prompt* junto con las instrucciones del sistema (*system prompt*) y la pregunta; finalmente el modelo genera la respuesta.

**Vector embeddings y bases de datos vectoriales.** Los embeddings son representaciones densas en las que textos con significado parecido quedan cerca en el espacio vectorial (Reimers & Gurevych, 2019; Karpukhin et al., 2020). Las bases vectoriales (por ejemplo, FAISS, Chroma, pgvector o Pinecone) indexan estos vectores para búsquedas aproximadas de vecinos más cercanos.

**Implicación de seguridad.** El punto crítico es que, en el paso de *aumento*, el texto recuperado y las instrucciones del sistema se concatenan en una misma secuencia de entrada. El modelo no tiene una separación estructural fiable entre "datos" e "instrucciones", por lo que un fragmento de documento redactado como orden puede ser interpretado como tal. Además, como la recuperación depende de la similitud semántica, un atacante puede diseñar un documento para que sea recuperado justamente ante ciertas preguntas (Zou et al., 2025). MK SERVICE explota de forma controlada estas dos propiedades para auditar el sistema.

## Vectores de Ataque en Aplicaciones de IA Generativa

**Inyección directa de prompts.** Instrucciones maliciosas escritas por el propio usuario en la consulta, con el objetivo de anular el *system prompt* o cambiar el comportamiento del modelo (Perez & Ribeiro, 2022). En MK SERVICE se evalúa en el **Modo Básico**, que solo requiere el endpoint de chat.

**Inyección indirecta de prompts.** Instrucciones incrustadas en fuentes de datos que el sistema lee, como documentos recuperados por RAG (Greshake et al., 2023). Se evalúa en el **Modo Completo**, que añade el endpoint de carga de documentos. Las técnicas de ocultamiento que contempla el catálogo incluyen: texto con formato invisible (color igual al fondo, tamaño de fuente mínimo), instrucciones en metadatos del archivo, delimitadores falsos que simulan el fin del contexto ("--- FIN DEL DOCUMENTO --- Nuevas instrucciones del sistema:"), suplantación de roles ("Mensaje del administrador:") y codificaciones alternativas del texto.

**Fuga de datos (Data Leakage).** Situación en la que el modelo expone información que no debería: el contenido del *system prompt*, fragmentos de otros documentos de la base de conocimiento, datos personales (PII) o secretos como claves de API (OWASP Foundation, 2024; Zeng et al., 2024).

**Contaminación del conocimiento (Knowledge Poisoning).** Inserción deliberada de documentos que alteran las respuestas del modelo sobre un tema específico, por ejemplo, haciendo que afirme datos falsos con apariencia de fuente confiable (Zou et al., 2025).

**Tokens canario.** Técnica central del motor de detección. Un canario es una cadena única y aleatoria (por ejemplo, `MKS-CANARY-7f3a9c`) que se inserta en un documento cebo o en una instrucción maliciosa. Si esa cadena aparece en la respuesta del target, existe evidencia objetiva y verificable de que el modelo leyó y ejecutó la instrucción inyectada, o de que filtró contenido que no debía. Esto reduce la ambigüedad de interpretar respuestas en lenguaje natural.

## Metodologías de Auditoría, Clasificación y Gestión de Riesgos

**OWASP Top 10 para aplicaciones LLM.** Marco de referencia que ubica *LLM01: Prompt Injection* y *LLM02: Sensitive Information Disclosure* como los riesgos más prominentes en aplicaciones de IA (OWASP Foundation, 2024). Cada hallazgo de MK SERVICE se etiqueta con la categoría OWASP correspondiente, lo que facilita su interpretación por equipos que ya conocen este estándar.

**MITRE ATLAS y taxonomía del NIST.** MITRE ATLAS cataloga tácticas y técnicas de adversarios contra sistemas de IA, de forma análoga a MITRE ATT&CK para sistemas tradicionales (MITRE, 2024). Junto con la taxonomía de Vassilev et al. (2024), sirve para clasificar los documentos de ataque del catálogo por técnica.

**Escala de severidad (CVSS).** El Common Vulnerability Scoring System v3.1 define una escala cualitativa ampliamente adoptada: Baja (0,1–3,9), Media (4,0–6,9), Alta (7,0–8,9) y Crítica (9,0–10,0) (FIRST, 2019). MK SERVICE adopta esta misma escala para que sus resultados sean comparables con los de otras herramientas de seguridad.

**Modelo de cálculo del rango de vulnerabilidad.** Dado que los modelos de lenguaje responden de forma no determinista, cada caso de prueba se ejecuta *n* veces (por defecto entre 3 y 5) y se calcula la tasa de éxito *T* (proporción de intentos en que el ataque funcionó). Como propuesta inicial, a calibrar durante la fase de validación, el puntaje de riesgo *R* de un hallazgo se calcula así:

$$R = \min\left(10,\; S_b \cdot (0{,}6 + 0{,}4\,T) \cdot F_p\right)$$

donde $S_b$ es la severidad base asignada al documento de ataque (0–10, según la categoría y el daño potencial), $T$ es la tasa de éxito observada (0–1) y $F_p$ es un factor de exposición según los permisos del target (por ejemplo, 0,8 si solo responde preguntas, 0,9 si lee documentos cargados por usuarios y 1,0 si además puede ejecutar acciones o herramientas). El rango de vulnerabilidad global de una campaña se obtiene a partir del hallazgo de mayor puntaje y de la distribución de hallazgos por severidad.

**Gestión de remediación (backlog priorizado).** Los hallazgos se transforman en elementos de trabajo con título, severidad, recomendación, orden de prioridad y estado (Abierta, En progreso, Resuelta, Falso positivo, Riesgo aceptado). El orden de prioridad se deriva del puntaje *R*, de modo que el equipo del cliente atienda primero lo que más expone al sistema.

## Fundamentos Tecnológicos de la Plataforma

Esta sección describe las tecnologías con las que se construirá MK SERVICE y el fundamento técnico de su elección, de acuerdo con el documento de arquitectura (SAD v1.0).

| Capa | Tecnología | Lenguaje | Función en MK SERVICE |
|---|---|---|---|
| Frontend | React + Vite + Tailwind CSS | JavaScript (JSX) | Interfaz web responsive por rol |
| API | FastAPI + Pydantic | Python 3.11+ | API REST, validación, autenticación |
| Persistencia | PostgreSQL + Row Level Security | SQL | Datos multi-tenant y trazabilidad |
| Acceso a datos | SQLAlchemy + Alembic (propuesto) | Python | ORM y migraciones versionadas |
| Cola de trabajos | Redis + RQ | Python | Ejecución asíncrona de campañas |
| Archivos | Object Storage S3 (MinIO / R2 / S3) | — | Documentos de ataque e informes |
| Informes | Jinja2 + WeasyPrint | Python / HTML / CSS | Generación de PDF ejecutivo y técnico |
| Seguridad | JWT, Argon2/bcrypt, TLS 1.2+ | — | Autenticación, contraseñas, transporte |
| Pruebas | pytest, pruebas de API | Python | Pruebas unitarias e integración |
| Despliegue | Docker + Docker Compose | YAML | Entornos reproducibles |

### Python y FastAPI

**Python** es el lenguaje principal del backend, de los workers y del motor de detección. Su elección responde a su ecosistema maduro en IA, procesamiento de texto y manipulación de documentos (por ejemplo, librerías para generar PDF y DOCX cebo), y a que es el mismo lenguaje en el que están escritas herramientas de referencia como garak y PyRIT.

**FastAPI** es un framework web para construir APIs sobre el estándar **ASGI** (Asynchronous Server Gateway Interface), lo que le permite atender múltiples peticiones concurrentes mediante `async/await` sin bloquear el servidor (Ramírez, 2018). Usa **Pydantic** para definir los esquemas de datos con anotaciones de tipo de Python: cada petición se valida automáticamente antes de llegar a la lógica de negocio, lo que reduce errores y entradas maliciosas. Además genera automáticamente la especificación **OpenAPI**, que documenta todos los endpoints y sirve de contrato entre frontend y backend.

La API sigue el estilo arquitectónico **REST** (Fielding, 2000): los recursos del dominio (organizaciones, targets, campañas, hallazgos, informes) se exponen como URLs y se manipulan con los verbos HTTP estándar (GET, POST, PATCH, DELETE).

### PostgreSQL y Row Level Security

**PostgreSQL** es un sistema gestor de bases de datos relacional de código abierto, con soporte completo de transacciones ACID, integridad referencial y tipos de datos avanzados como JSONB (útil para almacenar la evidencia de las respuestas del target).

El aislamiento entre organizaciones (*multi-tenancy*) se implementa con **Row Level Security (RLS)**: políticas definidas en la propia base de datos que filtran automáticamente las filas según la organización del usuario que hace la consulta (PostgreSQL Global Development Group, 2024). Así, aunque existiera un error en el código de la aplicación, la base de datos seguiría impidiendo que una organización lea datos de otra. Es una aplicación directa del principio de **defensa en profundidad**.

Para el acceso a datos se propone **SQLAlchemy** como ORM (mapeo objeto-relacional) y **Alembic** para versionar las migraciones del esquema, de forma que cada cambio en la estructura de la base de datos quede registrado y pueda reproducirse en cualquier entorno.

### Procesamiento asíncrono con Redis y RQ

Una campaña de auditoría puede tardar varios minutos (carga de documentos, múltiples consultas, repeticiones por caso). Si se ejecutara dentro de la petición HTTP, el usuario quedaría esperando y el servidor se bloquearía. Por eso se aplica el patrón **productor–consumidor**: la API (productor) registra la campaña y encola un trabajo; procesos independientes llamados **workers** (consumidores) toman los trabajos de la cola y los ejecutan.

**Redis** es un almacén de datos en memoria que actúa como intermediario de la cola, y **RQ (Redis Queue)** es una librería de Python que simplifica la definición y ejecución de trabajos en segundo plano. Este diseño permite escalar horizontalmente: si aumenta la demanda, se agregan más workers sin modificar la API.

### Almacenamiento de objetos (Object Storage)

Los archivos binarios —documentos de ataque e informes PDF— se guardan en un almacenamiento de objetos compatible con la API de **Amazon S3**, y en PostgreSQL solo se almacena su metadata y ruta. En desarrollo se usa **MinIO** (servidor S3 de código abierto) y en producción un proveedor como Cloudflare R2 o AWS S3. Cada organización tiene un prefijo de ruta separado, lo que refuerza el aislamiento de los documentos personalizados.

### Seguridad de la plataforma

- **JSON Web Tokens (JWT):** estándar para representar de forma compacta y firmada la identidad y los permisos del usuario (Jones et al., 2015). Se usan tokens de acceso de corta duración y *refresh tokens* para renovarlos sin pedir la contraseña nuevamente.
- **Hash de contraseñas:** las contraseñas nunca se guardan en texto plano; se almacenan mediante funciones de derivación lentas y con sal como **Argon2**, recomendada por su resistencia a ataques con GPU (Biryukov et al., 2021), o bcrypt.
- **Cifrado de secretos de los targets:** las API keys o tokens que el cliente entrega para conectarse a su sistema RAG se almacenan cifradas con cifrado simétrico autenticado (por ejemplo, AES-GCM), con la clave fuera de la base de datos.
- **Control de acceso basado en roles (RBAC):** cada usuario tiene un rol (Owner, Auditor, Viewer, Admin) que determina qué operaciones puede realizar, siguiendo el principio de menor privilegio.
- **Transporte seguro:** toda comunicación usa HTTPS con TLS 1.2 o superior.
- **Verificación de requisitos de seguridad:** como lista de control se toma el OWASP Application Security Verification Standard (ASVS) (OWASP Foundation, 2021b).

### Motor de detección

El motor de detección se ejecuta dentro de los workers y analiza cada respuesta del target combinando varias técnicas:

1. **Detección por canario:** búsqueda exacta del token canario en la respuesta (evidencia de alta confianza).
2. **Detección por patrones:** expresiones regulares para identificar datos sensibles filtrados, como correos, números de documento, claves de API o fragmentos del *system prompt*.
3. **Detección de desviación de tarea:** comparación de la respuesta con el comportamiento esperado (por ejemplo, si el documento cebo ordenaba responder en otro idioma o insertar un enlace y el modelo lo hizo).

Cada detección positiva genera un hallazgo con su evidencia (consulta enviada, extracto de la respuesta, documento usado y número de intentos exitosos).

### Generación de informes

Los informes se construyen con plantillas HTML parametrizadas (**Jinja2**) que luego se convierten a PDF con **WeasyPrint**, una librería de Python que interpreta HTML y CSS. Este enfoque permite diseñar los informes con las mismas tecnologías web del frontend y mantener dos plantillas: una ejecutiva (resumen de riesgo y prioridades) y una técnica (detalle de hallazgos, evidencia y comparación con la re-auditoría).

### Frontend: React, Vite y Tailwind CSS

**React** es una librería de JavaScript para construir interfaces de usuario a partir de componentes reutilizables que se actualizan de forma declarativa cuando cambia el estado de la aplicación. **Vite** es la herramienta de construcción y servidor de desarrollo, con recarga instantánea. **Tailwind CSS** es un framework de estilos basado en clases utilitarias que acelera la construcción de interfaces responsive y consistentes. La interfaz consume la API REST y adapta las vistas según el rol del usuario.

### Contenedores: Docker y Docker Compose

**Docker** empaqueta cada componente (API, worker, base de datos, Redis, MinIO) en un contenedor con todas sus dependencias, lo que garantiza que el sistema se comporte igual en el equipo de cada desarrollador, en el entorno de pruebas y en producción. **Docker Compose** permite levantar todo el entorno con un único archivo de configuración.

## Metodologías de Ingeniería de Software

**Scrum como marco de gestión ágil.** El desarrollo se organiza en *sprints* (iteraciones cortas de duración fija) en las que el equipo planifica, construye, revisa y ajusta (Schwaber & Sutherland, 2020). Esto permite entregar incrementos funcionales del MVP de forma progresiva y adaptar el alcance según los resultados de cada iteración.

**Especificación de requisitos (IEEE 830).** El documento SRS del proyecto sigue la estructura recomendada por IEEE 830-1998, separando requisitos funcionales (RF-01 a RF-10) y no funcionales (RNF-01 a RNF-06), con una matriz de trazabilidad que vincula cada requisito con su prioridad.

**Modelo C4 y registros de decisiones (ADR).** La arquitectura se documenta con el modelo C4, que describe el sistema en niveles de abstracción progresivos: contexto, contenedores, componentes y código (Brown, 2018). Las decisiones de arquitectura relevantes se registran como ADR (*Architecture Decision Records*), indicando el contexto, la decisión y sus consecuencias (Nygard, 2011).

**Desarrollo seguro (Secure SDLC).** La seguridad se integra en todas las fases del ciclo de vida y no solo al final: modelado de amenazas en el diseño, revisión de código entre pares, análisis de dependencias vulnerables y pruebas de seguridad sobre la propia plataforma (por ejemplo, verificar que las políticas RLS impiden accesos entre organizaciones).

**Control de versiones y flujo de trabajo.** El código se gestiona con **Git** en un repositorio compartido, con ramas por funcionalidad (*feature branches*) y fusión a la rama principal mediante *pull requests* revisados por otro integrante del equipo.

**Estrategia de pruebas.** Se aplica la pirámide de pruebas: pruebas unitarias con **pytest** para la lógica de detección y cálculo de severidad; pruebas de integración de la API contra una base de datos de prueba; y pruebas de extremo a extremo (*end-to-end*) ejecutando campañas completas contra un target RAG de prueba controlado por el equipo.

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

El proyecto se ejecuta en siete fases. Las fases 1 y 2 son principalmente de diseño y se desarrollan de forma secuencial; las fases 3 a 6 se ejecutan de manera iterativa mediante sprints de dos semanas bajo el marco Scrum, de modo que al final de cada sprint exista un incremento funcional que pueda demostrarse; la fase 7 cierra el proyecto con la validación experimental. La siguiente tabla resume el plan y a continuación se detalla cada fase.

| Fase | Actividad principal | Duración estimada | Producto esperado |
|------|---------------------|-------------------|-------------------|
| 1. Diagnóstico y diseño | Planteamiento, requisitos (SRS) y arquitectura (SAD) | Semanas 1–3 | Documentación de diseño y alcance MVP |
| 2. Modelado de datos | Esquema relacional multi-tenant, integridad y roles | Semanas 3–4 | Modelo de datos y scripts de base de datos |
| 3. Catálogo de ataques | Documentos cebo para prompt injection y data leakage | Semanas 4–7 (paralela) | Biblioteca de documentos de ataque |
| 4. Implementación del backend | API REST, autenticación, targets, campañas | Semanas 5–8 (sprints 1–2) | Servicios operativos del MVP |
| 5. Motor de auditoría | Ejecución asíncrona, captura de evidencia y detección | Semanas 9–11 (sprints 3–4) | Campañas ejecutables con estados y progreso |
| 6. Métricas, backlog e informes | Severidad/impacto, backlog, PDF, comparación | Semanas 11–13 (sprint 5) | Hallazgos priorizados e informes |
| 7. Validación | Pruebas funcionales, de seguridad, usabilidad y experimentales | Semanas 14–16 | Evidencia de funcionamiento y limitaciones |

*Las semanas son referenciales y se ajustarán al calendario académico. Las fases 3 y 4 se solapan intencionalmente: mientras un integrante construye el catálogo de ataques, los demás avanzan en el backend.*

### Fase 1 — Diagnóstico y diseño

**Objetivo:** definir con precisión qué se va a construir y cómo, antes de escribir código.

**Actividades:**

- Formular el problema, la pregunta de investigación y los objetivos (secciones 1 a 4 de este documento).
- Realizar la revisión de literatura que sustenta el estado del arte y el marco teórico.
- Levantar los requisitos funcionales y no funcionales y documentarlos en el SRS siguiendo IEEE 830.
- Diseñar la arquitectura con el modelo C4 (contexto y contenedores) y registrar las decisiones técnicas como ADR (FastAPI, PostgreSQL + RLS, RQ + Redis, almacenamiento híbrido, JWT, React + Tailwind).
- Definir el alcance del MVP y lo que queda explícitamente fuera (CI/CD, on-premise, monitoreo 24/7).
- Elaborar un modelo de amenazas de la propia plataforma: qué podría salir mal si MK SERVICE fuera atacado (fuga de secretos de targets, acceso entre organizaciones, abuso de la herramienta contra sistemas no autorizados).
- Construir el *Product Backlog* inicial a partir de los requisitos, con historias de usuario priorizadas.

**Entregables:** documento de planteamiento, SRS v1.0, SAD v1.0, modelo de amenazas y Product Backlog inicial.

**Criterio de salida:** requisitos y arquitectura revisados y aprobados por el equipo y el docente.

### Fase 2 — Modelado de datos

**Objetivo:** diseñar la estructura de la información que soporta todo el sistema, con aislamiento entre organizaciones y trazabilidad completa.

**Actividades:**

- Identificar las entidades principales: organizaciones, usuarios, roles, targets, documentos de ataque, campañas, ejecuciones de prueba, hallazgos, elementos del backlog, informes y log de auditoría.
- Elaborar el diagrama entidad-relación y normalizar el esquema (hasta tercera forma normal donde aplique).
- Definir las restricciones de integridad: llaves foráneas, valores permitidos para estados y severidades, campos obligatorios y marcas temporales (`created_at`, `updated_at`, `created_by`).
- Implementar las políticas de **Row Level Security** para que cada consulta quede filtrada por organización.
- Definir la vinculación entre campañas originales y re-ejecuciones, necesaria para la comparación (RF-07 y RF-08).
- Crear los scripts de migración (Alembic) y datos de prueba (*seeds*).

**Entregables:** diagrama entidad-relación, diccionario de datos, scripts de creación y migración, y políticas RLS documentadas.

**Criterio de salida:** prueba que demuestre que un usuario de una organización no puede leer ni modificar datos de otra, incluso con consultas directas.

### Fase 3 — Catálogo de ataques

**Objetivo:** construir la biblioteca de documentos cebo y consultas de ataque que usará el motor de auditoría.

**Actividades:**

- Clasificar las técnicas a partir de la literatura (Perez & Ribeiro, 2022; Greshake et al., 2023; Liu et al., 2024; Zou et al., 2025) y de las categorías OWASP LLM01 y LLM02.
- Diseñar cada caso de prueba con una estructura estándar: identificador, categoría (inyección directa, inyección indirecta, fuga de datos), técnica de ocultamiento, formato del archivo (PDF, DOCX, TXT), consulta disparadora, token canario, indicador de éxito, severidad base y recomendación de mitigación asociada.
- Generar los documentos cebo de forma programática con Python, para poder producir variantes (distintos canarios, formatos y ubicaciones del payload) sin editarlos a mano.
- Probar cada caso contra un target RAG de laboratorio para confirmar que es capaz de detectar la vulnerabilidad cuando existe (y que no produce falsos positivos en un sistema protegido).
- Implementar el espacio de documentos personalizados por organización.

**Entregables:** catálogo inicial (meta: al menos 20 casos de prueba distribuidos entre las tres categorías), especificación del formato de los casos y script de generación de documentos.

**Criterio de salida:** cada caso del catálogo tiene un resultado esperado documentado y fue verificado al menos una vez en el laboratorio.

### Fase 4 — Implementación del backend

**Objetivo:** construir los servicios de la API REST que soportan la gestión de la plataforma.

**Actividades (sprint 1):**

- Configurar el repositorio, la estructura del proyecto FastAPI y el entorno Docker Compose (API, PostgreSQL, Redis, MinIO).
- Implementar el módulo de autenticación: registro, inicio de sesión, emisión y renovación de JWT, hash de contraseñas con Argon2.
- Implementar la gestión de organizaciones, usuarios e invitaciones con control de acceso por rol (RF-01).

**Actividades (sprint 2):**

- Implementar el registro de targets en Modo Básico y Completo, con cifrado de los secretos de conexión y prueba de conectividad (RF-02).
- Implementar la gestión de la biblioteca de documentos de ataque y la carga de documentos personalizados al Object Storage (RF-03).
- Implementar la creación de campañas y su registro en estado `queued` (RF-04).
- Construir las primeras vistas del frontend: inicio de sesión, dashboard y gestión de targets.

**Entregables:** API documentada en OpenAPI, pruebas unitarias e integración de cada endpoint y primeras pantallas del frontend.

**Criterio de salida:** un usuario puede registrarse, crear un target, validar su conexión y crear una campaña desde la interfaz.

### Fase 5 — Motor de auditoría

**Objetivo:** implementar la ejecución real de las campañas y la detección de vulnerabilidades.

**Actividades (sprint 3):**

- Configurar los workers RQ y el ciclo de vida de la campaña (En cola → En ejecución → Completada / Fallida / Cancelada).
- Implementar el adaptador de conexión con el target: envío de mensajes en formato compatible con OpenAI Chat Completions y, en Modo Completo, carga de documentos al endpoint del cliente.
- Manejar errores de red, tiempos de espera, reintentos y límites de tasa del target, para que una campaña no falle por completo ante un error puntual.
- Registrar el progreso de la campaña para que el frontend lo muestre.

**Actividades (sprint 4):**

- Implementar el motor de detección: búsqueda de canarios, patrones de datos sensibles y desviación de tarea.
- Ejecutar cada caso de prueba *n* veces para calcular su tasa de éxito, dada la naturaleza no determinista de los modelos.
- Almacenar la evidencia de cada intento (consulta, extracto de respuesta, documento usado, resultado).

**Entregables:** campañas ejecutables de extremo a extremo contra el target de laboratorio, con hallazgos y evidencia almacenados.

**Criterio de salida:** una campaña completa se ejecuta en segundo plano, reporta progreso y genera hallazgos verificables.

### Fase 6 — Métricas, backlog e informes

**Objetivo:** convertir los hallazgos en información útil para la toma de decisiones.

**Actividades:**

- Implementar el cálculo del puntaje de riesgo *R* y su clasificación en la escala Baja / Media / Alta / Crítica (sección 6.3).
- Calcular el rango de vulnerabilidad global de la campaña.
- Generar automáticamente el backlog con título, severidad, recomendación, orden de prioridad y estado (RF-05).
- Implementar la re-ejecución de campañas y la comparación entre auditoría y re-auditoría: vulnerabilidades resueltas, persistentes y nuevas (RF-07 y RF-08).
- Construir las plantillas de informe ejecutivo y técnico y su generación en PDF (RF-06), además de la exportación del backlog a CSV (RF-09).
- Completar las vistas del frontend: backlog, comparación y descarga de informes, adaptadas por rol (RF-10).

**Entregables:** backlog funcional, informes PDF, exportación CSV y vista de comparación.

**Criterio de salida:** a partir de una campaña real se obtiene un backlog priorizado y ambos informes descargables.

### Fase 7 — Validación

**Objetivo:** demostrar con evidencia que MK SERVICE cumple los objetivos y documentar sus limitaciones.

**Actividades:**

- **Validación experimental:** preparar al menos dos targets RAG de laboratorio, uno intencionalmente vulnerable (sin defensas) y otro con mitigaciones (separación de instrucciones y datos, filtrado de salida, instrucciones de sistema reforzadas). Ejecutar campañas sobre ambos y comparar: se espera que el sistema detecte más vulnerabilidades y de mayor severidad en el target vulnerable.
- **Validación de la re-auditoría:** aplicar mitigaciones al target vulnerable, re-ejecutar la campaña y verificar que la comparación refleje correctamente las vulnerabilidades resueltas.
- **Medición de precisión:** contrastar los hallazgos del sistema con una revisión manual del equipo para estimar falsos positivos y falsos negativos.
- **Pruebas de seguridad de la propia plataforma:** verificar el aislamiento entre organizaciones, el cifrado de secretos y el control de acceso por rol.
- **Prueba de usabilidad:** realizar la prueba con al menos 5 usuarios representativos definida en RNF-01 (meta: 80 % de éxito en las tareas sin ayuda).
- Documentar resultados, limitaciones y trabajo futuro.

**Entregables:** informe de validación con resultados cuantitativos, registro de la prueba de usabilidad y documento final del proyecto.

**Criterio de salida:** evidencia documentada del cumplimiento de los criterios de evaluación (sección 7.5).

### Gestión del proyecto

- **Marco de trabajo:** Scrum adaptado a un equipo de tres integrantes. Se definirán los roles de *Product Owner* y *Scrum Master* dentro del equipo, y los tres participan como desarrolladores.
- **Ceremonias:** planificación al inicio de cada sprint, seguimiento corto dos veces por semana, revisión con demostración del incremento y retrospectiva al cierre.
- **Herramientas:** Git y GitHub para el código, un tablero Kanban (por ejemplo, GitHub Projects) para el backlog del proyecto y repositorio compartido de documentación.
- **Calidad:** ninguna funcionalidad se considera terminada sin pruebas, revisión de código por otro integrante y documentación del endpoint correspondiente.

### Riesgos del proyecto y mitigación

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Respuestas no deterministas del modelo auditado | Resultados inconsistentes entre ejecuciones | Repeticiones por caso y uso de tasas de éxito |
| Costo o límites de uso de APIs de modelos para el target de laboratorio | Retrasos en pruebas | Uso de modelos locales de código abierto para el laboratorio |
| Alcance mayor al tiempo disponible | MVP incompleto | Priorización estricta del backlog; RF-08 y RF-09 pueden ajustarse |
| Falsos positivos en la detección | Pérdida de confianza en los resultados | Detección basada en canarios y revisión manual en la validación |
| Uso indebido de la herramienta | Riesgo ético y legal | Pruebas solo contra targets propios o autorizados; declaración de autorización al registrar un target |

### Consideraciones éticas

MK SERVICE es una herramienta ofensiva con fines defensivos. Durante el proyecto, todas las campañas se ejecutarán exclusivamente contra targets de laboratorio construidos por el equipo o sistemas cuya prueba haya sido autorizada por escrito. Los documentos cebo no contendrán datos personales reales, y cualquier dato sensible usado en las pruebas será ficticio, en coherencia con la Ley 1581 de 2012.

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

Biryukov, A., Dinu, D., Khovratovich, D., & Josefsson, S. (2021). *Argon2 memory-hard function for password hashing and proof-of-work applications* (RFC 9106). Internet Engineering Task Force. https://doi.org/10.17487/RFC9106

Brown, S. (2018). *The C4 model for visualising software architecture*. https://c4model.com

Derczynski, L., Galinkin, E., Martin, J., Majumdar, S., & Inie, N. (2024). *garak: A framework for security probing large language models* (arXiv:2406.11036). arXiv. https://doi.org/10.48550/arXiv.2406.11036

Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Tesis doctoral, University of California, Irvine].

FIRST. (2019). *Common Vulnerability Scoring System v3.1: Specification document*. Forum of Incident Response and Security Teams. https://www.first.org/cvss/v3.1/specification-document

Greshake, K., Abdelnabi, S., Mishra, S., Endres, C., Holz, T., & Fritz, M. (2023). Not what you've signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection. En *Proceedings of the 16th ACM Workshop on Artificial Intelligence and Security* (pp. 79–90). ACM. https://doi.org/10.1145/3605764.3623985

IBM. (2024). *Cost of a data breach report 2024*. IBM Security. https://www.ibm.com/reports/data-breach

IEEE. (1998). *IEEE recommended practice for software requirements specifications* (IEEE Std 830-1998). Institute of Electrical and Electronics Engineers.

Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). Internet Engineering Task Force. https://doi.org/10.17487/RFC7519

Karpukhin, V., Oguz, B., Min, S., Lewis, P., Wu, L., Edunov, S., Chen, D., & Yih, W. (2020). Dense passage retrieval for open-domain question answering. En *Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP)* (pp. 6769–6781). Association for Computational Linguistics.

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *Advances in Neural Information Processing Systems, 33*, 9459–9474.

Liu, Y., Jia, Y., Geng, R., Jia, J., & Gong, N. Z. (2024). Formalizing and benchmarking prompt injection attacks and defenses. En *Proceedings of the 33rd USENIX Security Symposium*. USENIX Association.

Microsoft. (2024). *PyRIT: Python Risk Identification Tool for generative AI* [Software]. GitHub. https://github.com/Azure/PyRIT

MITRE. (2024). *ATLAS: Adversarial threat landscape for artificial-intelligence systems*. The MITRE Corporation. https://atlas.mitre.org

Nygard, M. (2011). *Documenting architecture decisions*. Cognitect. https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

OWASP Foundation. (2021). *OWASP Top 10:2021*. https://owasp.org/Top10/

OWASP Foundation. (2021b). *Application Security Verification Standard 4.0.3*. https://owasp.org/www-project-application-security-verification-standard/

OWASP Foundation. (2024). *OWASP Top 10 for LLM applications 2025*. https://genai.owasp.org/llm-top-10/

Perez, F., & Ribeiro, I. (2022). *Ignore previous prompt: Attack techniques for language models* (arXiv:2211.09527). arXiv. https://doi.org/10.48550/arXiv.2211.09527

PostgreSQL Global Development Group. (2024). *PostgreSQL documentation: Row security policies*. https://www.postgresql.org/docs/current/ddl-rowsecurity.html

Ramírez, S. (2018). *FastAPI* [Software]. https://fastapi.tiangolo.com

Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. En *Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing (EMNLP-IJCNLP)* (pp. 3982–3992). Association for Computational Linguistics.

Schwaber, K., & Sutherland, J. (2020). *The Scrum guide*. https://scrumguides.org

Vassilev, A., Oprea, A., Fordyce, A., & Anderson, H. (2024). *Adversarial machine learning: A taxonomy and terminology of attacks and mitigations* (NIST AI 100-2e2023). National Institute of Standards and Technology. https://doi.org/10.6028/NIST.AI.100-2e2023

Zeng, S., Zhang, J., He, P., Xing, Y., Liu, Y., Xu, H., Ren, J., Wang, S., Yin, D., Chang, Y., & Tang, J. (2024). The good and the bad: Exploring privacy issues in retrieval-augmented generation (RAG). En *Findings of the Association for Computational Linguistics: ACL 2024*. Association for Computational Linguistics.

Zou, W., Geng, R., Wang, B., & Jia, J. (2025). PoisonedRAG: Knowledge corruption attacks to retrieval-augmented generation of large language models. En *Proceedings of the 34th USENIX Security Symposium*. USENIX Association.
