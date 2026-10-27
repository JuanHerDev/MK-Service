"use client";

import { Download, Filter, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  Loader,
  PageHeader,
  Panel,
  Select,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate, pad } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

type AuditEvent = {
  audit_event_id: number;
  organization_id: number | null;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  summary: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

type Actor = {
  user_id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
};

type Filters = {
  action: string;
  actorUserId: string;
  email: string;
  dateFrom: string;
  dateTo: string;
};

const ACTION_OPTIONS = [
  "invite.created",
  "invite.revoked",
  "invite.accepted",
  "member.role_changed",
  "member.activated",
  "member.deactivated",
  "api_key.created",
  "api_key.revoked",
  "campaign.run",
  "report.generated",
];

function canViewAudit(role: string | undefined, isAdmin: boolean | undefined) {
  if (isAdmin) return true;
  return role === "owner" || role === "auditor" || role === "admin";
}

const EMPTY_FILTERS: Filters = {
  action: "",
  actorUserId: "",
  email: "",
  dateFrom: "",
  dateTo: "",
};

export default function AuditPage() {
  const { user } = useAuth();
  const role = user?.membership?.role_code;
  const allowed = canViewAudit(role, user?.is_platform_admin);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [memberFilter, setMemberFilter] = useState<"all" | "active" | "inactive">("all");

  const { data, error, loading, reload } = useResource(async () => {
    if (!allowed) {
      return { events: [] as AuditEvent[], actors: [] as Actor[] };
    }
    const query: Record<string, string | number | boolean | undefined> = { limit: 100 };
    if (applied.action) query.action = applied.action;
    if (applied.actorUserId) query.actor_user_id = Number(applied.actorUserId);
    if (applied.email.trim()) query.email = applied.email.trim();
    if (applied.dateFrom) query.date_from = new Date(applied.dateFrom).toISOString();
    if (applied.dateTo) {
      const end = new Date(applied.dateTo);
      end.setHours(23, 59, 59, 999);
      query.date_to = end.toISOString();
    }
    const [events, actors] = await Promise.all([
      api<AuditEvent[]>("/audit-events", { query }),
      api<Actor[]>("/audit-events/actors"),
    ]);
    return { events, actors };
  }, [allowed, applied.action, applied.actorUserId, applied.email, applied.dateFrom, applied.dateTo]);

  const events = data?.events ?? [];
  const actors = data?.actors ?? [];

  const filteredActors = useMemo(
    () =>
      actors.filter((a) => {
        if (memberFilter === "active") return a.is_active;
        if (memberFilter === "inactive") return !a.is_active;
        return true;
      }),
    [actors, memberFilter],
  );

  function exportCsv() {
    if (!events.length) return;
    const header = [
      "id",
      "created_at",
      "actor_email",
      "actor_name",
      "action",
      "summary",
      "resource_type",
      "resource_id",
    ];
    const rows = events.map((e) =>
      [
        e.audit_event_id,
        e.created_at,
        e.actor_email ?? "",
        e.actor_name ?? "",
        e.action,
        (e.summary ?? "").replaceAll('"', '""'),
        e.resource_type ?? "",
        e.resource_id ?? "",
      ]
        .map((c) => `"${c}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!allowed) {
    return (
      <>
        <PageHeader index="08" subtitle="Seguridad" title="Auditoría" />
        <Panel>
          <EmptyState
            title="Acceso restringido"
            hint="Solo Owner, Auditor o Admin pueden ver el historial de la organización."
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        index="08"
        subtitle="Seguridad"
        title="Auditoría"
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={exportCsv}>
              <Download className="size-4" /> CSV
            </Button>
            <Button variant="primary" onClick={() => void reload()}>
              <RefreshCw className="size-4" /> Actualizar
            </Button>
          </div>
        }
      />

      <Panel className="mb-4">
        <p className="text-sm text-muted">
          Registro de acciones relevantes en{" "}
          <strong className="text-fg">{user?.organization?.name ?? "tu organización"}</strong>:
          invitaciones, roles, API keys, campañas y reportes.
        </p>
      </Panel>

      <Panel className="mb-6" title="Filtros" code="FIL">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Acción">
            <Select
              value={draft.action}
              onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
            >
              <option value="">Todas</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Usuario (lista)">
            <Select
              value={draft.actorUserId}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  actorUserId: e.target.value,
                  email: "",
                }))
              }
            >
              <option value="">Todos</option>
              {filteredActors.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.email}
                  {!a.is_active ? " (inactivo)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Miembros en lista">
            <Select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value as "all" | "active" | "inactive")}
            >
              <option value="all">Activos e inactivos</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
            </Select>
          </Field>

          <Field label="Email (búsqueda)">
            <Input
              value={draft.email}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  email: e.target.value,
                  actorUserId: "",
                }))
              }
              placeholder="parcial@empresa.com"
            />
          </Field>

          <Field label="Desde">
            <Input
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
            />
          </Field>

          <Field label="Hasta">
            <Input
              type="date"
              value={draft.dateTo}
              onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" onClick={() => { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); }}>
            Limpiar
          </Button>
          <Button variant="primary" onClick={() => setApplied({ ...draft })}>
            <Filter className="size-4" /> Aplicar filtros
          </Button>
        </div>
      </Panel>

      <ErrorLine message={error} />

      {loading && !data ? (
        <Loader />
      ) : events.length === 0 ? (
        <Panel>
          <EmptyState
            title="Sin eventos"
            hint="Prueba ampliar el rango de fechas o ejecutar una acción (invitar, campaña, reporte)."
          />
        </Panel>
      ) : (
        <Panel bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Resumen</th>
                  <th className="px-4 py-3 font-medium">Recurso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((ev) => (
                  <tr key={ev.audit_event_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-dim">
                      AUD-{pad(ev.audit_event_id, 4)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted whitespace-nowrap">
                      {fmtDate(ev.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{ev.actor_name || "—"}</div>
                      <div className="font-mono text-[11px] text-muted">
                        {ev.actor_email || "sistema"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={ev.action} tone="accent" />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-sm text-muted">{ev.summary || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-dim">
                      {ev.resource_type ? `${ev.resource_type}:${ev.resource_id ?? "—"}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
