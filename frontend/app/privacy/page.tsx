import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Política de privacidad · MK Service",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Política de privacidad" code="LEGAL · PRIVACIDAD">
      <p>
        MK Service (“la Plataforma”) es un servicio de auditoría de sistemas de IA con recuperación aumentada
        (RAG). Esta política describe de forma resumida cómo tratamos datos personales en el contexto del MVP
        académico y comercial temprano, en línea con principios de la Ley 1581 de 2012 (Colombia) y buenas
        prácticas de minimización.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento es el equipo operador de MK Service (contacto del despliegue en uso).
        Para el entorno de demostración académica, el tratamiento se limita a cuentas creadas voluntariamente
        para pruebas.
      </p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li>Cuenta: correo electrónico, nombre, hash de contraseña (nunca la contraseña en claro).</li>
        <li>Organización: nombre de la organización y membresías/roles.</li>
        <li>Uso del producto: targets (URL de endpoints), campañas, hallazgos, reportes generados, documentos de ataque que usted sube.</li>
        <li>Técnicos: registros de auditoría de acciones, direcciones IP en limitación de tasa y logs de servidor.</li>
      </ul>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Prestar el servicio de auditoría y generar informes.</li>
        <li>Autenticación, control de acceso multi-tenant y seguridad.</li>
        <li>Mejora operativa del MVP (diagnóstico de errores, prevención de abuso).</li>
      </ul>

      <h2>4. Base y conservación</h2>
      <p>
        El tratamiento se basa en la ejecución del servicio solicitado al registrarse y en el interés legítimo
        de proteger la Plataforma. Los datos se conservan mientras la cuenta esté activa y el tiempo necesario
        para obligaciones técnicas o de seguridad; puede solicitar eliminación de cuenta contactando al operador.
      </p>

      <h2>5. Encargados y almacenamiento</h2>
      <p>
        La infraestructura puede incluir proveedores de hosting (por ejemplo renderizado de API, front estático,
        base de datos gestionada y almacenamiento de objetos). Los archivos de reportes y payloads se almacenan
        en el backend de objetos configurado (p. ej. R2) bajo control del operador.
      </p>

      <h2>6. Derechos</h2>
      <p>
        Puede solicitar acceso, actualización o eliminación de sus datos de cuenta escribiendo al correo de
        contacto del proyecto. Responderemos en un plazo razonable según el entorno (académico o productivo).
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas como hash de contraseñas (bcrypt), tokens de sesión, control por roles, HTTPS en
        producción y aislamiento lógico por organización. Ningún sistema es 100 % invulnerable; reporte
        incidentes al operador de inmediato.
      </p>
    </LegalShell>
  );
}
