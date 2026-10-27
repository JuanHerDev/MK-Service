"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Clock } from "@/components/clock";
import { ErrorLine, Loader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Preview = {
  email_locked: string | null;
  role_code: string | null;
  role_name: string | null;
  organization_name: string | null;
  expires_at: string | null;
  token_prefix: string;
};

function AcceptInviteForm() {
  const search = useSearchParams();
  const token = useMemo(() => search.get("token")?.trim() ?? "", [search]);
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (!token) {
    return (
      <Shell>
        <ErrorLine message="El enlace no incluye invitación. Pide uno nuevo al Owner." />
        <Link href="/login" className="mt-4 inline-block font-mono text-xs text-accent underline">
          Ir al login
        </Link>
      </Shell>
    );
  }

  // key=token remounts state when the invite changes (no sync reset in effects)
  return <AcceptInviteWithToken key={token} token={token} />;
}

function AcceptInviteWithToken({ token }: { token: string }) {
  const router = useRouter();
  const { login } = useAuth();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const p = await api<Preview>("/invitations/preview", {
          query: { token },
          auth: false,
        });
        if (cancelled) return;
        setPreview(p);
        if (p.email_locked) setEmail(p.email_locked);
      } catch (e) {
        if (!cancelled) setFetchError((e as Error).message);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/invitations/accept-new", {
        method: "POST",
        auth: false,
        body: {
          token,
          email: email.trim(),
          password,
          full_name: fullName.trim() || null,
        },
      });
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar el registro");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <Shell>
        <Loader />
      </Shell>
    );
  }

  if (fetchError) {
    return (
      <Shell>
        <ErrorLine message={fetchError} />
        <Link href="/login" className="mt-4 inline-block font-mono text-xs text-accent underline">
          Ir al login
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="border border-line bg-panel/50 px-4 py-3 font-mono text-[11px] text-muted">
          <p>
            Organización: <span className="text-fg">{preview?.organization_name ?? "—"}</span>
          </p>
          <p className="mt-1">
            Rol: <span className="text-accent">{preview?.role_code ?? "—"}</span>
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Email</span>
          <input
            required
            type="email"
            value={email}
            disabled={!!preview?.email_locked}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-60"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Nombre</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border border-line bg-black/30 px-3 py-2.5 text-sm outline-none focus:border-accent"
            placeholder="Opcional"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Contraseña</span>
          <div className="relative">
            <input
              required
              minLength={8}
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line bg-black/30 px-3 py-2.5 pr-10 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted"
              onClick={() => setShow((s) => !s)}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <ErrorLine message={error} />

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 bg-accent px-4 py-3 font-mono text-xs tracking-[0.14em] text-ink uppercase disabled:opacity-50"
        >
          {busy ? "Creando cuenta…" : "Aceptar e ingresar"}
          <ArrowRight className="size-4" />
        </button>

        <p className="text-center font-mono text-[11px] text-muted">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-accent underline">
            Login
          </Link>
        </p>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-grid relative flex min-h-screen items-center justify-center p-6">
      <div className="overlay-vignette absolute inset-0" />
      <div className="relative w-full max-w-md border border-line bg-ink/90 p-8 backdrop-blur-sm">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-accent uppercase">Invitación</p>
            <h1 className="mt-2 text-2xl tracking-tight">Unirte a la organización</h1>
          </div>
          <Clock className="font-mono text-[10px] text-muted" />
        </header>
        {children}
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center">
          <Loader />
        </main>
      }
    >
      <AcceptInviteForm />
    </Suspense>
  );
}
