"use client";

import { Building2, RefreshCw, Search, Shield } from "lucide-react";
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
  Skeleton,
  TableSkeleton,
} from "@/components/ui";
import { api } from "@/lib/api";
import { isPlatformAdmin, useAuth } from "@/lib/auth";
import { fmtDate, pad } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

type AdminOrg = {
  organization_id: number;
  name: string;
  default_language: string | null;
  is_active: boolean;
  member_count: number;
  created_at: string | null;
};

type AdminMember = {
  organization_member_id: number;
  user_id: number;
  email: string;
  full_name: string | null;
  role_code: string;
  role_name: string;
  is_active: boolean;
  is_platform_admin: boolean;
};

export default function AdminPage() {
  const { user } = useAuth();
  const allowed = isPlatformAdmin(user);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const orgsRes = useResource(async () => {
    if (!allowed) return [] as AdminOrg[];
    return api<AdminOrg[]>("/admin/organizations", {
      query: appliedQ ? { q: appliedQ } : {},
    });
  }, [allowed, appliedQ]);

  const membersRes = useResource(async () => {
    if (!allowed || selectedOrgId == null) return [] as AdminMember[];
    return api<AdminMember[]>(`/admin/organizations/${selectedOrgId}/members`);
  }, [allowed, selectedOrgId]);

  const selectedOrg = useMemo(
    () => orgsRes.data?.find((o) => o.organization_id === selectedOrgId) ?? null,
    [orgsRes.data, selectedOrgId],
  );

  async function patchMember(member: AdminMember, body: { role_code?: string; is_active?: boolean }) {
    if (selectedOrgId == null) return;
    setBusyId(member.organization_member_id);
    setActionError(null);
    try {
      await api(`/admin/organizations/${selectedOrgId}/members/${member.organization_member_id}`, {
        method: "PATCH",
        body,
      });
      await membersRes.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo actualizar el miembro");
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <>
        <PageHeader index="09" subtitle="Plataforma" title="Admin" />
        <Panel>
          <EmptyState
            title="Solo Admin de plataforma"
            hint="Necesitas is_platform_admin. Usa scripts/promote_platform_admin.py en producción."
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        index="09"
        subtitle="Plataforma"
        title="Administración"
        actions={
          <Button variant="primary" onClick={() => void orgsRes.reload()}>
            <RefreshCw className="size-4" /> Actualizar
          </Button>
        }
      />

      <Panel className="mb-4">
        <p className="text-sm text-muted">
          Vista de <strong className="text-fg">Admin de plataforma</strong>: organizaciones y miembros. No sustituye al
          Owner dentro de cada tenant; sirve para soporte y control global.
        </p>
      </Panel>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-dim" />
          <Input
            className="pl-10"
            placeholder="Buscar organización…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAppliedQ(q.trim())}
          />
        </div>
        <Button variant="primary" onClick={() => setAppliedQ(q.trim())}>
          Buscar
        </Button>
      </div>

      <ErrorLine message={orgsRes.error || actionError} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Organizaciones (${orgsRes.data?.length ?? 0})`} code="ORG">
          {orgsRes.loading && !orgsRes.data ? (
            <TableSkeleton rows={5} cols={3} />
          ) : !orgsRes.data?.length ? (
            <EmptyState title="Sin organizaciones" />
          ) : (
            <ul className="divide-y divide-line">
              {orgsRes.data.map((o) => (
                <li key={o.organization_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrgId(o.organization_id)}
                    className={`flex w-full items-start gap-3 px-2 py-3 text-left transition hover:bg-panel ${
                      selectedOrgId === o.organization_id ? "bg-panel ring-1 ring-accent/40" : ""
                    }`}
                  >
                    <Building2 className="mt-0.5 size-4 shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{o.name}</p>
                      <p className="font-mono text-[10px] text-dim">
                        #{pad(o.organization_id, 3)} · {o.member_count} miembros
                        {o.created_at ? ` · ${fmtDate(o.created_at)}` : ""}
                      </p>
                    </div>
                    <Badge value={o.is_active ? "active" : "inactive"} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={selectedOrg ? `Miembros · ${selectedOrg.name}` : "Miembros"}
          code="MEM"
        >
          {selectedOrgId == null ? (
            <EmptyState title="Selecciona una organización" hint="Lista a la izquierda." />
          ) : membersRes.loading && !membersRes.data ? (
            <TableSkeleton rows={4} cols={3} />
          ) : (
            <div className="space-y-3">
              <ErrorLine message={membersRes.error} />
              {(membersRes.data ?? []).map((m) => (
                <div
                  key={m.organization_member_id}
                  className="flex flex-col gap-2 border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">{m.email}</p>
                    <p className="text-[11px] text-dim">
                      {m.full_name || "—"} · uid {m.user_id}
                      {m.is_platform_admin ? " · Admin plataforma" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      className="w-[120px]"
                      value={m.role_code}
                      disabled={busyId === m.organization_member_id || m.role_code === "admin"}
                      onChange={(e) => void patchMember(m, { role_code: e.target.value })}
                    >
                      <option value="owner">owner</option>
                      <option value="auditor">auditor</option>
                      <option value="viewer">viewer</option>
                      {m.role_code === "admin" && <option value="admin">admin</option>}
                    </Select>
                    <Button
                      size="sm"
                      disabled={busyId === m.organization_member_id}
                      onClick={() => void patchMember(m, { is_active: !m.is_active })}
                    >
                      {m.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Badge value={m.is_active ? "active" : "inactive"} />
                  </div>
                </div>
              ))}
              {!membersRes.data?.length && <EmptyState title="Sin miembros" />}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
