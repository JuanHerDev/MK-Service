"use client";

import { Download, Filter, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorLine,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  TableSkeleton,
} from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ACTION_LABEL,
  RESOURCE_LABEL,
  fmtDate,
  labelAction,
  labelResource,
  pad,
} from "@/lib/format";
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
  q: string;
  action: string;
  resourceType: string;
  actorUserId: string;
  email: string;
  dateFrom: string;
  dateTo: string;
};

const ACTION_OPTIONS = Object.keys(ACTION_LABEL);

const EMPTY_FILTERS: Filters = {
  q: "",
  action: "",
  resourceType: "",
  actorUserId: "",
  email: "",
  dateFrom: "",
  dateTo: "",
};

function canViewLogs(role: string | undefined, isAdmin: boolean | undefined) {
  if (isAdmin) return true;
  return role === "owner" || role === "auditor" || role === "admin";
}

/** Resume amigable: si el backend mandó inglés técnico, suavizamos. */
function friendlySummary(e: AuditEvent): string {
  const s = (e.summary || "").trim();
  if (!s) return labelAction(e.action);
  // Common patterns
  if (/report\s+\w+\/\w+\s+for campaign/i.test(s)) {
    return `Se generó un informe de la auditoría #${e.resource_id ?? "?"}`;
  }
  if (/platform admin patched membership/i.test(s)) {
    return "Un administrador de la plataforma cambió un miembro del equipo";
  }
  return s;
}

export default function LogsPage() {
  const { user } = useAuth();
  const role = user?.membership?.role_code;
  const allowed = canViewLogs(role, user?.is_platform_admin);

  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [memberFilter, setMemberFilter] = useState<"all" | "active" | "inactive">("all");

  const { data, error, loading, reload } = useResource(async () => {
    if (!allowed) return { events: [] as AuditEvent[], actors: [] as Actor[] };
    const query: Record<string, string | number | boolean | undefined> = { limit: 150 };
    if (applied.q.trim()) query.q = applied.q.trim();
    if (applied.action) query.action = applied.action;
    if (applied.resourceType.trim()) query.resource_type = applied.resourceType.trim();
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
  }, [
    allowed,
    applied.q,
    applied.action,
    applied.resourceType,
    applied.actorUserId,
    applied.email,
    applied.dateFrom,
    applied.dateTo,
  ]);

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
      "fecha",
      "quien",
      "que_paso",
      "detalle",
      "tipo",
      "referencia",
    ];
    const rows = events.map((e) =>
      [
        e.audit_event_id,
        e.created_at,
        e.actor_email ?? "",
        labelAction(e.action),
        friendlySummary(e).replaceAll('"', '""'),
        labelResource(e.resource_type),
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
    a.download = `actividad-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!allowed) {
    return (
      <>
        <PageHeader index="08" subtitle="Seguridad" title="Registro de actividad" />
        <Panel>
          <EmptyState
            title="No puedes ver esta sección"
            hint="Solo quienes administran el equipo o revisan auditorías pueden ver el historial."
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
        title="Registro de actividad"
        actions={
          <div className="flex gap-2">
            <Button type="button" onClick={exportCsv} disabled={!events.length}>
              <Download className="size-4" /> Descargar lista
            </Button>
            <Button variant="primary" onClick={() => void reload()}>
              <RefreshCw className="size-4" /> Actualizar
            </Button>
          </div>
        }
      />

      <Panel className="mb-4">
        <p className="text-sm text-muted">
          Aquí ves <strong className="text-fg">qué ha pasado</strong> en{" "}
          <strong className="text-fg">{user?.organization?.name ?? "tu organización"}</strong>
          : invitaciones, cambios de permisos, auditorías e informes. No hace falta saber de sistemas
          para leerlo.
        </p>
      </Panel>

      <Panel className="mb-6" title="Buscar en el historial" code="FIL">
        <div className="mb-4">
          <Field label="Escribe lo que buscas">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
              <Input
                className="pl-10"
                placeholder="Ej: invitación, informe, auditoría…"
                value={draft.q}
                onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setApplied({ ...draft });
                }}
              />
            </div>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Qué ocurrió">
            <Select value={draft.action} onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}>
              <option value="">Cualquier evento</option>
              {ACTION_OPTIONS.map((code) => (
                <option key={code} value={code}>
                  {ACTION_LABEL[code]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sobre qué">
            <Select
              value={draft.resourceType}
              onChange={(e) => setDraft((d) => ({ ...d, resourceType: e.target.value }))}
            >
              <option value="">Cualquier cosa</option>
              {Object.entries(RESOURCE_LABEL).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Personas del equipo">
            <Select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value as typeof memberFilter)}
            >
              <option value="all">Todas</option>
              <option value="active">Solo activas</option>
              <option value="inactive">Solo desactivadas</option>
            </Select>
          </Field>
          <Field label="Quién lo hizo">
            <Select
              value={draft.actorUserId}
              onChange={(e) => setDraft((d) => ({ ...d, actorUserId: e.target.value, email: "" }))}
            >
              <option value="">Cualquier persona</option>
              {filteredActors.map((a) => (
                <option key={a.user_id} value={a.user_id}>
                  {a.full_name ? `${a.full_name} (${a.email})` : a.email}
                  {!a.is_active ? " — desactivado" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Correo (si no está en la lista)">
            <Input
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value, actorUserId: "" }))}
              placeholder="nombre@empresa.com"
            />
          </Field>
          <Field label="Desde el día">
            <Input
              type="date"
              value={draft.dateFrom}
              onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
            />
          </Field>
          <Field label="Hasta el día">
            <Input
              type="date"
              value={draft.dateTo}
              onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" type="button" onClick={() => setApplied({ ...draft })}>
            <Filter className="size-4" /> Buscar
          </Button>
          <Button
            type="button"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setApplied(EMPTY_FILTERS);
              setMemberFilter("all");
            }}
          >
            Quitar filtros
          </Button>
        </div>
      </Panel>

      <ErrorLine message={error} />

      <Panel title={`Historial (${events.length})`} code="LOG">
        {loading && !data ? (
          <TableSkeleton rows={6} cols={5} />
        ) : events.length === 0 ? (
          <EmptyState
            title="No hay actividad con estos filtros"
            hint="Prueba quitar filtros o genera actividad (invitar a alguien, lanzar una auditoría, crear un informe)."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wider text-dim">
                  <th className="px-3 py-2">N.º</th>
                  <th className="px-3 py-2">Cuándo</th>
                  <th className="px-3 py-2">Quién</th>
                  <th className="px-3 py-2">Qué pasó</th>
                  <th className="px-3 py-2">Detalle</th>
                  <th className="px-3 py-2">Sobre qué</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.audit_event_id} className="border-b border-line/60 hover:bg-panel/50">
                    <td className="px-3 py-2.5 font-mono text-xs text-dim">#{pad(e.audit_event_id, 4)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">{fmtDate(e.created_at)}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs text-fg">{e.actor_name || e.actor_email || "Sistema"}</p>
                      {e.actor_name && e.actor_email && (
                        <p className="text-[10px] text-dim">{e.actor_email}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block max-w-[220px] rounded-sm border border-line bg-ink px-2 py-1 text-xs text-fg">
                        {labelAction(e.action)}
                      </span>
                    </td>
                    <td className="max-w-[280px] px-3 py-2.5 text-xs text-muted">{friendlySummary(e)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">
                      {labelResource(e.resource_type)}
                      {e.resource_id != null ? (
                        <span className="text-dim"> · ref. {e.resource_id}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
