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

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setBurst((n) => n + 1);
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-grid relative grid min-h-screen overflow-hidden lg:grid-cols-[1.2fr_1fr]">
      <div className="overlay-vignette absolute inset-0" />

      <section className="relative hidden flex-col justify-between border-r border-line p-10 lg:flex">
        <header className="flex items-start justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <div>
            <p className="text-fg">MK Service</p>
            <p>Auditoría de seguridad en RAG / LLM</p>
          </div>
          <div className="text-right">
            <Clock />
            <p>Lat 04.71° N · Lon 74.07° W</p>
          </div>
        </header>

        <ParticleField className="absolute inset-0 m-auto size-full max-h-[760px]" burstToken={burst} />

        <div className="relative">
          <p className="label mb-6">
            <span className="text-accent">●</span> Validación adversarial para sistemas de IA
          </p>
          <h1 className="text-[clamp(3.5rem,7vw,7.5rem)] leading-[0.88] font-medium tracking-[-0.06em]">
            <ScrambleText text="Audita." duration={700} />
            <br />
            <ScrambleText text="Detecta." duration={900} />
            <br />
            <span className="text-accent">
              <ScrambleText text="Fortalece." duration={1100} />
            </span>
          </h1>
          <div className="mt-10 grid grid-cols-3 gap-4 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
            <div>
              <p className="text-fg">01</p>Prompt Injection
            </div>
            <div>
              <p className="text-fg">02</p>PI indirecta
            </div>
            <div>
              <p className="text-fg">03</p>Fuga de datos
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center px-4 py-16 sm:px-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-10 lg:hidden">
            <p className="font-mono text-[11px] tracking-[0.18em] text-fg uppercase">MK Service</p>
          </div>

          <p className="label mb-3">
            <span className="text-accent">[ 00 ]</span> Acceso restringido
          </p>
          <h2 className="mb-2 text-4xl font-medium tracking-[-0.04em]">
            <ScrambleText text="Iniciar sesión" />
          </h2>
          <p className="mb-10 text-sm text-muted">Identifícate con tu cuenta de la organización.</p>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="group">
              <label htmlFor="email" className="label mb-2 block">
                Correo
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-line bg-ink px-3 py-2.5 text-sm outline-none transition focus:border-accent"
              />
            </div>
            <div className="group">
              <label htmlFor="password" className="label mb-2 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line bg-ink px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-accent"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted hover:text-fg"
                  onClick={() => setShow((s) => !s)}
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
              className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-3 text-sm font-medium text-void transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Verificando…" : "Entrar"}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            ¿Sin cuenta?{" "}
            <Link href="/register" className="text-accent underline">
              Registrarse
            </Link>
          </p>
          <p className="mt-6 text-center text-[11px] leading-relaxed text-dim">
            Al continuar aceptas los{" "}
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
    </main>
  );
}
