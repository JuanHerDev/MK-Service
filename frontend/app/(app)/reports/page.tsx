"use client";

import { Download, Eye, FileText, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorLine,
  Field,
  Loader,
  Modal,
  PageHeader,
  Panel,
  Select,
  cx,
} from "@/components/ui";
import { api, downloadReport, fetchReportBlob } from "@/lib/api";
import { canWrite, useAuth } from "@/lib/auth";
import { fmtBytes, fmtDate, fmtRelative, pad } from "@/lib/format";
import type { Campaign, Paginated, Report } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

type ReportList = { items: Report[]; total: number };

const TYPE_FILTERS = ["all", "technical", "executive"] as const;
const LANG_FILTERS = ["all", "es", "en"] as const;

export default function ReportsPage() {
  const { user } = useAuth();
  const writable = canWrite(user);

  const [campaignId, setCampaignId] = useState("");
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_FILTERS)[number]>("all");
  const [langFilter, setLangFilter] = useState<(typeof LANG_FILTERS)[number]>("all");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [previewOf, setPreviewOf] = useState<Report | null>(null);

  const campaigns = useResource(() => api<Paginated<Campaign>>("/campaigns", { query: { per_page: 100 } }));
  const { data, error, loading, reload } = useResource(
    () =>
      api<ReportList>("/reports", {
        query: { campaign_id: campaignId || undefined },
      }),
    [campaignId],
  );

  const campaignName = (id: number) =>
    campaigns.data?.items.find((c) => c.campaign_id === id)?.name ?? `#${id}`;

  const items = useMemo(() => {
    let list = data?.items ?? [];
    if (typeFilter !== "all") list = list.filter((r) => r.report_type === typeFilter);
    if (langFilter !== "all") list = list.filter((r) => r.language === langFilter);
    return [...list].sort((a, b) => {
      const ta = new Date(a.generated_at || a.created_at).getTime();
      const tb = new Date(b.generated_at || b.created_at).getTime();
      return tb - ta;
    });
  }, [data, typeFilter, langFilter]);

  const counts = useMemo(() => {
    const all = data?.items ?? [];
    return {
      all: all.length,
      technical: all.filter((r) => r.report_type === "technical").length,
      executive: all.filter((r) => r.report_type === "executive").length,
    };
  }, [data]);

  const completedCampaigns = (campaigns.data?.items ?? []).filter((c) =>
    ["completed", "failed"].includes(c.status),
  );


  async function handleDownload(r: Report) {
    if (r.report_status !== "ready") {
      setActionError("El informe aún no está listo para descargar");
      return;
    }
    setDownloadingId(r.report_id);
    setActionError(null);
    try {
      const suggested = `mk_rpt_${r.report_id}_${r.report_type}_${r.language}.pdf`;
      await downloadReport(r.report_id, suggested);
      setNotice(`Descarga iniciada: RPT-${pad(r.report_id, 3)}`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo descargar el informe");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <PageHeader
        index="05"
        subtitle="Entregables"
        title="Informes"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="md" onClick={() => reload()} title="Actualizar">
              <RefreshCw className="size-4" />
            </Button>
            {writable && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Generar informe
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="h-10 min-w-56 py-0 font-mono text-xs"
          aria-label="Filtrar por campaña"
        >
          <option value="">Todas las campañas</option>
          {(campaigns.data?.items ?? []).map((c) => (
            <option key={c.campaign_id} value={c.campaign_id}>
              #{pad(c.campaign_id, 3)} · {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-4 flex flex-wrap gap-px border border-line bg-line">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cx(
              "flex flex-1 items-center justify-between gap-3 px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase transition",
              typeFilter === t ? "bg-white/[0.05] text-accent" : "bg-ink text-muted hover:text-fg",
            )}
          >
            {t === "all" ? "Todos" : t}
            <span className="tabular-nums">{pad(t === "all" ? counts.all : counts[t])}</span>
          </button>
        ))}
        {LANG_FILTERS.filter((l) => l !== "all").map((l) => (
          <button
            key={l}
            onClick={() => setLangFilter((prev) => (prev === l ? "all" : l))}
            className={cx(
              "px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase transition",
              langFilter === l ? "bg-white/[0.05] text-fg" : "bg-ink text-muted hover:text-fg",
            )}
          >
            {l}
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
        ) : items.length === 0 ? (
          <Panel>
            <EmptyState
              title="Sin informes"
              hint="Genera un informe técnico o ejecutivo desde una campaña completada."
              action={
                writable && (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus className="size-4" /> Generar informe
                  </Button>
                )
              }
            />
          </Panel>
        ) : (
          <Panel bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Campaña</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Idioma</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Tamaño</th>
                    <th className="px-4 py-3 font-medium">Generado</th>
                    <th className="px-4 py-3 font-medium">Ruta</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((r, i) => (
                    <tr
                      key={r.report_id}
                      className="animate-fade-up transition hover:bg-white/[0.02]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-dim">RPT-{pad(r.report_id, 3)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/campaigns`}
                          className="text-fg transition hover:text-accent"
                          title={campaignName(r.campaign_id)}
                        >
                          <span className="font-mono text-[10px] text-dim">#{pad(r.campaign_id, 3)}</span>
                          <span className="ml-2 line-clamp-1">{campaignName(r.campaign_id)}</span>
                        </Link>
                        <div className="mt-0.5">
                          <Link
                            href={`/findings?campaign=${r.campaign_id}`}
                            className="font-mono text-[10px] text-muted hover:text-accent"
                          >
                            Ver hallazgos →
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={r.report_type} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs uppercase">{r.language}</td>
                      <td className="px-4 py-3">
                        <Badge value={r.report_status} pulse={r.report_status === "generating"} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{fmtBytes(r.size_bytes)}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs">{fmtDate(r.generated_at || r.created_at)}</p>
                        <p className="font-mono text-[10px] text-dim">{fmtRelative(r.generated_at || r.created_at)}</p>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 font-mono text-[10px] text-dim" title={r.file_path ?? undefined}>
                        {r.file_path || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            disabled={r.report_status !== "ready"}
                            onClick={() => setPreviewOf(r)}
                            title={r.report_status === "ready" ? "Vista previa" : "No disponible"}
                          >
                            <Eye className="size-3.5" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            disabled={r.report_status !== "ready" || downloadingId === r.report_id}
                            onClick={() => handleDownload(r)}
                            title={r.report_status === "ready" ? "Descargar PDF" : "No disponible"}
                          >
                            <Download className={cx("size-3.5", downloadingId === r.report_id && "animate-spin")} />
                            {downloadingId === r.report_id ? "…" : "PDF"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      <GenerateReportModal
        key={creating ? "open" : "closed"}
        open={creating}
        campaigns={completedCampaigns}
        allCampaigns={campaigns.data?.items ?? []}
        onClose={() => setCreating(false)}
        onCreated={async (msg) => {
          setCreating(false);
          setNotice(msg);
          setActionError(null);
          await reload();
        }}
        onError={(msg) => setActionError(msg)}
      />
      <ReportPreviewModal report={previewOf} onClose={() => setPreviewOf(null)} />
    </>
  );
}

function GenerateReportModal({
  open,
  campaigns,
  allCampaigns,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  campaigns: Campaign[];
  allCampaigns: Campaign[];
  onClose: () => void;
  onCreated: (msg: string) => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const options = useMemo(() => {
    if (campaigns.length) return campaigns;
    return allCampaigns.filter((c) => ["completed", "failed"].includes(c.status));
  }, [campaigns, allCampaigns]);

  const [campaignId, setCampaignId] = useState("");
  const [reportType, setReportType] = useState<"technical" | "executive">("technical");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [busy, setBusy] = useState(false);

  // Sync selected campaign when modal opens or options load (fixes empty submit until manual change)
  useEffect(() => {
    if (!open) return;
    const first = options[0]?.campaign_id;
    setCampaignId((prev) => {
      if (prev && options.some((c) => String(c.campaign_id) === prev)) return prev;
      return first != null ? String(first) : "";
    });
  }, [open, options]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId) {
      onError("Selecciona una campaña");
      return;
    }
    setBusy(true);
    try {
      const report = await api<Report>(`/campaigns/${campaignId}/reports`, {
        method: "POST",
        body: { report_type: reportType, language },
      });
      await onCreated(`Informe RPT-${pad(report.report_id, 3)} generado`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo generar el informe");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Generar informe" code="RPT+">
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-muted">
          Se genera un PDF (ejecutivo o técnico) con los hallazgos de la campaña. Luego puedes verlo en vista previa o
          descargarlo.
        </p>

        <Field label="Campaña">
          <Select
            required
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="font-mono text-xs"
          >
            {options.length === 0 && <option value="">No hay campañas disponibles</option>}
            {options.map((c) => (
              <option key={c.campaign_id} value={c.campaign_id}>
                #{pad(c.campaign_id, 3)} · {c.name} ({c.status})
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "technical" | "executive")}
            >
              <option value="technical">Técnico</option>
              <option value="executive">Ejecutivo</option>
            </Select>
          </Field>
          <Field label="Idioma">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as "es" | "en")}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy || !campaignId}>
            <FileText className="size-4" />
            {busy ? "Generando…" : "Generar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReportPreviewModal({
  report,
  onClose,
}: {
  report: Report | null;
  onClose: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!report?.report_id) return;
    let cancelled = false;
    let url: string | null = null;

    void (async () => {
      setLoading(true);
      setError(null);
      setObjectUrl(null);
      try {
        const res = await fetchReportBlob(report.report_id);
        if (cancelled) {
          URL.revokeObjectURL(res.objectUrl);
          return;
        }
        url = res.objectUrl;
        setObjectUrl(res.objectUrl);
        setFilename(res.filename);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar la vista previa");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [report?.report_id]);

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={
        report
          ? `Vista previa · RPT-${pad(report.report_id, 3)} · ${report.report_type}`
          : "Vista previa"
      }
      code="RPT·"
      xl
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span className="font-mono">
            {report && (
              <>
                Campaña #{pad(report.campaign_id, 3)} · {report.language.toUpperCase()} ·{" "}
                {report.report_status}
              </>
            )}
          </span>
          <div className="flex gap-2">
            {report && report.report_status === "ready" && (
              <Button
                size="sm"
                onClick={() =>
                  void downloadReport(
                    report.report_id,
                    filename || `mk_rpt_${report.report_id}_${report.report_type}_${report.language}.pdf`,
                  )
                }
              >
                <Download className="size-3.5" />
                Descargar
              </Button>
            )}
            <Button size="sm" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>

        <ErrorLine message={error} />
        {loading && <Loader label="Cargando PDF…" />}

        {objectUrl && !loading && (
          <div className="relative min-h-0 w-full flex-1 overflow-hidden border border-line bg-void">
            <iframe
              title="Vista previa del informe PDF"
              src={`${objectUrl}#view=FitH`}
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          </div>
        )}

        {!loading && !objectUrl && !error && (
          <p className="text-sm text-muted">No hay documento para mostrar.</p>
        )}
      </div>
    </Modal>
  );
}
