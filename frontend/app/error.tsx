"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-critical">Error 500</p>
      <h1 className="mt-3 text-3xl font-medium text-fg">Algo salió mal</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Se produjo un error inesperado en la interfaz. Puedes reintentar o volver al inicio de sesión.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[10px] text-dim">Ref: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-accent px-5 py-2.5 text-sm font-medium text-void transition hover:opacity-90"
        >
          Reintentar
        </button>
        <Link
          href="/login"
          className="border border-line px-5 py-2.5 text-sm text-fg transition hover:border-accent"
        >
          Ir al login
        </Link>
      </div>
    </main>
  );
}
