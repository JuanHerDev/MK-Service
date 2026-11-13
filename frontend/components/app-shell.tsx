"use client";

import {
  Crosshair,
  FileText,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu,
  Radar,
  Shield,
  ShieldAlert,
  Syringe,
  Users,
  ScrollText,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock } from "@/components/clock";
import { ScrambleText } from "@/components/scramble-text";
import { Loader, cx } from "@/components/ui";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Inicio", code: "00", icon: LayoutGrid },
  { href: "/targets", label: "Sistemas", code: "01", icon: Crosshair },
  { href: "/campaigns", label: "Auditorías", code: "02", icon: Radar },
  { href: "/findings", label: "Problemas", code: "03", icon: ShieldAlert },
  { href: "/documents", label: "Pruebas", code: "04", icon: Syringe },
  { href: "/reports", label: "Informes", code: "05", icon: FileText },
  { href: "/api-keys", label: "Claves", code: "06", icon: KeyRound },
  { href: "/members", label: "Equipo", code: "07", icon: Users },
  { href: "/logs", label: "Actividad", code: "08", icon: ScrollText },
  { href: "/admin", label: "Administración", code: "09", icon: Shield, adminOnly: true },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile nav on route change
    setOpen(false);
  }, [pathname]);

  if (status !== "authenticated" || !user) {
    // Children still render (hidden) so the route keeps a static shell for instant navigation.
    return (
      <>
        <main className="grid min-h-screen place-items-center">
          <Loader label="Verificando credenciales" />
        </main>
        <div hidden>{children}</div>
      </>
    );
  }

  const initials = (user.full_name || user.email)
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-5">
        <Link href="/dashboard" className="block">
          <p className="font-mono text-[13px] tracking-[0.22em] text-fg uppercase">
            <ScrambleText text="MK Service" hover />
          </p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-dim uppercase">Control v0.1</p>
        </Link>
        <button className="text-muted lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 space-y-px overflow-y-auto px-3 py-5">
        <p className="label px-2 pb-3">Módulos</p>
        {(user.is_platform_admin ? NAV : NAV.filter((i) => !("adminOnly" in i && i.adminOnly))).map(({ href, label, code, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                "group relative flex items-center gap-3 px-3 py-2.5 text-sm transition",
                active ? "bg-white/[0.04] text-fg" : "text-muted hover:bg-white/[0.02] hover:text-fg",
              )}
            >
              <span
                className={cx(
                  "absolute top-1/2 left-0 h-5 w-px -translate-y-1/2 transition",
                  active ? "bg-accent shadow-[0_0_10px_var(--color-accent)]" : "bg-transparent",
                )}
              />
              <span className={cx("font-mono text-[10px]", active ? "text-accent" : "text-dim")}>{code}</span>
              <Icon className="size-4 opacity-70" />
              <ScrambleText text={label} hover duration={400} />
            </Link>
          );
        })}
      </div>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3">
          <div className="hud grid size-10 shrink-0 place-items-center border border-line-strong font-mono text-xs text-accent">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{user.full_name || user.email.split("@")[0]}</p>
            <p className="truncate font-mono text-[10px] tracking-[0.1em] text-dim uppercase">
              {user.is_platform_admin ? "Admin de plataforma" : user.membership?.role_name ?? "—"}
            </p>
          </div>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="grid size-9 place-items-center border border-line text-muted transition hover:border-critical hover:text-critical"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  const current = NAV.find((n) => pathname.startsWith(n.href));

  return (
    <div className="bg-grid relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(212_255_63/0.06),transparent_50%)]" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-void/80 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-void/80 backdrop-blur" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-up border-r border-line bg-ink">{sidebar}</aside>
        </div>
      )}

      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-line bg-void/70 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-4">
            <button className="text-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
              <Menu className="size-5" />
            </button>
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
              <span className="text-dim">{user.organization?.name ?? "Plataforma"}</span>
              <span className="mx-2 text-dim">/</span>
              <span className="text-fg">{current?.label ?? ""}</span>
            </p>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
            <span className="hidden items-center gap-2 sm:flex">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-ok" />
              Online
            </span>
            <Clock className="hidden tabular-nums md:block" />
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
