"use client";

import { Copy, Plus, UserCog, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
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
import { canManageMembers, useAuth } from "@/lib/auth";
import { fmtDate, pad } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

type Member = {
  organization_member_id: number;
  user_id: number;
  email: string | null;
  full_name: string | null;
  role_code: string | null;
  role_name: string | null;
  is_active: boolean;
  created_at: string;
};

type Invitation = {
  invitation_id: number;
  organization_id: number;
  email: string | null;
  role_code: string;
  token_prefix: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  is_active: boolean;
  created_at: string;
  invite_token?: string | null;
  invite_url_path?: string | null;
};

type MembersRes = { items: Member[] };

export default function MembersPage() {
  const { user } = useAuth();
  const allowed = canManageMembers(user);
  const { data, error, loading, reload } = useResource(
    () =>
      Promise.all([
        api<MembersRes>("/members"),
        api<Invitation[]>("/invitations", { query: { active_only: false } }),
      ]),
    [],
  );
  const [inviting, setInviting] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!allowed) {
    return (
      <>
        <PageHeader index="07" subtitle="Organización" title="Miembros" />
        <Panel>
          <EmptyState
            title="Acceso restringido"
            hint="Solo el Owner (o admin de plataforma) puede gestionar miembros e invitaciones."
          />
        </Panel>
      </>
    );
  }

  const members = data?.[0]?.items ?? [];
  const invites = data?.[1] ?? [];

  async function setRole(m: Member, role_code: string) {
    setActionError(null);
    try {
      await api(`/members/${m.organization_member_id}/role`, {
        method: "PATCH",
        body: { role_code },
      });
      setNotice(`Rol de ${m.email} → ${role_code}`);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function setActive(m: Member, is_active: boolean) {
    setActionError(null);
    try {
      await api(`/members/${m.organization_member_id}/active`, {
        method: "PATCH",
        body: { is_active },
      });
      setNotice(`${m.email} ${is_active ? "reactivado" : "desactivado"}`);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function revokeInvite(inv: Invitation) {
    if (!confirm(`¿Revocar invitación ${inv.token_prefix}…?`)) return;
    setActionError(null);
    try {
      await api(`/invitations/${inv.invitation_id}/revoke`, { method: "POST" });
      setNotice("Invitación revocada");
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  return (
    <>
      <PageHeader
        index="07"
        subtitle="Organización"
        title="Miembros"
        actions={
          <Button variant="primary" onClick={() => setInviting(true)}>
            <UserPlus className="size-4" /> Invitar
          </Button>
        }
      />

      <Panel className="mb-4">
        <p className="text-sm text-muted">
          Gestiona quién accede a <strong className="text-fg">{user?.organization?.name ?? "tu organización"}</strong>.
          Las invitaciones generan un token de un solo uso.
        </p>
      </Panel>

      <ErrorLine message={error || actionError} />
      {notice && (
        <p className="mb-4 border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-xs text-accent">{notice}</p>
      )}

      {loading && !data ? (
        <Loader />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Equipo</h2>
            {members.length === 0 ? (
              <Panel>
                <EmptyState title="Sin miembros" hint="Crea una invitación para agregar usuarios." />
              </Panel>
            ) : (
              <Panel bodyClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Usuario</th>
                        <th className="px-4 py-3 font-medium">Rol</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                        <th className="px-4 py-3 font-medium">Alta</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {members.map((m) => (
                        <tr key={m.organization_member_id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono text-xs text-dim">
                            MEM-{pad(m.organization_member_id, 3)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{m.full_name || "—"}</div>
                            <div className="font-mono text-[11px] text-muted">{m.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={m.role_code ?? "viewer"}
                              onChange={(e) => setRole(m, e.target.value)}
                              className="max-w-[140px]"
                            >
                              <option value="owner">owner</option>
                              <option value="auditor">auditor</option>
                              <option value="viewer">viewer</option>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Badge value={m.is_active ? "active" : "disabled"} />
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-muted">
                            {fmtDate(m.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              title={m.is_active ? "Desactivar" : "Reactivar"}
                              onClick={() => setActive(m, !m.is_active)}
                              className={cx(
                                "text-muted transition hover:text-critical",
                                !m.is_active && "hover:text-accent",
                              )}
                            >
                              {m.is_active ? <UserMinus className="size-4" /> : <UserCog className="size-4" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Invitaciones</h2>
            {invites.length === 0 ? (
              <Panel>
                <EmptyState title="Sin invitaciones" hint="Pulsa Invitar para generar un link/token." />
              </Panel>
            ) : (
              <Panel bodyClassName="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                        <th className="px-4 py-3 font-medium">ID</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Rol</th>
                        <th className="px-4 py-3 font-medium">Prefijo</th>
                        <th className="px-4 py-3 font-medium">Expira</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                        <th className="px-4 py-3 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {invites.map((inv) => {
                        const status = inv.accepted_at
                          ? "accepted"
                          : inv.revoked_at || !inv.is_active
                            ? "revoked"
                            : "pending";
                        return (
                          <tr key={inv.invitation_id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-3 font-mono text-xs text-dim">
                              INV-{pad(inv.invitation_id, 3)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{inv.email || "cualquiera"}</td>
                            <td className="px-4 py-3">
                              <Badge value={inv.role_code} tone="accent" />
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-accent">{inv.token_prefix}…</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted">
                              {fmtDate(inv.expires_at)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge value={status} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {status === "pending" && (
                                <button
                                  type="button"
                                  className="text-muted transition hover:text-critical"
                                  onClick={() => revokeInvite(inv)}
                                >
                                  Revocar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}
          </section>
        </div>
      )}

      <InviteModal
        open={inviting}
        onClose={() => setInviting(false)}
        onCreated={(token) => {
          setInviting(false);
          setRevealed(token);
          setNotice("Invitación creada. Copia el token ahora.");
          void reload();
        }}
      />

      <RevealTokenModal token={revealed} onClose={() => setRevealed(null)} />
    </>
  );
}

function InviteModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (token: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("auditor");
  const [hours, setHours] = useState(72);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<Invitation>("/invitations", {
        method: "POST",
        body: {
          email: email.trim() || null,
          role_code: role,
          expires_hours: hours,
        },
      });
      if (!res.invite_token) throw new Error("El servidor no devolvió invite_token");
      setEmail("");
      onCreated(res.invite_token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva invitación" code="INV+">
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Email" hint="opcional — si se indica, solo ese correo puede aceptar">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="auditor@empresa.com" />
        </Field>
        <Field label="Rol al aceptar">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="auditor">auditor</option>
            <option value="viewer">viewer</option>
            <option value="owner">owner</option>
          </Select>
        </Field>
        <Field label="Validez (horas)">
          <Input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value) || 72)}
          />
        </Field>
        <ErrorLine message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Generando…" : "Generar token"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevealTokenModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  const tokenValue = token;

  async function copy() {
    try {
      await navigator.clipboard.writeText(tokenValue);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={!!token} onClose={onClose} title="Token de invitación" code="INV!">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Compártelo por un canal seguro. <strong className="text-fg">No se vuelve a mostrar</strong>.
        </p>
        <code className="block break-all border border-line bg-black/40 p-3 font-mono text-xs text-accent">
          {tokenValue}
        </code>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={copy}>
            <Copy className="size-3.5" /> {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Ya lo guardé
          </Button> 
        </div>
      </div>
    </Modal>
  );
}
