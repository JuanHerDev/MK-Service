import Link from "next/link";

export function LegalShell({
  title,
  code,
  children,
}: {
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-void px-6 py-12 text-fg">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-line pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{code}</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">MK Service · Última actualización: noviembre 2026</p>
        </header>
        <article className="space-y-6 text-sm leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-fg [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </article>
        <footer className="mt-12 flex flex-wrap gap-4 border-t border-line pt-6 text-xs text-muted">
          <Link href="/login" className="text-accent hover:underline">
            Iniciar sesión
          </Link>
          <Link href="/privacy" className="hover:text-fg">
            Privacidad
          </Link>
          <Link href="/terms" className="hover:text-fg">
            Términos
          </Link>
          <Link href="/cookies" className="hover:text-fg">
            Cookies
          </Link>
        </footer>
      </div>
    </main>
  );
}
