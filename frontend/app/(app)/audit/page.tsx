"use client";

import { Filter, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

const ACTION_OPTIONS = [
  "",
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

export default function AuditPage() {
  const { user } = useAuth();
  const role = user?.membership?.role_code;
  const allowed = canViewAudit(role, user?.is_platform_admin);

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [email, setEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [memberFilter, setMemberFilter] = useState<"all" | "active" | "inactive">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean | undefined> = {
        limit: 100,
      };
      if (action) query.action = action;
      if (actorUserId) query.actor_user_id = Number(actorUserId);
      if (email.trim()) query.email = email.trim();
      if (dateFrom) query.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query.date_to = end.toISOString();
      }

      const [ev, ac] = await Promise.all([
        api<AuditEvent[]>("/audit-events", { query }),
        api<Actor[]>("/audit-events/actors"),
      ]);
      setEvents(ev);
      setActors(ac);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [action, actorUserId, email, dateFrom, dateTo]);

  useEffect(() => {
    if (allowed) void load();
    else setLoading(false);
  }, [allowed, load]);

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

  const filteredActors = actors.filter((a) => {
    if (memberFilter === "active") return a.is_active;
    if (memberFilter === "inactive") return !a.is_active;
    return true;
  });

  return (
    <>
      <PageHeader
        index="08"
        subtitle="Seguridad"
        title="Auditoría"
        actions={
          <Button variant="primary" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Actualizar
          </Button>
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
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Todas</option>
              {ACTION_OPTIONS.filter(Boolean).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Usuario (lista)">
            <Select
              value={actorUserId}
              onChange={(e) => {
                setActorUserId(e.target.value);
                setEmail("");
              }}
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
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setActorUserId("");
              }}
              placeholder="parcial@empresa.com"
            />
          </Field>

          <Field label="Desde">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>

          <Field label="Hasta">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => void load()}>
            <Filter className="size-4" /> Aplicar filtros
          </Button>
        </div>
      </Panel>

      <ErrorLine message={error} />

      {loading ? (
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
                      <div className="font-mono text-[11px] text-muted">{ev.actor_email || "sistema"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={ev.action} tone="accent" />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted max-w-xs">
                      {ev.summary || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-dim">
                      {ev.resource_type
                        ? `${ev.resource_type}:${ev.resource_id ?? "—"}`
                        : "—"}
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
