"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock } from "@/components/clock";
import { ParticleField } from "@/components/particle-field";
import { ScrambleText } from "@/components/scramble-text";
import { ErrorLine } from "@/components/ui";
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
    "w-full border border-line bg-ink px-3 py-2.5 text-sm outline-none transition focus:border-accent";

  return (
    <main className="bg-grid relative grid min-h-screen overflow-hidden lg:grid-cols-[1fr_1.2fr]">
      <div className="overlay-vignette absolute inset-0" />

      {/* Left: form (mirror of login) */}
      <section className="relative flex items-center justify-center border-r border-line px-4 py-16 sm:px-10">
        <div className="w-full max-w-sm animate-fade-up">
          <p className="label mb-3">
            <span className="text-accent">[ 01 ]</span> Alta de organización
          </p>
          <h2 className="mb-2 text-4xl font-medium tracking-[-0.04em]">
            <ScrambleText text="Crear cuenta" />
          </h2>
          <p className="mb-10 text-sm text-muted">
            Registra tu organización. Quedarás como <span className="text-fg">Owner</span>.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
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
                Correo
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
                  className={inputClass + " pr-10"}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-fg"
                  aria-label={show ? "Ocultar" : "Mostrar"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <ErrorLine message={error} />
            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-between bg-accent px-5 text-sm font-medium text-void transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Creando…" : "Crear organización"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-accent underline">
              Iniciar sesión
            </Link>
          </p>
          <p className="mt-6 text-center text-[11px] leading-relaxed text-dim">
            Al crear la cuenta aceptas los{" "}
            <Link href="/terms" className="text-muted underline hover:text-accent">
              Términos
            </Link>
            , la{" "}
            <Link href="/privacy" className="text-muted underline hover:text-accent">
              Privacidad
            </Link>{" "}
            y el aviso de{" "}
            <Link href="/cookies" className="text-muted underline hover:text-accent">
              Cookies
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Right: animation */}
      <section className="relative hidden flex-col justify-between p-10 lg:flex">
        <header className="flex items-start justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <div>
            <p className="text-fg">MK Service</p>
            <p>Onboarding seguro</p>
          </div>
          <div className="text-right">
            <Clock />
          </div>
        </header>

        <ParticleField
          className="absolute inset-0 m-auto size-full max-h-[760px]"
          accent="45, 212, 191"
          density={700}
        />

        <div className="relative">
          <p className="label mb-6">
            <span className="text-accent">●</span> Transparencia · Control · Evidencia
          </p>
          <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.92] font-medium tracking-[-0.04em]">
            Empieza a
            <br />
            <span className="text-accent">auditar</span>
            <br />
            tu RAG
          </h1>
          <p className="mt-6 max-w-md text-sm text-muted">
            Campañas controladas, hallazgos priorizados e informes listos para dirección y equipo técnico.
          </p>
        </div>
      </section>
    </main>
  );
}
