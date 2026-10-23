"use client";

import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
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
  cx,
} from "@/components/ui";
import { api } from "@/lib/api";
import { canWrite, useAuth } from "@/lib/auth";
import { fmtDate, pad } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

type ApiKeyItem = {
  api_key_id: number;
  organization_id: number;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  created_by: number;
  last_used_at: string | null;
  created_at: string;
};

type ApiKeyCreated = ApiKeyItem & { api_key: string };

type ListRes = { items: ApiKeyItem[]; total: number };

export default function ApiKeysPage() {
  const { user } = useAuth();
  const writable = canWrite(user);
  const { data, error, loading, reload } = useResource(() =>
    api<ListRes>("/api-keys", { query: { active_only: false } }),
  );
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function revoke(k: ApiKeyItem) {
    if (!confirm(`¿Revocar la clave "${k.name}" (${k.key_prefix}…)? Dejará de autenticar de inmediato.`)) return;
    setActionError(null);
    try {
      await api(`/api-keys/${k.api_key_id}/revoke`, { method: "POST" });
      setNotice(`Clave ${k.key_prefix}… revocada`);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        index="06"
        subtitle="Integraciones"
        title="API Keys"
        actions={
          writable && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nueva clave
            </Button>
          )
        }
      />

      <Panel className="mb-4 border-line">
        <p className="text-sm text-muted">
          Las API Keys permiten que <strong className="text-fg">sistemas externos</strong> (CI/CD, scripts,
          otros backends) llamen a MK Service sin login interactivo. El secreto se muestra{" "}
          <strong className="text-fg">solo una vez</strong> al crear; después solo verás el prefijo.
          Usa el header <code className="font-mono text-xs text-accent">X-API-Key</code>.
        </p>
      </Panel>

      <div className="space-y-4">
        <ErrorLine message={error || actionError} />
        {notice && (
          <p className="border border-accent/30 bg-accent/5 px-4 py-2 font-mono text-xs text-accent">{notice}</p>
        )}
        {loading && !data ? (
          <Loader />
        ) : items.length === 0 ? (
          <Panel>
            <EmptyState
              title="Sin API Keys"
              hint={writable ? "Crea una clave para automatizar auditorías desde CI o scripts." : "Solo lectura."}
            />
          </Panel>
        ) : (
          <Panel bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line font-mono text-[10px] tracking-[0.14em] text-dim uppercase">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Prefijo</th>
                    <th className="px-4 py-3 font-medium">Scopes</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Último uso</th>
                    <th className="px-4 py-3 font-medium">Creada</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((k) => (
                    <tr key={k.api_key_id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-xs text-dim">KEY-{pad(k.api_key_id, 3)}</td>
                      <td className="px-4 py-3">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-accent">{k.key_prefix}…</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <Badge key={s} value={s} tone="muted" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={k.is_active ? "active" : "revoked"} />
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">
                        {k.last_used_at ? fmtDate(k.last_used_at) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted">{fmtDate(k.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {writable && k.is_active && (
                          <button
                            type="button"
                            onClick={() => revoke(k)}
                            className="text-muted transition hover:text-critical"
                            title="Revocar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      <CreateKeyModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(secret) => {
          setCreating(false);
          setRevealed(secret);
          setNotice("Clave creada. Cópiala ahora; no se volverá a mostrar.");
          void reload();
        }}
        onError={setActionError}
      />

      <RevealSecretModal secret={revealed} onClose={() => setRevealed(null)} />
    </>
  );
}

function CreateKeyModal({
  open,
  onClose,
  onCreated,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (secret: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<ApiKeyCreated>("/api-keys", {
        method: "POST",
        body: { name, scopes: ["read", "write"] },
      });
      setName("");
      onCreated(res.api_key);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva API Key" code="KEY+">
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Nombre" hint="ej. CI GitHub Actions, script nightly">
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="pipeline-prod" />
        </Field>
        <p className="text-xs text-muted">
          Scopes por defecto: <span className="font-mono text-fg">read</span> +{" "}
          <span className="font-mono text-fg">write</span> (mismo alcance que owner/auditor vía X-API-Key).
        </p>
        <ErrorLine message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Creando…" : "Crear clave"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevealSecretModal({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!secret) return null;
  const secretValue = secret;

  async function copy() {
    try {
      await navigator.clipboard.writeText(secretValue);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Modal open={!!secret} onClose={onClose} title="Secreto de la API Key" code="KEY!">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Guárdala en un gestor de secretos. <strong className="text-fg">No se volverá a mostrar</strong>.
        </p>
        <code className="block break-all border border-line bg-black/40 p-3 font-mono text-xs text-accent">
          {secret}
        </code>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={copy}>
            <Copy className="size-3.5" /> {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            Ya la guardé
          </Button>
        </div>
      </div>
    </Modal>
  );
}