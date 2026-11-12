import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Política de cookies · MK Service",
};

export default function CookiesPage() {
  return (
    <LegalShell title="Información sobre cookies y almacenamiento local" code="LEGAL · COOKIES">
      <p>
        MK Service prioriza un MVP técnico. Esta página explica qué se guarda en el navegador; no usamos redes
        publicitarias de terceros en el núcleo del producto.
      </p>

      <h2>1. ¿Usamos cookies HTTP de seguimiento?</h2>
      <p>
        En la versión actual de la aplicación web, la sesión se gestiona principalmente con{" "}
        <strong className="text-fg">tokens JWT en el almacenamiento local del navegador</strong>{" "}
        (<span className="font-mono text-xs">(localStorage)</span>, no con cookies de sesión HttpOnly. Eso
        significa que no dependemos de cookies de autenticación clásicas, pero el token es accesible a scripts
        de la misma origen (riesgo XSS mitigado con buenas prácticas de front).
      </p>

      <h2>2. Qué se guarda en el dispositivo</h2>
      <ul>
        <li>
          <strong className="text-fg">Access token y refresh token</strong> — necesarios para llamar a la API
          mientras mantiene la sesión.
        </li>
        <li>
          Preferencias mínimas de interfaz si se añaden en el futuro (se listarán aquí).
        </li>
      </ul>

      <h2>3. Cómo borrarlos</h2>
      <p>
        Puede cerrar sesión desde la aplicación (elimina los tokens) o borrar los datos del sitio en la
        configuración de su navegador.
      </p>

      <h2>4. Proveedores</h2>
      <p>
        El hosting del front o herramientas de despliegue podrían establecer cookies técnicas propias de su
        infraestructura; revise también las políticas de esos proveedores (Vercel).
      </p>

      <h2>5. Evolución</h2>
      <p>
        Una mejora de seguridad prevista es migrar el refresh token a cookie HttpOnly + Secure + SameSite. Si
        se implementa, esta página se actualizará.
      </p>
    </LegalShell>
  );
}
