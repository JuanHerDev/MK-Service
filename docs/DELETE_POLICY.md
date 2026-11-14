# Política de eliminación y retención — MK Service

Documento operativo alineado a buenas prácticas de seguridad y al marco colombiano de protección de datos (Ley 1581 de 2012, Decreto 1377 de 2013 y lineamientos de la SIC). No sustituye asesoría legal formal.

## Principio general

**Preferir desactivación (borrado lógico) sobre borrado físico.**

Analogía: no se tira el expediente a la trituradora el mismo día; se archiva con sello “inactivo” para poder responder auditorías, incidentes y requerimientos de autoridad.

## Estado actual en el producto

| Recurso | Qué hace el sistema hoy | Tipo |
|---------|-------------------------|------|
| Miembros de organización | `is_active = false` (no se borra el usuario) | Lógico |
| Owner fundador | No se puede desactivar ni quitar el rol owner | Protección de integridad |
| API Keys | Revocación: `is_active = false` (el secreto deja de autenticar) | Lógico |
| Targets (sistemas auditados) | `DELETE` → `is_active = false` | Lógico |
| Documentos de ataque (payloads) | `DELETE` → `is_active = false` | Lógico |
| Invitaciones | Revocación con `revoked_at` / `is_active = false` | Lógico |
| Campañas, hallazgos, reportes | No hay borrado de usuario en UI; permanecen para historial y re-auditoría | Retención operativa |
| Eventos de auditoría (logs) | Solo inserción; no hay API de borrado | Inmutabilidad de evidencia |
| Archivos en R2/S3 (PDF, payloads) | Siguen en storage aunque el registro se desactive (hasta política de purga) | Storage |

No existe hoy un “hard delete” masivo desde la aplicación para datos de negocio. Eso es intencional en MVP.

## Por qué no borrar en caliente

1. **Trazabilidad de seguridad** — Una auditoría de prompt injection o fuga de datos debe poder reconstruirse meses después.
2. **Re-auditoría** — Comparar campaña padre vs re-run exige conservar hallazgos e informes.
3. **Rendición de cuentas** — Quién cambió un rol o revocó una clave queda en `audit_events`.
4. **Habeas data / Ley 1581** — El derecho de supresión no siempre implica destrucción inmediata de logs de seguridad; puede aplicarse **anonimización** o bloqueo de tratamiento cuando hay obligación de conservación.

## Derechos del titular (Colombia)

Cuando un usuario o cliente solicite eliminación de **datos personales**:

1. Registrar la solicitud (fecha, canal, identidad verificada).
2. Desactivar cuenta y membresías (`is_active = false`).
3. Dejar de usar el dato para fines comerciales o de producto.
4. Conservar solo lo necesario para: defensa de reclamos, seguridad, obligaciones legales o contractuales.
5. Responder dentro de los plazos legales aplicables y documentar la decisión.

Datos típicamente personales en MK Service: correo, nombre, hashes de credenciales, IPs en logs si se registran, tokens de invitación ligados a email.

Datos de negocio del cliente auditado (endpoints de su RAG, hallazgos técnicos) son responsabilidad del cliente como responsable/encargado según el contrato; MK actúa como encargado del tratamiento en la medida del SaaS.

## Retención recomendada (política de producto)

| Categoría | Retención sugerida MVP | Acción al vencer |
|-----------|------------------------|------------------|
| Cuentas desactivadas | 12 meses | Anonimizar email/nombre o hard delete si no hay litigio |
| API Keys revocadas | 12 meses (solo metadatos) | Purga de filas inactivas |
| Campañas e informes | Mientras la organización esté activa + 24 meses | Export al cliente y luego archivo frío / borrado |
| Logs de auditoría | 24 meses mínimo | Archivo inmutable; no edición |
| Payloads de organización | Mientras la org esté activa | Borrado lógico + objeto storage |

Los plazos exactos deben fijarse en el contrato y en la Política de Privacidad publicada.

## Buenas prácticas técnicas (checklist)

- [x] Borrado lógico con `is_active` / `revoked_at`
- [x] Audit log append-only
- [x] Owner fundador protegido
- [x] Confirmación sensible (contraseña) para privilegios owner
- [ ] Job de purga programada (futuro)
- [ ] Endpoint de “exportar mis datos” (futuro, portabilidad)
- [ ] Anonimización automática post-retención (futuro)
- [ ] Hard delete de objetos R2 huérfanos (futuro)

## Qué no hacer

- No borrar hallazgos para “limpiar” un informe fallido: genera historial falso.
- No reutilizar el mismo `api_key` id tras revocar: siempre nuevo secreto.
- No permitir que un owner hijo desactive al fundador.
- No devolver en API datos de miembros `is_active = false` en listados operativos salvo vista de administración explícita.

## Resumen para el equipo

Hoy MK Service **archiva y desactiva**; no destruye evidencia de auditoría. Eso es coherente con un producto de seguridad y con un enfoque prudente frente a la Ley 1581: el derecho de supresión se atiende desactivando el tratamiento de datos personales y planificando purga/anonimización, sin borrar de un golpe la cadena de custodia de las auditorías.
