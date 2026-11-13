"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ScrambleText } from "@/components/scramble-text";
import { Badge, ErrorLine, PageHeader, Panel, TableSkeleton, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, fmtRelative, pad } from "@/lib/format";
import type { Campaign, Finding, Paginated, Report, Target } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

const SEVERITIES = ["critical", "high", "medium", "low"] as const;
const SEV_COLOR: Record<string, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};
const SEV_WEIGHT: Record<string, number> = { critical: 10, high: 6, medium: 3, low: 1 };

async function loadAll() {
  // Priority 1: targets + campaigns (panel operativo)
  const [t, c] = await Promise.allSettled([
    api<Paginated<Target>>("/targets", { query: { per_page: 100, active_only: false } }),
    api<Paginated<Campaign>>("/campaigns", { query: { per_page: 100 } }),
  ]);
  // Priority 2: findings + reports (riesgo e informes)
  const [f, r] = await Promise.allSettled([
    api<Paginated<Finding>>("/findings", { query: { per_page: 100 } }),
    api<{ items: Report[]; total: number }>("/reports"),
  ]);
  const firstError = [t, c, f, r].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
  return {
    targets: t.status === "fulfilled" ? t.value : null,
    campaigns: c.status === "fulfilled" ? c.value : null,
    findings: f.status === "fulfilled" ? f.value : null,
    reports: r.status === "fulfilled" ? r.value : null,
    error: firstError ? (firstError.reason as Error).message : null,
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, loading } = useResource(loadAll);

  const stats = useMemo(() => {
    const targets = data?.targets?.items ?? [];
    const campaigns = data?.campaigns?.items ?? [];
    const findings = data?.findings?.items ?? [];
    const openFindings = findings.filter((f) => f.status === "open" || f.status === "in_progress");
    const bySev = Object.fromEntries(SEVERITIES.map((s) => [s, openFindings.filter((f) => f.severity === s).length]));
    const byCat: Record<string, number> = {};
    for (const f of findings) byCat[f.category] = (byCat[f.category] ?? 0) + 1;
    const riskRaw = openFindings.reduce((acc, f) => acc + (SEV_WEIGHT[f.severity] ?? 1), 0);
    const risk = Math.min(100, Math.round(riskRaw * 2.5));

    // activity over the last 14 days (only once data arrives, so prerender never reads the clock)
    const days = Array.from({ length: data ? 14 : 0 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const activity = days.map((d) => {
      const next = d.getTime() + 86400000;
      const inDay = (iso: string) => {
        const t = new Date(iso).getTime();
        return t >= d.getTime() && t < next;
      };
      return {
        day: d,
        campaigns: campaigns.filter((c) => inDay(c.created_at)).length,
        findings: findings.filter((f) => inDay(f.created_at)).length,
      };
    });

    return {
      targets,
      campaigns,
      findings,
      openFindings,
      bySev,
      byCat,
      risk,
      activity,
      activeTargets: targets.filter((t) => t.is_active && t.connection_status === "active").length,
      running: campaigns.filter((c) => c.status === "running" || c.status === "queued").length,
      completed: campaigns.filter((c) => c.status === "completed").length,
    };
  }, [data]);

  const firstName = (user?.full_name || user?.email || "").split(/[\s@]/)[0];

  return (
    <>
      <PageHeader
        index="00"
        subtitle="Centro de operaciones"
        title={`Hola, ${firstName}`}
        actions={
          <Link
            href="/campaigns?new=1"
            className="inline-flex h-10 items-center gap-2 bg-accent px-4 font-mono text-[11px] tracking-[0.14em] text-void uppercase transition hover:shadow-[0_0_24px_rgb(212_255_63/0.45)]"
          >
            Nueva campaña <ArrowUpRight className="size-4" />
          </Link>
        }
      />

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Panel key={i}>
                <TableSkeleton rows={2} cols={1} />
              </Panel>
            ))}
          </div>
          <Panel title="Actividad" code="ACT">
            <TableSkeleton rows={5} cols={3} />
          </Panel>
        </div>
      ) : (
        <div className="space-y-6">
          {data?.error && <ErrorLine message={data.error} />}

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
            <Kpi
              label="Targets conectados"
              value={stats.activeTargets}
              sub={`de ${stats.targets.length} registrados`}
              index={1}
            />
            <Kpi
              label="Campañas"
              value={stats.campaigns.length}
              sub={`${stats.running} en cola / ejecución`}
              index={2}
            />
            <Kpi
              label="Hallazgos abiertos"
              value={stats.openFindings.length}
              sub={`${stats.findings.length} totales`}
              index={3}
              tone={stats.openFindings.length ? "text-high" : undefined}
            />
            <Kpi
              label="Críticos"
              value={stats.bySev.critical ?? 0}
              sub="requieren acción inmediata"
              index={4}
              tone={(stats.bySev.critical ?? 0) > 0 ? "text-critical" : undefined}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
            {/* Risk gauge */}
            <Panel title="Índice de riesgo" code="R-01">
              <RiskGauge value={stats.risk} />
              <div className="mt-6 space-y-3">
                {SEVERITIES.map((s) => {
                  const count = stats.bySev[s] ?? 0;
                  const max = Math.max(1, ...Object.values(stats.bySev));
                  return (
                    <div key={s} className="grid grid-cols-[80px_1fr_32px] items-center gap-3">
                      <span className="label">{s}</span>
                      <div className="h-1.5 bg-white/[0.04]">
                        <div
                          className={cx("h-full transition-all duration-1000", SEV_COLOR[s])}
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-right font-mono text-xs tabular-nums">{pad(count)}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Activity chart */}
            <Panel
              title="Actividad · 14 días"
              code="A-02"
              actions={
                <div className="flex gap-4 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 bg-fg/70" /> Campañas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 bg-accent" /> Hallazgos
                  </span>
                </div>
              }
            >
              <ActivityChart data={stats.activity} />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.9fr_1.1fr]">
            <Panel title="Campañas recientes" code="C-03" bodyClassName="p-0" actions={<PanelLink href="/campaigns" />}>
              {stats.campaigns.length === 0 ? (
                <p className="p-6 text-sm text-muted">Aún no hay campañas. Crea un target y lanza la primera.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {stats.campaigns.slice(0, 6).map((c) => (
                    <li
                      key={c.campaign_id}
                      className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[40px_1fr_140px_auto]"
                    >
                      <span className="hidden font-mono text-[11px] text-dim sm:block">#{pad(c.campaign_id, 3)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm">{c.name}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-dim uppercase">
                          {[c.scope_prompt_injection && "PI", c.scope_data_leakage && "DL"].filter(Boolean).join(" + ")}{" "}
                          · {fmtRelative(c.created_at)}
                        </p>
                      </div>
                      <div className="hidden h-1 bg-white/[0.05] sm:block">
                        <div className="h-full bg-accent" style={{ width: `${c.progress_percent}%` }} />
                      </div>
                      <Badge value={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Vectores de ataque" code="V-04">
              {Object.keys(stats.byCat).length === 0 ? (
                <p className="text-sm text-muted">Sin hallazgos registrados todavía.</p>
              ) : (
                <div className="space-y-5">
                  {Object.entries(stats.byCat).map(([cat, n]) => (
                    <div key={cat}>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="text-sm">{CATEGORY_LABEL[cat] ?? cat}</span>
                        <span className="font-mono text-2xl tracking-tight tabular-nums">{pad(n)}</span>
                      </div>
                      <div className="flex h-1 gap-px">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <span
                            key={i}
                            className={cx(
                              "flex-1",
                              i < Math.round((n / stats.findings.length) * 24) ? "bg-accent" : "bg-white/[0.06]",
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel
            title="Hallazgos prioritarios"
            code="F-05"
            bodyClassName="p-0"
            actions={<PanelLink href="/findings" />}
          >
            {stats.openFindings.length === 0 ? (
              <p className="p-6 text-sm text-muted">Sin hallazgos abiertos. Superficie limpia.</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...stats.openFindings]
                  .sort((a, b) => (SEV_WEIGHT[b.severity] ?? 0) - (SEV_WEIGHT[a.severity] ?? 0))
                  .slice(0, 5)
                  .map((f) => (
                    <li key={f.finding_id}>
                      <Link
                        href={`/findings?id=${f.finding_id}`}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 transition hover:bg-white/[0.02]"
                      >
                        <Badge value={f.severity} />
                        <div className="min-w-0">
                          <p className="truncate text-sm">{f.title}</p>
                          <p className="font-mono text-[10px] tracking-[0.1em] text-dim uppercase">
                            {CATEGORY_LABEL[f.category] ?? f.category} · campaña #{f.campaign_id}
                            {f.canary_found && <span className="ml-2 text-critical">· canary detectado</span>}
                          </p>
                        </div>
                        <ArrowUpRight className="size-4 text-dim" />
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

function PanelLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] text-muted uppercase transition hover:text-accent"
    >
      Ver todo <ArrowUpRight className="size-3" />
    </Link>
  );
}

function Kpi({
  label,
  value,
  sub,
  index,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  index: number;
  tone?: string;
}) {
  return (
    <div className="group relative bg-ink p-5 sm:p-6">
      <div className="animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
        <div className="flex items-start justify-between">
          <p className="label">{label}</p>
          <span className="hidden font-mono text-[10px] text-dim sm:inline">K-{pad(index)}</span>
        </div>
        <p className={cx("mt-6 font-mono text-5xl font-light tracking-[-0.06em] tabular-nums sm:text-6xl", tone)}>
          <ScrambleText text={pad(value)} duration={700} delay={index * 100} />
        </p>
        <p className="mt-2 text-xs text-muted">{sub}</p>
      </div>
      <span className="absolute bottom-0 left-0 h-px w-0 bg-accent transition-all duration-500 group-hover:w-full" />
    </div>
  );
}

function RiskGauge({ value }: { value: number }) {
  const segments = 40;
  const lit = Math.round((value / 100) * segments);
  const level = value >= 70 ? "Crítico" : value >= 40 ? "Elevado" : value > 0 ? "Moderado" : "Nominal";
  const color = value >= 70 ? "var(--color-critical)" : value >= 40 ? "var(--color-high)" : "var(--color-accent)";
  return (
    <div className="relative mx-auto aspect-[2/1.15] w-full max-w-xs">
      <svg viewBox="0 0 200 115" className="w-full">
        {Array.from({ length: segments }).map((_, i) => {
          const a = Math.PI + (i / (segments - 1)) * Math.PI;
          const r1 = 80;
          const r2 = i % 5 === 0 ? 92 : 88;
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * r1}
              y1={100 + Math.sin(a) * r1}
              x2={100 + Math.cos(a) * r2}
              y2={100 + Math.sin(a) * r2}
              stroke={i < lit ? color : "rgb(255 255 255 / 0.1)"}
              strokeWidth={2}
              style={{ transition: `stroke 0.4s ${i * 20}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-2 text-center">
        <p className="font-mono text-5xl font-light tracking-[-0.06em] tabular-nums" style={{ color }}>
          {pad(value)}
        </p>
        <p className="label mt-1">{level}</p>
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: { day: Date; campaigns: number; findings: number }[] }) {
  const peak = Math.max(...data.map((d) => Math.max(d.campaigns, d.findings)));
  const max = Math.max(4, Math.ceil(peak / 4) * 4);
  const H = 180;
  return (
    <div>
      <div className="relative" style={{ height: H }}>
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <div
            key={g}
            className="absolute inset-x-0 border-t border-dashed border-line"
            style={{ bottom: `${g * 100}%` }}
          >
            <span className="absolute -top-2 right-0 bg-panel pl-1 font-mono text-[9px] text-dim">
              {Math.round(max * g)}
            </span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end gap-1 pr-6 sm:gap-2">
          {data.map((d, i) => (
            <div key={i} className="group relative flex h-full flex-1 items-end justify-center gap-0.5">
              <div
                className="w-full max-w-3 bg-fg/60 transition-all duration-700"
                style={{ height: `${(d.campaigns / max) * 100}%`, transitionDelay: `${i * 30}ms` }}
              />
              <div
                className="w-full max-w-3 bg-accent shadow-[0_0_12px_rgb(212_255_63/0.35)] transition-all duration-700"
                style={{ height: `${(d.findings / max) * 100}%`, transitionDelay: `${i * 30}ms` }}
              />
              <div className="pointer-events-none absolute -top-8 z-10 hidden border border-line-strong bg-ink px-2 py-1 font-mono text-[10px] whitespace-nowrap group-hover:block">
                C {d.campaigns} · F {d.findings}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-1 pr-6 sm:gap-2">
        {data.map((d, i) => (
          <span key={i} className="flex-1 text-center font-mono text-[9px] text-dim">
            {i % 2 === 0 ? pad(d.day.getDate()) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
