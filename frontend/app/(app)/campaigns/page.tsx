"use client";

import { FileText, Play, Plus, RotateCcw, ShieldAlert, Square, Activity } from "lucide-react";
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
import type { AttackDocument, Campaign, CampaignCreate, Paginated, Target } from "@/lib/types";
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
      <RerunModal
        campaign={rerunOf}
        onClose={() => setRerunOf(null)}
        onDone={async (msg) => {
          await reload();
          setNotice(msg);
        }}
      />
    </>
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
