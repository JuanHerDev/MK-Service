# 03 — Software Requirements Specification (SRS)
## MK Service: Auditoría Automatizada de Prompt Injection y Data Leakage en Sistemas RAG

| Campo              | Valor                                      |
|--------------------|--------------------------------------------|
| **Versión**        | 1.0                                        |
| **Fecha**          | Septiembre 2026                            |
| **Estado**         | Aprobado para MVP                          |
| **Producto**       | MK Service                                 |
| **Tipo de entrega**| SaaS (Cloud) prioritario                   |
| **Enfoque**        | Comercial (con rigor académico)            |

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requisitos de software de **MK Service**, una plataforma SaaS diseñada para realizar auditorías externas y automatizadas de sistemas RAG (Retrieval-Augmented Generation).

El objetivo principal de MK Service es detectar vulnerabilidades de:

- Prompt Injection Directo
- Prompt Injection Indirecto
- Data Leakage

y generar un backlog priorizado de recomendaciones junto con informes de seguridad ejecutivos y técnicos.

Este SRS sirve como contrato entre las necesidades del negocio, los requisitos académicos y el equipo de desarrollo. Define de forma precisa *qué* debe hacer el sistema, sin entrar aún en *cómo* se implementará (eso corresponde al documento de arquitectura).

### 1.2 Alcance

**Dentro del alcance del MVP (v1.0):**

- Dos modos de conexión con el RAG del cliente:
  - **Modo Básico**: solo endpoint de chat → permite pruebas de Prompt Injection Directo.
  - **Modo Completo**: endpoint de chat + endpoint de carga de documentos temporales → permite pruebas de Prompt Injection Indirecto y Data Leakage.
- Biblioteca de documentos de ataque predefinidos (gestionados por el sistema).
- Posibilidad de que el Owner o Auditor suba documentos personalizados (almacenados de forma aislada por organización).
- Ejecución automática de campañas de auditoría una vez configurados los endpoints.
- Generación de:
  - Informe PDF Ejecutivo
  - Informe PDF Técnico
  - Backlog de vulnerabilidades (título, severidad, recomendación priorizada, estado)
- Historial de campañas, re-ejecución y comparación entre auditoría y re-auditoría.
- Exportación del backlog a CSV.
- Roles de usuario: Owner, Admin, Auditor y Viewer.
- Despliegue prioritario: Cloud (SaaS) como aplicación web responsive.

**Fuera del alcance del MVP (v1.0):**

- Integración con pipelines CI/CD del cliente.
- Acceso directo a vector stores del cliente.
- Opción On-premise.
- Monitoreo continuo 24/7 (solo auditorías bajo demanda).
- Jailbreaking de modelos base sin componente RAG.
- Aplicaciones nativas (móvil o escritorio).

### 1.3 Definiciones, Acrónimos y Abreviaturas

| Término                      | Definición                                                                 |
|-----------------------------|----------------------------------------------------------------------------|
| RAG                         | Retrieval-Augmented Generation                                             |
| Prompt Injection Directo    | Instrucciones maliciosas enviadas directamente en la consulta del usuario  |
| Prompt Injection Indirecto  | Instrucciones maliciosas ocultas en documentos recuperados por el sistema  |
| Data Leakage                | Exposición no autorizada de información sensible (contexto, PII, secretos) |
| Target                      | Sistema RAG del cliente que será auditado                                  |
| Campaña                     | Ejecución concreta de un conjunto de pruebas contra un Target              |
| Backlog                     | Lista priorizada de vulnerabilidades detectadas con recomendaciones        |
| Canario / Documento de ataque | Documento diseñado para probar vulnerabilidades específicas             |
| Owner                       | Dueño de la cuenta de la organización cliente                              |
| MVP                         | Minimum Viable Product                                                     |

### 1.4 Referencias

- OWASP Top 10 for Large Language Model Applications (2025)
- NIST AI Risk Management Framework
- MITRE ATLAS
- IEEE 830-1998 (Recommended Practice for Software Requirements Specifications)
- Ley 1581 de 2012 (Protección de datos personales – Colombia)

---

## 2. Descripción General

### 2.1 Perspectiva del Producto

MK Service es una plataforma de auditoría externa. No se integra al pipeline de desarrollo ni a la infraestructura interna del cliente. Una vez el cliente proporciona los endpoints necesarios, el sistema genera y envía automáticamente los documentos y consultas de prueba.

### 2.2 Funciones Principales

1. Gestión multi-tenant de organizaciones y usuarios.
2. Registro y validación de Targets (Modo Básico y Modo Completo).
3. Gestión de biblioteca de documentos de ataque (global + personalizados por organización).
4. Creación, ejecución, re-ejecución e historial de campañas de auditoría.
5. Detección automática de vulnerabilidades y generación de backlog priorizado.
6. Comparación entre una auditoría y su re-auditoría.
7. Generación de informes PDF (ejecutivo y técnico) y exportación a CSV.
8. Interfaz web responsive usable por perfiles técnicos y no técnicos.

### 2.3 Características de los Usuarios

| Rol       | Descripción                                                                 | Nivel técnico esperado      |
|-----------|-----------------------------------------------------------------------------|-----------------------------|
| Owner     | Dueño de la cuenta de la empresa. Gestiona su organización y puede lanzar auditorías. | Bajo – Medio               |
| Admin     | Administrador de la plataforma MK Service (nivel sistema).                  | Alto                        |
| Auditor   | Profesional que configura targets, lanza campañas y gestiona hallazgos.     | Medio – Alto                |
| Viewer    | Analista o persona de compliance que solo revisa reportes y backlog.        | Bajo – Medio                |

### 2.4 Restricciones

- La auditoría es **externa**. No existe integración con el CI/CD del cliente.
- El sistema no almacena de forma permanente documentos del cliente más allá de lo necesario para la campaña.
- Los documentos de ataque personalizados de una organización están completamente aislados de los de otras organizaciones.
- Prioridad de despliegue: Cloud (SaaS).
- La interfaz se entrega exclusivamente como aplicación web responsive.

### 2.5 Supuestos y Dependencias

- El cliente proporciona endpoints accesibles desde Internet (o mediante túnel seguro si se requiere).
- El endpoint de chat es compatible con el formato de mensajes tipo OpenAI o equivalente.
- En Modo Completo, el cliente expone un mecanismo temporal de carga de documentos.
- Existe conectividad estable durante la ejecución de las campañas.

---

## 3. Requisitos Específicos

### 3.1 Requisitos Funcionales

#### RF-01 — Gestión de Organizaciones y Usuarios

El sistema debe permitir:

- Crear organizaciones (empresas clientes).
- Invitar y gestionar usuarios dentro de una organización con los roles Owner, Auditor y Viewer.
- Que un Admin de plataforma gestione todas las organizaciones.
- Que cada usuario (excepto Admin) solo vea la información de su propia organización.

#### RF-02 — Registro de Targets

El sistema debe permitir registrar un Target con dos modos:

- **Modo Básico**: URL del endpoint de chat + método de autenticación (API Key / Bearer Token u otro mecanismo soportado).
- **Modo Completo**: además del endpoint de chat, un endpoint o mecanismo para carga temporal de documentos.

El sistema debe validar la conectividad del Target antes de permitir su uso en campañas.

#### RF-03 — Biblioteca de Documentos de Ataque

El sistema debe contar con:

- Una biblioteca global de documentos de ataque predefinidos (gestionada por el Admin). Estos documentos cubren diferentes técnicas de Prompt Injection Directo, Prompt Injection Indirecto y Data Leakage.
- Un espacio aislado por organización donde el Owner o Auditor puede subir documentos personalizados.
- Al crear una campaña, el usuario debe poder seleccionar qué documentos (predefinidos y/o personalizados) se utilizarán.

#### RF-04 — Campañas de Auditoría

El sistema debe permitir:

- Crear una campaña seleccionando: Target, modo (Básico o Completo), documentos de ataque y configuración básica.
- Ejecutar la campaña de forma automática (envío de documentos si aplica + envío de consultas).
- Consultar el estado de la campaña en tiempo real (En cola, En ejecución, Completada, Fallida, Cancelada).

#### RF-05 — Detección de Vulnerabilidades y Backlog

Al finalizar una campaña, el sistema debe:

- Analizar las respuestas del Target.
- Generar hallazgos con: título, severidad (Critical / High / Medium / Low), descripción y evidencia.
- Crear automáticamente entradas en el Backlog con:
  - Título de la vulnerabilidad
  - Severidad
  - Recomendación de solución
  - Orden de prioridad
  - Estado (Abierta, En progreso, Resuelta, Falso positivo, Riesgo aceptado)

#### RF-06 — Generación de Informes

El sistema debe generar, al finalizar una campaña o bajo demanda:

- Informe PDF Ejecutivo (orientado a gerencia y compliance).
- Informe PDF Técnico (detalle completo con evidencia).

Ambos informes deben poder descargarse desde la plataforma.

#### RF-07 — Historial y Re-ejecución de Campañas

El sistema debe:

- Mantener un historial completo de todas las campañas ejecutadas por organización.
- Permitir re-ejecutar una campaña ya terminada (usando la misma configuración o permitiendo ajustes menores).
- Al re-ejecutar, crear una nueva campaña vinculada a la original para facilitar la comparación de resultados.

#### RF-08 — Comparación de Campañas (Auditoría vs Re-auditoría)

El sistema debe permitir comparar dos campañas vinculadas y mostrar de forma clara:

- Vulnerabilidades solucionadas (presentes en la original y ausentes en la re-ejecución).
- Vulnerabilidades que persisten.
- Vulnerabilidades nuevas.

Esta comparación debe estar disponible en pantalla y reflejarse en el informe técnico.

#### RF-09 — Exportación

El sistema debe permitir exportar el backlog de una campaña (o de la organización) a formato CSV.

#### RF-10 — Interfaz de Usuario

El sistema se entregará como **aplicación web responsive**.

Debe incluir como mínimo las siguientes capacidades visuales:

- Dashboard con resumen de riesgo y campañas recientes.
- Gestión de Targets y Campañas.
- Vista de Backlog con estados y prioridades.
- Vista de comparación entre auditoría y re-auditoría.
- Descarga de informes y exportación a CSV.

La interfaz debe adaptarse al rol del usuario (más información técnica para Auditor, vistas más resumidas para Owner y Viewer).

---

### 3.2 Requisitos No Funcionales

#### RNF-01 — Usabilidad

El sistema deberá ser utilizable tanto por perfiles técnicos (Auditor) como no técnicos (Owner y Viewer).

Como criterio de aceptación del MVP, se realizará una prueba de usabilidad con al menos 5 usuarios representativos (mezcla de perfiles). Se considerará cumplido el requisito si al menos el 80 % de los participantes logra completar las siguientes tareas sin ayuda externa en un tiempo razonable:

1. Iniciar sesión y entender el dashboard principal.
2. Localizar y descargar el informe de la última campaña.
3. Entender el estado actual del backlog de vulnerabilidades.

El tiempo exacto se registrará como métrica de referencia, no como requisito contractual rígido.

#### RNF-02 — Seguridad

- Toda comunicación debe realizarse sobre HTTPS (TLS 1.2 o superior).
- Los secretos de autenticación de los Targets deben almacenarse cifrados.
- Debe existir aislamiento estricto de datos entre organizaciones (multi-tenancy).
- Todas las acciones relevantes deben quedar registradas en un log de auditoría.

#### RNF-03 — Rendimiento

- El dashboard principal debe cargar en menos de 3 segundos bajo condiciones normales.
- El sistema debe soportar la ejecución concurrente de múltiples campañas de diferentes organizaciones.

#### RNF-04 — Disponibilidad

- Objetivo de disponibilidad del servicio Cloud: 99,5 % mensual.

#### RNF-05 — Mantenibilidad

- La biblioteca de documentos de ataque debe poder actualizarse sin necesidad de redesplegar toda la aplicación.

#### RNF-06 — Cumplimiento

- El diseño debe facilitar el cumplimiento de la Ley 1581 de 2012 (datos personales).
- Los informes deben poder utilizarse como evidencia de debida diligencia.

---

## 4. Requisitos de Interfaz

### 4.1 Interfaces de Usuario

- Aplicación web responsive (escritorio prioritario, soporte adecuado para tablet).
- Navegadores soportados: últimas dos versiones estables de Chrome, Firefox, Edge y Safari.

### 4.2 Interfaces de Software

- Endpoints HTTP/HTTPS del cliente (chat y, en Modo Completo, carga de documentos).
- Formato de mensajes compatible con el estilo OpenAI Chat Completions o equivalente.

### 4.3 Interfaces de Comunicación

- HTTPS obligatorio.
- Autenticación mediante API Key / Bearer Token u otros mecanismos estándar acordados.

---

## 5. Otros Requisitos

### 5.1 Requisitos de Datos

- Los documentos de ataque personalizados de cada organización deben almacenarse de forma aislada.
- Los resultados de las campañas (hallazgos, evidencia, informes) deben conservarse según la política de retención definida (por defecto 12 meses, configurable).

### 5.2 Requisitos de Operaciones

- El sistema debe permitir el monitoreo básico de salud del servicio (health checks).
- Debe existir un mecanismo de respaldo de la base de datos.

---

## 6. Apéndices

### A. Matriz de Trazabilidad (ejemplo inicial)

| ID Requisito | Descripción breve                          | Prioridad MVP |
|--------------|--------------------------------------------|---------------|
| RF-01        | Gestión de organizaciones y usuarios       | Alta          |
| RF-02        | Registro de Targets                        | Alta          |
| RF-03        | Biblioteca de documentos de ataque         | Alta          |
| RF-04        | Campañas de auditoría                      | Alta          |
| RF-05        | Detección y backlog                        | Alta          |
| RF-06        | Generación de informes                     | Alta          |
| RF-07        | Historial y re-ejecución                   | Alta          |
| RF-08        | Comparación de campañas                    | Media-Alta    |
| RF-09        | Exportación CSV                            | Media         |
| RF-10        | Interfaz de usuario web                    | Alta          |

### B. Historial de cambios

| Versión | Fecha            | Descripción                                      | Autor          |
|---------|------------------|--------------------------------------------------|----------------|
| 1.0     | Septiembre 2026  | Primera versión completa construida colaborativamente | Equipo MK Service |

---

**Fin del documento SRS v1.0**

> Este documento ha sido construido de forma iterativa y colaborativa.  
> Cualquier cambio posterior debe versionarse y comunicarse al equipo.
