"use client";

import { Copy, ScrollText, UserCog, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
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
  is_founding_owner?: boolean;
};

type OwnerRequest = {
  request_id: number;
  status: string;
  reason: string;
  target_user_id: number;
  target_email: string | null;
  target_member_id: number;
  requested_by_email: string | null;
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
        api<{ items: OwnerRequest[] }>("/owner-role-requests").catch(() => ({ items: [] as OwnerRequest[] })),
      ]),
    [],
  );
  const [inviting, setInviting] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<null | { member: Member; role_code: string }>(null);

  if (!allowed) {
    return (
      <>
        <PageHeader index="07" subtitle="Organización" title="Equipo" />
        <Panel>
          <EmptyState
            title="Acceso restringido"
            hint="Solo el responsable de la organización puede gestionar el equipo e invitaciones."
          />
        </Panel>
      </>
    );
  }

  const members = data?.[0]?.items ?? [];
  const invites = data?.[1] ?? [];
  const ownerRequests = data?.[2]?.items ?? [];
  const meId = user?.user_id;
  const iAmFounder = members.some((m) => m.is_founding_owner && m.user_id === meId);

  async function applyRole(
    m: Member,
    role_code: string,
    extra?: { password?: string; request_reason?: string },
  ) {
    setActionError(null);
    const res = await api<{ status?: string; message?: string; request_id?: number }>(
      `/members/${m.organization_member_id}/role`,
      {
        method: "PATCH",
        body: { role_code, ...extra },
      },
    );
    if (res.status === "pending_approval") {
      setNotice(res.message || "Solicitud enviada al owner inicial");
    } else {
      setNotice(`Rol de ${m.email} actualizado a ${role_code === "owner" ? "responsable (owner)" : role_code}`);
    }
    await reload();
  }

  function onRoleSelect(m: Member, role_code: string) {
    if (!role_code || role_code === m.role_code) return;
    // Always confirm sensitive paths via modal when going to owner or from founder demoting
    if (role_code === "owner" || m.role_code === "owner") {
      setRoleModal({ member: m, role_code });
      return;
    }
    void applyRole(m, role_code).catch((e) => setActionError((e as Error).message));
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
    if (!confirm("¿Revocar esta invitación pendiente?")) return;
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
        title="Equipo"
        actions={
          <div className="flex gap-2">
            <a href="/logs">
              <Button type="button">
                <ScrollText className="size-4" /> Historial
              </Button>
            </a>
            <Button variant="primary" onClick={() => setInviting(true)}>
              <UserPlus className="size-4" /> Invitar
            </Button>
          </div>
        }
      />

      <Panel className="mb-4">
        <p className="text-sm text-muted">
          Gestiona quién accede a{" "}
          <strong className="text-fg">{user?.organization?.name ?? "tu organización"}</strong>. Al invitar se genera
          un enlace de un solo uso: la persona abre el link, ve el rol asignado y solo completa sus datos de acceso.
        </p>
      </Panel>

      <ErrorLine message={error || actionError} />
      {notice && (
        <p className="mb-4 border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-xs text-accent">{notice}</p>
      )}

      {ownerRequests.some((r) => r.status === "pending") && (
        <Panel className="mb-6" title="Solicitudes para ser responsable" code="OWN">
          <ul className="space-y-3">
            {ownerRequests
              .filter((r) => r.status === "pending")
              .map((r) => (
                <li key={r.request_id} className="border border-line p-3 text-sm">
                  <p className="text-fg">
                    <strong>{r.requested_by_email}</strong> pide que <strong>{r.target_email}</strong> sea
                    responsable (owner)
                  </p>
                  <p className="mt-1 text-xs text-muted">Motivo: {r.reason}</p>
                  {iAmFounder && (
                    <OwnerRequestActions requestId={r.request_id} onDone={reload} onError={setActionError} />
                  )}
                </li>
              ))}
          </ul>
        </Panel>
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
                              disabled={!!m.is_founding_owner}
                              onChange={(e) => onRoleSelect(m, e.target.value)}
                              className="max-w-[140px]"
                            >
                              <option value="owner">Responsable (owner)</option>
                              <option value="auditor">Auditor</option>
                              <option value="viewer">Solo lectura</option>
                            </Select>
                          </td>
                          <td className="px-4 py-3">
                            <Badge value={m.is_active ? "active" : "disabled"} />
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmtDate(m.created_at)}</td>
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
                <EmptyState title="Sin invitaciones" hint="Pulsa Invitar para generar un enlace." />
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
                        <th className="px-4 py-3 font-medium">Ref.</th>
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
                            <td className="px-4 py-3 font-mono text-xs text-muted">{inv.token_prefix}…</td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmtDate(inv.expires_at)}</td>
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
          setNotice("Invitación creada. Copia y envía el enlace al invitado.");
          void reload();
        }}
      />

      <RevealLinkModal token={revealed} onClose={() => setRevealed(null)} />

      <RoleConfirmModal
        open={!!roleModal}
        member={roleModal?.member ?? null}
        roleCode={roleModal?.role_code ?? "auditor"}
        iAmFounder={iAmFounder}
        onClose={() => setRoleModal(null)}
        onConfirm={async (extra) => {
          if (!roleModal) return;
          try {
            await applyRole(roleModal.member, roleModal.role_code, extra);
            setRoleModal(null);
          } catch (e) {
            setActionError((e as Error).message);
          }
        }}
      />
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
      if (!res.invite_token) throw new Error("No se pudo generar el enlace. Intenta de nuevo.");
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
        <Field label="Email" hint="opcional — si lo indicas, solo ese correo podrá unirse">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="auditor@empresa.com" />
        </Field>
        <Field label="Permiso al unirse" hint="El rol de responsable (owner) no se otorga por invitación">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="auditor">Auditor (hace pruebas)</option>
            <option value="viewer">Solo lectura (ve informes)</option>
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
            {busy ? "Generando…" : "Generar enlace"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevealLinkModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const displayLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`
      : "";

  async function copyLink() {
    if (!displayLink) return;
    try {
      await navigator.clipboard.writeText(displayLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={!!token} onClose={onClose} title="Enlace de invitación" code="INV+">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Envía este enlace al invitado. Al abrirlo verá la organización y el rol, y solo completará sus datos de
          acceso. <strong className="text-fg">No se vuelve a mostrar</strong>.
        </p>
        <div className="border border-accent/40 bg-black/50 p-3">
          <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-dim uppercase">Enlace</p>
          <code className="block break-all font-mono text-xs text-accent select-all">
            {displayLink || "Preparando…"}
          </code>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={copyLink} disabled={!displayLink}>
            <Copy className="size-3.5" /> {copied ? "Copiado" : "Copiar enlace"}
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Listo
          </Button>
        </div>
      </div>
    </Modal>
  );
}


function RoleConfirmModal({
  open,
  member,
  roleCode,
  iAmFounder,
  onClose,
  onConfirm,
}: {
  open: boolean;
  member: Member | null;
  roleCode: string;
  iAmFounder: boolean;
  onClose: () => void;
  onConfirm: (extra: { password?: string; request_reason?: string }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const grantingOwner = roleCode === "owner";
  const maxAttempts = 3;

  const memberKey = `${member?.organization_member_id ?? 0}:${roleCode}`;
  useEffect(() => {
    if (!open) return;
    setAttempts(0);
    setLockedUntil(null);
    setPassword("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening a new confirmation
  }, [open, memberKey]);

  const locked = lockedUntil != null && Date.now() < lockedUntil;
  const remaining = Math.max(0, maxAttempts - attempts);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) {
      setError("Demasiados intentos fallidos. Espera un momento antes de volver a intentar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (grantingOwner && iAmFounder) {
        if (!password) throw new Error("Escribe tu contraseña para confirmar");
        await onConfirm({ password });
      } else if (grantingOwner && !iAmFounder) {
        if (reason.trim().length < 20) throw new Error("Explica el motivo (mínimo 20 caracteres)");
        await onConfirm({ request_reason: reason.trim() });
      } else if (iAmFounder) {
        if (!password) throw new Error("Confirma con tu contraseña");
        await onConfirm({ password });
      } else {
        await onConfirm({});
      }
      setPassword("");
      setReason("");
      setAttempts(0);
    } catch (err) {
      const msg = (err as Error).message || "Error";
      const isBadPassword =
        /contraseña incorrecta|password/i.test(msg) ||
        (err as { status?: number }).status === 403;

      if (isBadPassword && (grantingOwner || member?.role_code === "owner") && iAmFounder) {
        const next = attempts + 1;
        setAttempts(next);
        if (next >= maxAttempts) {
          setLockedUntil(Date.now() + 60_000);
          setError(
            "Has fallado 3 veces. Por seguridad, espera 1 minuto antes de volver a intentarlo. Tu sesión sigue activa.",
          );
        } else {
          setError(
            `Contraseña incorrecta. Te quedan ${maxAttempts - next} intento(s). Tu sesión no se cierra.`,
          );
        }
        setPassword("");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirmar cambio de permiso" code="ROL!">
      <form onSubmit={submit} className="grid gap-4">
        <p className="text-sm text-muted">
          Vas a cambiar el permiso de <strong className="text-fg">{member?.email}</strong> a{" "}
          <strong className="text-fg">
            {roleCode === "owner"
              ? "responsable (owner)"
              : roleCode === "auditor"
                ? "auditor"
                : "solo lectura"}
          </strong>
          .
        </p>
        {grantingOwner && iAmFounder && (
          <p className="text-sm text-high">
            Esa persona podrá gestionar el equipo, invitaciones y la configuración de la organización. Acción sensible:
            confirma con tu contraseña.
          </p>
        )}
        {grantingOwner && !iAmFounder && (
          <Field label="¿Por qué debe ser responsable?">
            <textarea
              className="min-h-[88px] w-full border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica el motivo. El responsable inicial deberá aprobar esta solicitud."
            />
          </Field>
        )}
        {iAmFounder && (grantingOwner || member?.role_code === "owner") && (
          <Field
            label="Tu contraseña (para confirmar)"
            hint={attempts > 0 && !locked ? `Intentos fallidos: ${attempts}/${maxAttempts}` : undefined}
          >
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={locked || busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        <ErrorLine message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy || locked}>
            {busy
              ? "Procesando…"
              : locked
                ? "Bloqueado temporalmente"
                : grantingOwner && !iAmFounder
                  ? "Enviar solicitud"
                  : "Confirmar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}


function OwnerRequestActions({
  requestId,
  onDone,
  onError,
}: {
  requestId: number;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function review(approve: boolean) {
    setBusy(true);
    try {
      if (!password) throw new Error("Contraseña requerida");
      await api(`/owner-role-requests/${requestId}/review`, {
        method: "POST",
        body: { approve, password },
      });
      setPassword("");
      onDone();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Input
        type="password"
        placeholder="Tu contraseña"
        className="max-w-[200px]"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="button" variant="primary" disabled={busy} onClick={() => void review(true)}>
        Aprobar
      </Button>
      <Button type="button" disabled={busy} onClick={() => void review(false)}>
        Rechazar
      </Button>
    </div>
  );
}
