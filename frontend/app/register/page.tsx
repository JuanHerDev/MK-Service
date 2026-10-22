"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorLine } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
        organization_name: orgName.trim(),
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full border-0 border-b border-line-strong bg-transparent pb-3 text-lg outline-none transition placeholder:text-dim focus:border-accent";

  return (
    <main className="bg-grid relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="overlay-vignette absolute inset-0" />
      <div className="relative w-full max-w-md animate-fade-up">
        <p className="font-mono text-[11px] tracking-[0.18em] text-fg uppercase">MK Service</p>
        <p className="label mt-6 mb-3">
          <span className="text-accent">[ 01 ]</span> Alta de organización
        </p>
        <h1 className="mb-2 text-4xl font-medium tracking-[-0.04em]">Crear cuenta</h1>
        <p className="mb-10 text-sm text-muted">
          Registra tu organización. Quedarás como <span className="text-fg">Owner</span>.
        </p>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="org" className="label mb-2 block">
              Organización
            </label>
            <input
              id="org"
              required
              minLength={2}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Seguridad SAS"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="name" className="label mb-2 block">
              Nombre completo
            </label>
            <input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ana Pérez"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className="label mb-2 block">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@empresa.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="password" className="label mb-2 block">
              Contraseña (mín. 8)
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass + " pr-10"}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-1 right-0 text-muted hover:text-accent"
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <ErrorLine message={error} />

          <button
            type="submit"
            disabled={busy}
            className="group flex h-14 w-full items-center justify-between bg-accent px-5 font-mono text-xs tracking-[0.2em] text-void uppercase transition hover:shadow-[0_0_40px_rgb(212_255_63/0.4)] disabled:opacity-60"
          >
            {busy ? "Creando…" : "Crear organización"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent transition hover:underline">
            Iniciar sesión
          </Link>
        </p>

        <div className="mt-10 flex items-center justify-between border-t border-line pt-4 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
          <span className="flex items-center gap-2">
            <span className="size-1.5 animate-pulse-dot rounded-full bg-ok" /> JWT · bcrypt
          </span>
          <span className="truncate pl-4">{API_URL.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
    </main>
  );
}
