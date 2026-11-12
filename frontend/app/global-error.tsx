"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#0a0e14", color: "#e8eef7", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#e85d5d" }}>Error crítico</p>
          <h1 style={{ fontSize: 28, fontWeight: 500, marginTop: 12 }}>No se pudo cargar la aplicación</h1>
          <p style={{ maxWidth: 420, marginTop: 12, fontSize: 14, color: "#8b9bb4" }}>
            Recarga la página. Si el problema continúa, contacta al operador de MK Service.
          </p>
          {error?.digest && (
            <p style={{ marginTop: 8, fontSize: 10, fontFamily: "monospace", color: "#5a6a80" }}>Ref: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 28, padding: "10px 20px", background: "#3d8bfd", color: "#0a0e14", border: "none", fontWeight: 600, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
