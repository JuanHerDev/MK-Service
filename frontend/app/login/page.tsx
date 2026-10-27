"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
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
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-grid relative grid min-h-screen overflow-hidden lg:grid-cols-[1.2fr_1fr]">
      <div className="overlay-vignette absolute inset-0" />

      {/* Left: hero */}
      <section className="relative hidden flex-col justify-between border-r border-line p-10 lg:flex">
        <header className="flex items-start justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <div>
            <p className="text-fg">MK Service</p>
            <p>Adversarial Validation Interface</p>
          </div>
          <div className="text-right">
            <Clock />
            <p>Lat 04.71° N · Lon 74.07° W</p>
          </div>
        </header>

        <ParticleField className="absolute inset-0 m-auto size-full max-h-[760px]" />

        <div className="relative">
          <p className="label mb-6">
            <span className="text-accent">●</span> Red-team para sistemas RAG / LLM
          </p>
          <h1 className="text-[clamp(3.5rem,7vw,7.5rem)] leading-[0.88] font-medium tracking-[-0.06em]">
            <ScrambleText text="Probe." duration={700} />
            <br />
            <ScrambleText text="Detect." duration={900} delay={150} className="text-muted" />
            <br />
            <ScrambleText text="Harden." duration={1100} delay={300} className="text-accent text-glow" />
          </h1>
          <div className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-line pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <div>
              <p className="text-fg">01</p>Prompt Injection
            </div>
            <div>
              <p className="text-fg">02</p>Indirect PI
            </div>
            <div>
              <p className="text-fg">03</p>Data Leakage
            </div>
          </div>
        </div>
      </section>

      {/* Right: form */}
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
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operador@empresa.com"
                className="w-full border-0 border-b border-line-strong bg-transparent pb-3 text-lg outline-none transition placeholder:text-dim focus:border-accent"
              />
            </div>
            <div>
              <label htmlFor="password" className="label mb-2 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border-0 border-b border-line-strong bg-transparent pr-10 pb-3 text-lg outline-none transition placeholder:text-dim focus:border-accent"
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
              {busy ? "Autenticando…" : "Entrar al sistema"}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted">
            ¿Primera vez en MK Service?{" "}
            <a href="/register" className="font-medium text-accent transition hover:underline">
              Crear organización
            </a>
          </p>

          <div className="mt-12 border-t border-line pt-4 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
            <span className="flex items-center gap-2">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-ok" /> Sesión segura
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
