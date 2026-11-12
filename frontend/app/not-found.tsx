import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">Error 404</p>
      <h1 className="mt-3 text-3xl font-medium text-fg">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        La ruta no existe o ya no está disponible. Comprueba la URL o vuelve al panel.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="bg-accent px-5 py-2.5 text-sm font-medium text-void transition hover:opacity-90"
        >
          Ir al dashboard
        </Link>
        <Link
          href="/login"
          className="border border-line px-5 py-2.5 text-sm text-fg transition hover:border-accent"
        >
          Iniciar sesión
        </Link>
      </div>
    </main>
  );
}
