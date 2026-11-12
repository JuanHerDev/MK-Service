import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Términos y condiciones · MK Service",
};

export default function TermsPage() {
  return (
    <LegalShell title="Términos y condiciones de uso" code="LEGAL · TÉRMINOS">
      <p>
        Al crear una cuenta o usar MK Service acepta estos términos. Si no está de acuerdo, no utilice la
        Plataforma.
      </p>

      <h2>1. Descripción del servicio</h2>
      <p>
        MK Service permite configurar objetivos (targets) de sistemas tipo chat/RAG, lanzar campañas de prueba
        con documentos de ataque controlados y obtener hallazgos e informes orientados a Prompt Injection y
        fuga de datos. Es una herramienta de auditoría ofensiva controlada por el cliente sobre sistemas que
        tiene derecho a probar.
      </p>

      <h2>2. Uso permitido</h2>
      <ul>
        <li>Solo sistemas de los que sea propietario o tenga autorización explícita por escrito.</li>
        <li>No utilice la Plataforma para atacar terceros, interrumpir servicios ajenos o extraer datos ilegítimamente.</li>
        <li>Respete las cuotas, el rate limiting y las políticas del proveedor de infraestructura.</li>
      </ul>

      <h2>3. Cuentas y organizaciones</h2>
      <p>
        Usted es responsable de la confidencialidad de sus credenciales y de las acciones realizadas bajo su
        organización. El administrador de plataforma puede desactivar cuentas por abuso o riesgo de seguridad.
      </p>

      <h2>4. Contenido y resultados</h2>
      <p>
        Los hallazgos e informes son resultados automáticos basados en pruebas y heurísticas; no constituyen
        dictamen legal ni garantía de ausencia de vulnerabilidades. Valide siempre con su equipo técnico.
      </p>

      <h2>5. Disponibilidad</h2>
      <p>
        El MVP puede ejecutarse en planes gratuitos o de bajo costo con reinicios, latencia o pérdida de
        archivos si no se configura almacenamiento durable. No se garantiza SLA comercial en entornos de
        demostración académica.
      </p>

      <h2>6. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley aplicable, los operadores de MK Service no responden por
        daños indirectos, pérdida de beneficios o uso indebido de la herramienta por parte del usuario.
      </p>

      <h2>7. Cambios</h2>
      <p>
        Podemos actualizar estos términos; la fecha de actualización se indica en la cabecera. El uso
        continuado implica aceptación de la versión vigente.
      </p>
    </LegalShell>
  );
}
