"use client";

import { Activity, Eye, FileText, GitCompare, Play, Plus, RotateCcw, ShieldAlert, Square } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  Loader,
  Modal,
  PageHeader,
  Panel,
  Select,
  cx,
} from "@/components/ui";
import { api } from "@/lib/api";
import { canWrite, useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, fmtDate, pad } from "@/lib/format";
import type { AttackDocument, Campaign, CampaignCreate, CampaignDetail, Paginated, Target } from "@/lib/types";
import { useQueryParam } from "@/lib/use-query-param";
import { useResource } from "@/lib/use-resource";

const FILTERS = ["all", "queued", "running", "completed", "failed", "cancelled"] as const;

export default function CampaignsPage() {
  const { user } = useAuth();
  const writable = canWrite(user);
  const { data, error, loading, reload } = useResource(() =>
    Promise.all([
      api<Paginated<Campaign>>("/campaigns", { query: { per_page: 100 } }),
      api<Paginated<Target>>("/targets", { query: { per_page: 100, active_only: false } }),
    ]),
  );
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [creating, setCreating] = useState(false);
  const [rerunOf, setRerunOf] = useState<Campaign | null>(null);
  const [compareOf, setCompareOf] = useState<Campaign | null>(null);
  const [detailOf, setDetailOf] = useState<Campaign | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [queueInfo, setQueueInfo] = useState<{
    redis_ok: boolean;
    queued_jobs: number;
    workers_count: number;
    status: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function pullQueue() {
      try {
        const q = await api<{
          redis_ok: boolean;
          queued_jobs: number;
          workers_count: number;
          status: string;
          message: string;
        }>("/system/queue");
        if (!cancelled) setQueueInfo(q);
      } catch {
        if (!cancelled)
          setQueueInfo({
            redis_ok: false,
            queued_jobs: 0,
            workers_count: 0,
            status: "unavailable",
            message: "No se pudo consultar la cola",
          });
      }
    }
    void pullQueue();
    const id = window.setInterval(() => void pullQueue(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);


  const wantsNew = useQueryParam("new");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- open the create modal when linked with ?new=1
    if (wantsNew && writable) setCreating(true);
  }, [wantsNew, writable]);

  const campaigns = useMemo(() => data?.[0].items ?? [], [data]);
  const targets = data?.[1].items ?? [];
  const targetName = (id: number) => targets.find((t) => t.target_id === id)?.name ?? `#${id}`;
  const shown = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) out[c.status] = (out[c.status] ?? 0) + 1;
    return out;
  }, [campaigns]);

  // Poll while any campaign is queued or running (async RQ worker)
  useEffect(() => {
    const active = campaigns.some((c) => c.status === "queued" || c.status === "running");
    if (!active) return;
    const id = window.setInterval(() => {
      void reload();
    }, 2500);
    return () => window.clearInterval(id);
  }, [campaigns, reload]);

  async function act(id: number, fn: () => Promise<unknown>, done?: string) {
    setBusyId(id);
    setActionError(null);
    setNotice(null);
    try {
      await fn();
      await reload();
      if (done) setNotice(done);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        index="02"
        subtitle="Operaciones ofensivas"
        title="Campañas"
        actions={
          writable && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nueva campaña
            </Button>
          )
        }
      />

      {queueInfo && (
        <Panel className="mb-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Activity className="size-4 text-accent" />
            <span className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Cola RQ</span>
            <Badge
              value={queueInfo.status}
              tone={
                queueInfo.status === "healthy"
                  ? "ok"
                  : queueInfo.status === "no_workers"
                    ? "medium"
                    : "critical"
              }
            />
            <span className="text-muted">{queueInfo.message}</span>
            <span className="font-mono text-xs text-dim">
              jobs={queueInfo.queued_jobs} · workers={queueInfo.workers_count}
            </span>
          </div>
        </Panel>
      )}

      <div className="mb-4 flex flex-wrap gap-px border border-line bg-line">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              "flex flex-1 items-center justify-between gap-3 px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase transition",
              filter === f ? "bg-white/[0.05] text-accent" : "bg-ink text-muted hover:text-fg",
            )}
          >
            {f === "all" ? "Todas" : f}
            <span className="tabular-nums">{pad(counts[f] ?? 0)}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <ErrorLine message={error || actionError} />
        {notice && (
          <p className="border-l-2 border-ok bg-ok/5 px-3 py-2 font-mono text-xs text-ok">OK // {notice}</p>
        )}

        {loading && !data ? (
          <Loader />
        ) : shown.length === 0 ? (
          <Panel>
            <EmptyState
              title="Sin campañas"
              hint={targets.length ? "Lanza una campaña contra uno de tus targets." : "Primero registra un target."}
              action={
                writable &&
                (targets.length ? (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus className="size-4" /> Nueva campaña
                  </Button>
                ) : (
                  <Link href="/targets" className="font-mono text-xs text-accent uppercase">
                    Ir a targets →
                  </Link>
                ))
              }
            />
          </Panel>
        ) : (
          <Panel bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    {["ID", "Campaña", "Target", "Alcance", "Progreso", "Estado", "Creada", ""].map((h) => (
                      <th key={h} className="label px-4 py-3 font-normal">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((c) => {
                    const busy = busyId === c.campaign_id;
                    return (
                      <Fragment key={c.campaign_id}>
                      <tr className="transition hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-[11px] text-dim">#{pad(c.campaign_id, 3)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="text-left hover:text-accent"
                            onClick={() =>
                              setExpandedId((id) => (id === c.campaign_id ? null : c.campaign_id))
                            }
                          >
                            <p>{c.name}</p>
                            <p className="font-mono text-[10px] text-dim">
                              {expandedId === c.campaign_id ? "ocultar timeline ▲" : "ver timeline ▼"}
                            </p>
                          </button>
                          {c.parent_campaign_id && (
                            <p className="font-mono text-[10px] text-dim">re-run de #{pad(c.parent_campaign_id, 3)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">{targetName(c.target_id)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {c.scope_prompt_injection && <Badge value="PI" tone="accent" />}
                            {c.scope_data_leakage && <Badge value="DL" tone="low" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-20 bg-white/[0.06]">
                              <div
                                className={cx("h-full", c.status === "failed" ? "bg-critical" : "bg-accent")}
                                style={{ width: `${c.progress_percent}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] tabular-nums">{c.progress_percent}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge value={c.status} />
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmtDate(c.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <IconBtn title="Detalle" onClick={() => setDetailOf(c)}>
                              <Eye className="size-3.5" />
                            </IconBtn>
                            {writable && ["queued", "failed"].includes(c.status) && (
                              <IconBtn
                                title="Ejecutar"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    c.campaign_id,
                                    () => api(`/campaigns/${c.campaign_id}/run`, { method: "POST" }),
                                    `Campaña #${c.campaign_id} encolada — el worker la procesará`,
                                  )
                                }
                              >
                                <Play className="size-3.5" />
                              </IconBtn>
                            )}
                            {writable && ["queued", "running"].includes(c.status) && (
                              <IconBtn
                                title="Cancelar"
                                danger
                                disabled={busy}
                                onClick={() =>
                                  act(c.campaign_id, () => api(`/campaigns/${c.campaign_id}/cancel`, { method: "POST" }))
                                }
                              >
                                <Square className="size-3.5" />
                              </IconBtn>
                            )}
                            {writable && ["completed", "failed", "cancelled"].includes(c.status) && (
                              <IconBtn title="Re-ejecutar" disabled={busy} onClick={() => setRerunOf(c)}>
                                <RotateCcw className="size-3.5" />
                              </IconBtn>
                            )}

                            {(c.parent_campaign_id || c.status === "completed") && (
                              <IconBtn
                                title="Comparar re-run"
                                disabled={busy}
                                onClick={() => setCompareOf(c)}
                              >
                                <GitCompare className="size-3.5" />
                              </IconBtn>
                            )}

                            {writable && ["completed", "failed", "running", "queued"].includes(c.status) && (
                              <IconBtn
                                title="Generar reporte"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    c.campaign_id,
                                    () =>
                                      api(`/campaigns/${c.campaign_id}/reports`, {
                                        method: "POST",
                                        body: { report_type: "technical", language: "es" },
                                      }),
                                    `Reporte generado para #${c.campaign_id}`,
                                  )
                                }
                              >
                                <FileText className="size-3.5" />
                              </IconBtn>
                            )}
                            <Link
                              href={`/findings?campaign=${c.campaign_id}`}
                              title="Ver hallazgos"
                              className="grid size-8 place-items-center border border-line text-muted transition hover:border-accent hover:text-accent"
                            >
                              <ShieldAlert className="size-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {expandedId === c.campaign_id && (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={8} className="px-4 py-4">
                            <CampaignTimeline c={c} />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      <CampaignModal
        open={creating}
        onClose={() => setCreating(false)}
        targets={targets.filter((t) => t.is_active)}
        onDone={async (msg) => {
          await reload();
          setNotice(msg);
        }}
      />
      <CompareModal campaign={compareOf} onClose={() => setCompareOf(null)} />
      <RerunModal
        campaign={rerunOf}
        onClose={() => setRerunOf(null)}
        onDone={async (msg) => {
          await reload();
          setNotice(msg);
        }}
      />
      <CampaignDetailModal
        key={detailOf?.campaign_id ?? "closed"}
        campaign={detailOf}
        onClose={() => setDetailOf(null)}
        onOpenParent={(id) => {
          const parent = (data?.[0]?.items || []).find((x) => x.campaign_id === id) || null;
          if (parent) setDetailOf(parent);
          else setDetailOf({ campaign_id: id } as Campaign);
        }}
      />
    </>
  );
}



type CompareResult = {
  campaign_id: number;
  campaign_name: string;
  baseline_campaign_id: number;
  baseline_campaign_name: string;
  summary: {
    current_findings: number;
    baseline_findings: number;
    new: number;
    resolved: number;
    persistent: number;
    improved: boolean;
  };
  new: { finding_id: number; title: string; severity: string | null; category: string | null }[];
  resolved: { finding_id: number; title: string; severity: string | null; category: string | null }[];
  persistent: {
    current: { finding_id: number; title: string; severity: string | null };
    baseline: { finding_id: number; title: string; severity: string | null };
  }[];
};

function CompareModal({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const [againstId, setAgainstId] = useState("");
  const [data, setData] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const q: Record<string, string | number | boolean | undefined> = {};
      if (againstId.trim()) q.against_id = Number(againstId);
      const res = await api<CompareResult>(`/campaigns/${campaign.campaign_id}/compare`, {
        query: q,
      });
      setData(res);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // auto-load when opened if has parent
  if (campaign && !data && !loading && !error && campaign.parent_campaign_id) {
    // kick once via void — use effect pattern avoided; load on button
  }

  return (
    <Modal
      open={!!campaign}
      onClose={() => {
        setData(null);
        setError(null);
        setAgainstId("");
        onClose();
      }}
      title={campaign ? `Comparar #${pad(campaign.campaign_id, 3)}` : "Comparar"}
      code="DIFF"
      wide
    >
      {!campaign ? null : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Diff de hallazgos confirmados respecto a la campaña base (parent del re-run u otro id).
            {campaign.parent_campaign_id
              ? ` Parent por defecto: #${pad(campaign.parent_campaign_id, 3)}.`
              : " Esta campaña no es re-run: indica el id base."}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Baseline (opcional)">
              <Input
                value={againstId}
                onChange={(e) => setAgainstId(e.target.value)}
                placeholder={
                  campaign.parent_campaign_id
                    ? String(campaign.parent_campaign_id)
                    : "campaign_id"
                }
              />
            </Field>
            <Button variant="primary" onClick={() => void load()} disabled={loading}>
              <GitCompare className="size-4" /> {loading ? "Comparando…" : "Comparar"}
            </Button>
          </div>
          <ErrorLine message={error} />
          {data && (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                {[
                  ["Actual", data.summary.current_findings],
                  ["Baseline", data.summary.baseline_findings],
                  ["Nuevos", data.summary.new],
                  ["Resueltos", data.summary.resolved],
                ].map(([label, n]) => (
                  <div key={String(label)} className="border border-line bg-black/30 p-3">
                    <p className="font-mono text-[10px] tracking-[0.14em] text-dim uppercase">{label}</p>
                    <p className="text-xl tabular-nums text-fg">{n}</p>
                  </div>
                ))}
              </div>
              {data.summary.improved && (
                <p className="border-l-2 border-ok bg-ok/5 px-3 py-2 text-sm text-ok">
                  Mejora: hay hallazgos resueltos y no aparecieron nuevos.
                </p>
              )}
              <CompareBucket title="Nuevos (solo en actual)" items={data.new} tone="critical" />
              <CompareBucket title="Resueltos (solo en baseline)" items={data.resolved} tone="ok" />
              <div>
                <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                  Persistentes ({data.persistent.length})
                </p>
                {data.persistent.length === 0 ? (
                  <p className="text-sm text-muted">Ninguno</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {data.persistent.map((p) => (
                      <li key={p.current.finding_id} className="border border-line px-3 py-2">
                        <Badge value={p.current.severity || "—"} />{" "}
                        {p.current.title}
                        <span className="font-mono text-[10px] text-dim">
                          {" "}
                          #{p.baseline.finding_id} → #{p.current.finding_id}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function CompareBucket({
  title,
  items,
  tone,
}: {
  title: string;
  items: { finding_id: number; title: string; severity: string | null; category: string | null }[];
  tone: "critical" | "ok";
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
        {title} ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Ninguno</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map((it) => (
            <li key={it.finding_id} className="border border-line px-3 py-2">
              <Badge value={it.severity || "—"} tone={tone === "ok" ? "ok" : undefined} />{" "}
              {it.title}
              <span className="font-mono text-[10px] text-dim"> #{it.finding_id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function CampaignTimeline({ c }: { c: Campaign }) {
  const steps = [
    {
      key: "created",
      label: "Creada",
      done: true,
      at: c.created_at,
    },
    {
      key: "queued",
      label: "En cola",
      done: ["queued", "running", "completed", "failed", "cancelled"].includes(c.status),
      at: c.status === "queued" ? c.created_at : c.started_at || c.created_at,
    },
    {
      key: "running",
      label: "Ejecutando",
      done: ["running", "completed", "failed"].includes(c.status) || c.progress_percent > 0,
      at: c.started_at,
    },
    {
      key: "probes",
      label: "Probes / hallazgos",
      done: c.progress_percent >= 50 || ["completed", "failed"].includes(c.status),
      at: c.started_at,
    },
    {
      key: "done",
      label: c.status === "failed" ? "Fallida" : c.status === "cancelled" ? "Cancelada" : "Completada",
      done: ["completed", "failed", "cancelled"].includes(c.status),
      at: c.finished_at,
    },
  ];

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
        Timeline · progreso {c.progress_percent}%
      </p>
      <ol className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <li
            key={s.key}
            className={cx(
              "flex min-w-[120px] flex-1 flex-col border px-3 py-2",
              s.done ? "border-accent/40 bg-accent/5" : "border-line bg-black/20 opacity-50",
            )}
          >
            <span className="font-mono text-[10px] text-dim">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={cx("text-sm", s.done ? "text-fg" : "text-muted")}>{s.label}</span>
            <span className="mt-1 font-mono text-[10px] text-muted">
              {s.at ? fmtDate(s.at) : "—"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function IconBtn({
  children,
  danger,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      {...rest}
      aria-label={rest.title}
      className={cx(
        "grid size-8 place-items-center border border-line text-muted transition disabled:opacity-40",
        danger ? "hover:border-critical hover:text-critical" : "hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

function useDocuments(open: boolean) {
  return useResource(
    () => (open ? api<Paginated<AttackDocument>>("/attack-documents", { query: { per_page: 100 } }) : Promise.resolve(null)),
    [open],
  );
}

function DocumentPicker({
  docs,
  selected,
  onToggle,
}: {
  docs: AttackDocument[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  if (!docs.length) return <p className="text-sm text-muted">No hay payloads disponibles.</p>;
  return (
    <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
      {docs.map((d) => (
        <Checkbox
          key={d.attack_document_id}
          checked={selected.includes(d.attack_document_id)}
          onChange={() => onToggle(d.attack_document_id)}
          label={`${d.name} · ${CATEGORY_LABEL[d.category] ?? d.category}`}
        />
      ))}
    </div>
  );
}


/** G1-Smoke: one known-positive + one attack per family (control_v1 pack). */
const SMOKE_PREFIXES = ["C-P01", "D-01-A", "I-01-A", "L-D01-A"] as const;

const G0_BENIGN_PREFIXES = ["C-B01", "C-B07"] as const;
const G0_POSITIVE_PREFIXES = ["C-P01", "C-P03", "C-R01"] as const;

function matchDocIds(docs: AttackDocument[], prefixes: readonly string[]): number[] {
  const ids: number[] = [];
  for (const prefix of prefixes) {
    const hit = docs.find((d) => d.name.startsWith(prefix) || d.file_name?.startsWith(prefix));
    if (hit) ids.push(hit.attack_document_id);
  }
  return ids;
}

function CampaignModal({
  open,
  onClose,
  targets,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  targets: Target[];
  onDone: (msg: string) => void;
}) {
  const [form, setForm] = useState<CampaignCreate>({
    name: "",
    target_id: 0,
    scope_prompt_injection: true,
    scope_data_leakage: false,
    document_ids: [],
    run_now: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const docs = useDocuments(open);
  const targetId = form.target_id || targets[0]?.target_id || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<Campaign>("/campaigns", { method: "POST", body: { ...form, target_id: targetId } });
      if (form.run_now) await api(`/campaigns/${created.campaign_id}/run`, { method: "POST" });
      setForm((f) => ({ ...f, name: "", document_ids: [] }));
      onClose();
      onDone(
        form.run_now
          ? `Campaña "${created.name}" encolada — revisa que el worker RQ esté activo`
          : `Campaña "${created.name}" creada (queued)`,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Lanzar campaña" code="OPS+" wide>
      {targets.length === 0 ? (
        <EmptyState title="Sin targets activos" hint="Registra un target antes de crear una campaña." />
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Auditoría Q4"
              />
            </Field>
            <Field label="Target">
              <Select value={targetId} onChange={(e) => setForm({ ...form, target_id: Number(e.target.value) })}>
                {targets.map((t) => (
                  <option key={t.target_id} value={t.target_id}>
                    {t.name} · {t.mode}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            <span className="label">Alcance</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox
                checked={form.scope_prompt_injection}
                onChange={(v) => setForm({ ...form, scope_prompt_injection: v })}
                label="Prompt Injection"
              />
              <Checkbox
                checked={form.scope_data_leakage}
                onChange={(v) => setForm({ ...form, scope_data_leakage: v })}
                label="Data Leakage (requiere modo complete)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="label">Presets</span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={!docs.data?.items?.length}
                onClick={() => {
                  const items = docs.data?.items ?? [];
                  const ids = matchDocIds(items, SMOKE_PREFIXES);
                  setForm((f) => ({
                    ...f,
                    name: f.name || "G1-Smoke",
                    scope_prompt_injection: true,
                    scope_data_leakage: true,
                    document_ids: ids,
                  }));
                }}
              >
                G1 · Smoke
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!docs.data?.items?.length}
                onClick={() => {
                  const items = docs.data?.items ?? [];
                  const ids = matchDocIds(items, G0_BENIGN_PREFIXES);
                  setForm((f) => ({
                    ...f,
                    name: f.name || "G0-Línea base (benignos)",
                    scope_prompt_injection: true,
                    scope_data_leakage: true,
                    document_ids: ids,
                  }));
                }}
              >
                G0 · Benignos (0 hallazgos)
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!docs.data?.items?.length}
                onClick={() => {
                  const items = docs.data?.items ?? [];
                  const ids = matchDocIds(items, G0_POSITIVE_PREFIXES);
                  setForm((f) => ({
                    ...f,
                    name: f.name || "G0-Sanity (positivos)",
                    scope_prompt_injection: true,
                    scope_data_leakage: true,
                    document_ids: ids,
                  }));
                }}
              >
                G0 · Positivos conocidos
              </Button>
            </div>
            <p className="text-xs text-muted">
              Smoke selecciona C-P01, D-01-A, I-01-A y L-D01-A si existen en payloads globales.
            </p>
          </div>
          <div className="space-y-2">
            <span className="label">Payloads</span>
            {docs.loading ? (
              <Loader label="Cargando payloads" />
            ) : (
              <DocumentPicker
                docs={docs.data?.items ?? []}
                selected={form.document_ids}
                onToggle={(id) =>
                  setForm((f) => ({
                    ...f,
                    document_ids: f.document_ids.includes(id)
                      ? f.document_ids.filter((x) => x !== id)
                      : [...f.document_ids, id],
                  }))
                }
              />
            )}
          </div>
          <Checkbox
            checked={form.run_now}
            onChange={(v) => setForm({ ...form, run_now: v })}
            label="Ejecutar inmediatamente"
          />
          <ErrorLine message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Desplegando…" : form.run_now ? "Lanzar" : "Encolar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function RerunModal({
  campaign,
  onClose,
  onDone,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [changeConfig, setChangeConfig] = useState(false);
  const [pi, setPi] = useState(true);
  const [dl, setDl] = useState(false);
  const [docIds, setDocIds] = useState<number[]>([]);
  const [runNow, setRunNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const docs = useDocuments(!!campaign && changeConfig);

  useEffect(() => {
    if (!campaign) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when a new campaign is selected
    setName(`${campaign.name} (re-run)`);
    setPi(campaign.scope_prompt_injection);
    setDl(campaign.scope_data_leakage);
    setChangeConfig(false);
    setDocIds([]);
    setError(null);
  }, [campaign]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaign) return;
    setBusy(true);
    setError(null);
    try {
      const body = changeConfig
        ? { name, change_config: true, scope_prompt_injection: pi, scope_data_leakage: dl, document_ids: docIds }
        : { name, change_config: false };
      const created = await api<Campaign>(`/campaigns/${campaign.campaign_id}/rerun`, { method: "POST", body });
      if (runNow) await api(`/campaigns/${created.campaign_id}/run`, { method: "POST" });
      onClose();
      onDone(`Re-run #${created.campaign_id} ${runNow ? "encolado — espera al worker" : "en cola"}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!campaign} onClose={onClose} title={`Re-ejecutar #${pad(campaign?.campaign_id ?? 0, 3)}`} code="RRN">
      <form onSubmit={submit} className="space-y-5">
        <Field label="Nombre">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Checkbox checked={changeConfig} onChange={setChangeConfig} label="Modificar configuración" />
        {changeConfig && (
          <div className="space-y-3 border-l border-line pl-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Checkbox checked={pi} onChange={setPi} label="Prompt Injection" />
              <Checkbox checked={dl} onChange={setDl} label="Data Leakage" />
            </div>
            {docs.loading ? (
              <Loader label="Cargando payloads" />
            ) : (
              <DocumentPicker
                docs={docs.data?.items ?? []}
                selected={docIds}
                onToggle={(id) => setDocIds((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]))}
              />
            )}
          </div>
        )}
        <Checkbox checked={runNow} onChange={setRunNow} label="Ejecutar inmediatamente" />
        <ErrorLine message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Clonando…" : "Re-ejecutar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


function CampaignDetailModal({
  campaign,
  onClose,
  onOpenParent,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onOpenParent: (id: number) => void;
}) {
  const campaignId = campaign?.campaign_id ?? null;
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(campaignId));

  useEffect(() => {
    if (campaignId == null) return;
    let cancelled = false;

    void (async () => {
      try {
        const d = await api<CampaignDetail>(`/campaigns/${campaignId}/detail`);
        if (cancelled) return;
        setDetail(d);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error al cargar detalle");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <Modal
      open={!!campaign}
      onClose={onClose}
      title={detail ? `Campaña #${pad(detail.campaign_id, 3)} · ${detail.name}` : "Detalle de campaña"}
      code="CMP·"
      wide
    >
      {loading && <Loader label="Cargando detalle…" />}
      <ErrorLine message={error} />
      {detail && !loading && (
        <div className="space-y-6 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="label text-dim">Estado</p>
              <p className="font-mono text-fg">{detail.status}</p>
            </div>
            <div>
              <p className="label text-dim">Target</p>
              <p className="text-fg">{detail.target_name || `Target #${detail.target_id}`}</p>
            </div>
            <div>
              <p className="label text-dim">Creada por</p>
              <p className="text-fg">
                {detail.created_by_name || detail.created_by_email || `Usuario #${detail.created_by}`}
              </p>
              {detail.created_by_email && detail.created_by_name && (
                <p className="font-mono text-[11px] text-muted">{detail.created_by_email}</p>
              )}
            </div>
            <div>
              <p className="label text-dim">Fechas</p>
              <p className="text-muted">Creada: {fmtDate(detail.created_at)}</p>
              {detail.started_at && <p className="text-muted">Inicio: {fmtDate(detail.started_at)}</p>}
              {detail.finished_at && <p className="text-muted">Fin: {fmtDate(detail.finished_at)}</p>}
            </div>
            <div>
              <p className="label text-dim">Alcance</p>
              <p className="text-fg">
                {[detail.scope_prompt_injection && "Prompt Injection", detail.scope_data_leakage && "Data Leakage"]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="label text-dim">Hallazgos</p>
              <p className="font-mono text-fg">{detail.findings_count ?? 0}</p>
              <Link href={`/findings?campaign=${detail.campaign_id}`} className="text-xs text-accent underline">
                Ver hallazgos
              </Link>
            </div>
          </div>

          {detail.parent && (
            <div className="border border-line bg-ink/50 p-4">
              <p className="label mb-2 text-dim">Campaña padre (re-run de)</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-fg">
                    #{pad(detail.parent.campaign_id, 3)} · {detail.parent.name}
                  </p>
                  <p className="font-mono text-[11px] text-muted">{detail.parent.status}</p>
                </div>
                <Button size="sm" onClick={() => onOpenParent(detail.parent!.campaign_id)}>
                  Ver padre
                </Button>
              </div>
            </div>
          )}

          {detail.children && detail.children.length > 0 && (
            <div>
              <p className="label mb-2 text-dim">Re-ejecuciones hijas</p>
              <ul className="space-y-2">
                {detail.children.map((ch) => (
                  <li key={ch.campaign_id} className="flex items-center justify-between border border-line px-3 py-2">
                    <span>
                      #{pad(ch.campaign_id, 3)} · {ch.name}{" "}
                      <span className="font-mono text-[11px] text-muted">{ch.status}</span>
                    </span>
                    <Button size="sm" onClick={() => onOpenParent(ch.campaign_id)}>
                      Detalle
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="label mb-2 text-dim">Documentos de ataque</p>
            {!detail.documents?.length ? (
              <p className="text-muted">Sin documentos listados en la configuración (o se usó el set por defecto).</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-auto border border-line">
                {detail.documents.map((d) => (
                  <li key={d.attack_document_id} className="border-b border-line px-3 py-2 last:border-0">
                    <p className="text-fg">{d.name}</p>
                    <p className="font-mono text-[10px] text-muted">
                      #{d.attack_document_id}
                      {d.technique ? ` · ${d.technique}` : ""}
                      {d.scope ? ` · ${d.scope}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
