"use client";

import { Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorLine,
  Loader,
  PageHeader,
  Panel,
  Select,
  Textarea,
  cx,
} from "@/components/ui";
import { api } from "@/lib/api";
import { canWrite, useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, fmtDate, fmtRelative, humanize, pad } from "@/lib/format";
import type { Campaign, Finding, FindingComment, Paginated } from "@/lib/types";
import { useQueryParam } from "@/lib/use-query-param";
import { useResource } from "@/lib/use-resource";

const SEVERITIES = ["all", "critical", "high", "medium", "low"] as const;
const STATUSES = ["open", "in_progress", "resolved", "false_positive", "accepted_risk"];
const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const SEV_DOT: Record<string, string> = { critical: "bg-critical", high: "bg-high", medium: "bg-medium", low: "bg-low" };

export default function FindingsPage() {
  const campaignParam = useQueryParam("campaign");
  const idParam = useQueryParam("id");
  const [campaignId, setCampaignId] = useState<string>("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("all");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial filters from the URL
    if (campaignParam) setCampaignId(campaignParam);
    if (idParam) setSelected(Number(idParam));
  }, [campaignParam, idParam]);

  const { data, error, loading, reload, setData } = useResource(
    () =>
      api<Paginated<Finding>>("/findings", {
        query: { per_page: 100, campaign_id: campaignId || undefined },
      }),
    [campaignId],
  );
  const campaigns = useResource(() => api<Paginated<Campaign>>("/campaigns", { query: { per_page: 100 } }));

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return (severity === "all" ? all : all.filter((f) => f.severity === severity)).sort(
      (a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) || a.priority_order - b.priority_order,
    );
  }, [data, severity]);

  const current = data?.items.find((f) => f.finding_id === selected) ?? null;

  return (
    <>
      <PageHeader
        index="03"
        subtitle="Backlog de vulnerabilidades"
        title="Hallazgos"
        actions={
          <div className="flex gap-2">
            <Select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="h-10 min-w-48 py-0 font-mono text-xs"
              aria-label="Filtrar por campaña"
            >
              <option value="">Todas las campañas</option>
              {campaigns.data?.items.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>
                  #{pad(c.campaign_id, 3)} · {c.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-px border border-line bg-line">
        {SEVERITIES.map((s) => {
          const n = s === "all" ? data?.items.length ?? 0 : data?.items.filter((f) => f.severity === s).length ?? 0;
          return (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cx(
                "flex flex-1 items-center justify-between gap-3 px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase transition",
                severity === s ? "bg-white/[0.05] text-fg" : "bg-ink text-muted hover:text-fg",
              )}
            >
              <span className="flex items-center gap-2">
                {s !== "all" && <span className={cx("size-1.5", SEV_DOT[s])} />}
                {s === "all" ? "Todas" : s}
              </span>
              <span className="tabular-nums">{pad(n)}</span>
            </button>
          );
        })}
      </div>

      <ErrorLine message={error} />

      <div className={cx("grid gap-6", current && "xl:grid-cols-[1fr_480px]")}>
        <div>
          {loading && !data ? (
            <Loader />
          ) : items.length === 0 ? (
            <Panel>
              <EmptyState title="Sin hallazgos" hint="Ejecuta una campaña para descubrir vulnerabilidades." />
            </Panel>
          ) : (
            <Panel bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {items.map((f) => (
                  <li key={f.finding_id}>
                    <button
                      onClick={() => setSelected(f.finding_id)}
                      className={cx(
                        "grid w-full grid-cols-[auto_1fr] items-center gap-4 px-4 py-4 text-left transition sm:grid-cols-[90px_1fr_auto_auto]",
                        selected === f.finding_id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]",
                      )}
                    >
                      <Badge value={f.severity} />
                      <div className="min-w-0">
                        <p className="truncate">{f.title}</p>
                        <p className="font-mono text-[10px] tracking-[0.1em] text-dim uppercase">
                          FND-{pad(f.finding_id, 4)} · {CATEGORY_LABEL[f.category] ?? f.category} · #{pad(f.campaign_id, 3)}
                          {f.canary_found && <span className="ml-2 text-critical">· canary</span>}
                        </p>
                      </div>
                      <span className="hidden sm:block">
                        <Badge value={f.status} />
                      </span>
                      <span className="hidden font-mono text-[10px] text-dim sm:block">{fmtRelative(f.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {current && (
          <FindingDetail
            key={current.finding_id}
            finding={current}
            onClose={() => setSelected(null)}
            onUpdated={(f) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.finding_id === f.finding_id ? f : x)) } : d))}
            onReload={reload}
          />
        )}
      </div>
    </>
  );
}

function FindingDetail({
  finding,
  onClose,
  onUpdated,
}: {
  finding: Finding;
  onClose: () => void;
  onUpdated: (f: Finding) => void;
  onReload: () => void;
}) {
  const { user } = useAuth();
  const writable = canWrite(user);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const comments = useResource(() => api<FindingComment[]>(`/findings/${finding.finding_id}/comments`), [finding.finding_id]);

  async function updateStatus(status: string) {
    setSaving(true);
    setError(null);
    try {
      onUpdated(await api<Finding>(`/findings/${finding.finding_id}`, { method: "PATCH", body: { status } }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/findings/${finding.finding_id}/comments`, { method: "POST", body: { message } });
      setMessage("");
      await comments.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="hud animate-fade-up self-start border border-line-strong bg-ink xl:sticky xl:top-20">
      <header className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div className="min-w-0">
          <p className="label mb-2">
            <span className="text-accent">FND-{pad(finding.finding_id, 4)}</span> · {fmtDate(finding.created_at)}
          </p>
          <h2 className="text-xl tracking-tight">{finding.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge value={finding.severity} />
            <Badge value={CATEGORY_LABEL[finding.category] ?? finding.category} tone="muted" />
            {finding.canary_found && <Badge value="canary leaked" tone="critical" pulse />}
          </div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-accent" aria-label="Cerrar detalle">
          <X className="size-4" />
        </button>
      </header>

      <div className="max-h-[calc(100vh-14rem)] space-y-6 overflow-y-auto p-5">
        <div className="space-y-2">
          <span className="label">Estado</span>
          {writable ? (
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={saving}
                  onClick={() => updateStatus(s)}
                  className={cx(
                    "border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase transition",
                    finding.status === s
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-muted hover:border-line-strong hover:text-fg",
                  )}
                >
                  {humanize(s)}
                </button>
              ))}
            </div>
          ) : (
            <Badge value={finding.status} />
          )}
        </div>

        {finding.description && <Block label="Descripción">{finding.description}</Block>}
        {finding.query_used && (
          <Block label="Payload enviado" mono>
            {finding.query_used}
          </Block>
        )}
        {finding.response_excerpt && (
          <Block label="Respuesta del target" mono tone="critical">
            {finding.response_excerpt}
          </Block>
        )}
        {finding.recommendation && <Block label="Recomendación">{finding.recommendation}</Block>}

        <div className="space-y-3 border-t border-line pt-5">
          <span className="label">Bitácora · {comments.data?.length ?? 0}</span>
          {comments.loading && !comments.data ? (
            <Loader label="Cargando" />
          ) : (
            <ul className="space-y-3">
              {comments.data?.map((c) => (
                <li key={c.comment_id} className="border-l border-line-strong pl-3">
                  <p className="font-mono text-[10px] text-dim">
                    USR-{c.user_id} · {fmtRelative(c.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                </li>
              ))}
            </ul>
          )}
          {writable && (
            <form onSubmit={addComment} className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Añadir nota de mitigación…"
                className="min-h-20"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" variant="primary" disabled={saving || !message.trim()}>
                  <Send className="size-3" /> Comentar
                </Button>
              </div>
            </form>
          )}
        </div>
        <ErrorLine message={error} />
      </div>
    </aside>
  );
}

function Block({
  label,
  children,
  mono,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  tone?: "critical";
}) {
  return (
    <div className="space-y-2">
      <span className="label">{label}</span>
      <div
        className={cx(
          "text-sm leading-relaxed whitespace-pre-wrap text-fg/90",
          mono && "border border-line bg-void/60 p-3 font-mono text-[12px]",
          tone === "critical" && "border-critical/30 text-critical/90",
        )}
      >
        {children}
      </div>
    </div>
  );
}
