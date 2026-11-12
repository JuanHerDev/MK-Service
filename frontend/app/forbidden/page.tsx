import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-high">Error 403</p>
      <h1 className="mt-3 text-3xl font-medium text-fg">Acceso denegado</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        No tienes permisos para ver este recurso. Si crees que es un error, pide a un Owner o al Admin de
        plataforma que revise tu rol.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard"
          className="bg-accent px-5 py-2.5 text-sm font-medium text-void transition hover:opacity-90"
        >
          Volver al dashboard
        </Link>
        <Link
          href="/login"
          className="border border-line px-5 py-2.5 text-sm text-fg transition hover:border-accent"
        >
          Cambiar de cuenta
        </Link>
      </div>
    </main>
  );
}
