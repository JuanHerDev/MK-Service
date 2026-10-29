"use client";

import { Plus, RefreshCw, Trash2, Zap } from "lucide-react";
import { useState } from "react";
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
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/api";
import { canWrite, useAuth } from "@/lib/auth";
import { fmtRelative, pad } from "@/lib/format";
import type { Paginated, Target, TargetCreate } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

export default function TargetsPage() {
  const { user } = useAuth();
  const writable = canWrite(user);
  const [showInactive, setShowInactive] = useState(false);
  const { data, error, loading, reload } = useResource(
    () => api<Paginated<Target>>("/targets", { query: { per_page: 100, active_only: !showInactive } }),
    [showInactive],
  );
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        index="01"
        subtitle="Superficie de ataque"
        title="Targets"
        actions={
          <>
            <Button size="md" onClick={() => setShowInactive((s) => !s)}>
              {showInactive ? "Solo activos" : "Ver inactivos"}
            </Button>
            {writable && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Nuevo target
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        <ErrorLine message={error || actionError} />
        {loading && !data ? (
          <Loader />
        ) : items.length === 0 ? (
          <Panel>
            <EmptyState
              title="Sin targets"
              hint="Registra el endpoint de chat del sistema RAG que quieres auditar."
              action={
                writable && (
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus className="size-4" /> Registrar target
                  </Button>
                )
              }
            />
          </Panel>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((t, i) => (
              <article
                key={t.target_id}
                className="hud group flex animate-fade-up flex-col border border-line bg-panel/70 backdrop-blur-sm transition hover:border-line-strong"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <header className="flex items-start justify-between gap-3 border-b border-line p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] text-dim">TGT-{pad(t.target_id, 3)}</p>
                    <h3 className="truncate text-lg tracking-tight">{t.name}</h3>
                  </div>
                  <Badge value={t.connection_status} pulse={t.connection_status === "active"} />
                </header>
                <div className="flex-1 space-y-3 p-4 text-sm">
                  {t.description && <p className="line-clamp-2 text-muted">{t.description}</p>}
                  <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 font-mono text-[11px]">
                    <dt className="text-dim uppercase">Modo</dt>
                    <dd>{t.mode}</dd>
                    <dt className="text-dim uppercase">Chat</dt>
                    <dd className="truncate" title={t.chat_endpoint}>
                      {t.chat_endpoint}
                    </dd>
                    {t.upload_endpoint && (
                      <>
                        <dt className="text-dim uppercase">Upload</dt>
                        <dd className="truncate">{t.upload_endpoint}</dd>
                      </>
                    )}
                    <dt className="text-dim uppercase">Auth</dt>
                    <dd>{t.auth_type}</dd>
                    <dt className="text-dim uppercase">Último test</dt>
                    <dd>{fmtRelative(t.last_test_at)}</dd>
                  </dl>
                  {t.last_test_message && (
                    <p
                      className={`border-l-2 px-2 py-1 font-mono text-[11px] ${t.last_test_ok ? "border-ok text-ok/80" : "border-critical text-critical/80"}`}
                    >
                      {t.last_test_message}
                    </p>
                  )}
                </div>
                {writable && (
                  <footer className="flex gap-2 border-t border-line p-3">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={busyId === t.target_id}
                      onClick={() => act(t.target_id, () => api(`/targets/${t.target_id}/test`, { method: "POST" }))}
                    >
                      {busyId === t.target_id ? <RefreshCw className="size-3 animate-spin" /> : <Zap className="size-3" />}
                      Probar conexión
                    </Button>
                    {t.is_active && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === t.target_id}
                        onClick={() => {
                          if (confirm(`¿Desactivar el target "${t.name}"?`))
                            act(t.target_id, () => api(`/targets/${t.target_id}`, { method: "DELETE" }));
                        }}
                        aria-label="Eliminar target"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </footer>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <CreateTargetModal open={creating} onClose={() => setCreating(false)} onCreated={reload} />
    </>
  );
}

function CreateTargetModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const empty: TargetCreate = {
    name: "",
    description: "",
    mode: "basic",
    chat_endpoint: "",
    upload_endpoint: "",
    auth_type: "bearer",
    auth_value: "",
    rate_limit_rpm: null,
    model: "lab-chat",
  };
  const [form, setForm] = useState<TargetCreate>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof TargetCreate>(k: K, v: TargetCreate[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const model = (form.model || "").trim();
      const headers_extra = model ? { model } : null;
      await api("/targets", {
        method: "POST",
        body: {
          name: form.name,
          description: form.description || null,
          mode: form.mode,
          chat_endpoint: form.chat_endpoint,
          upload_endpoint: form.mode === "complete" ? form.upload_endpoint || null : null,
          auth_type: form.auth_type,
          auth_value: form.auth_type === "none" ? null : form.auth_value || null,
          rate_limit_rpm: form.rate_limit_rpm || null,
          headers_extra,
        },
      });
      setForm(empty);
      onClose();
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar target" code="TGT+" wide>
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre">
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Chatbot soporte" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Descripción" hint="opcional">
            <Textarea value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <span className="label">Modo de conexión</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox checked={form.mode === "basic"} onChange={() => set("mode", "basic")} label="Basic · solo chat" />
            <Checkbox
              checked={form.mode === "complete"}
              onChange={() => set("mode", "complete")}
              label="Complete · chat + documentos"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Field label="Chat endpoint">
            <Input
              required
              type="url"
              value={form.chat_endpoint}
              onChange={(e) => set("chat_endpoint", e.target.value)}
              placeholder="https://mk-service-lab.onrender.com/v1/chat/completions"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Modelo (OpenAI-compatible)"
            hint="Se envía como body.model en cada probe (lab-chat, llama-3.1-8b-instant, …)"
          >
            <Input
              value={form.model ?? ""}
              onChange={(e) => set("model", e.target.value)}
              placeholder="lab-chat"
            />
          </Field>
        </div>
        {form.mode === "complete" && (
          <div className="sm:col-span-2">
            <Field label="Upload endpoint">
              <Input
                required
                type="url"
                value={form.upload_endpoint ?? ""}
                onChange={(e) => set("upload_endpoint", e.target.value)}
                placeholder="https://api.ejemplo.com/upload"
              />
            </Field>
          </div>
        )}
        <Field label="Autenticación">
          <Select value={form.auth_type} onChange={(e) => set("auth_type", e.target.value as TargetCreate["auth_type"])}>
            <option value="bearer">Bearer token</option>
            <option value="api_key">API key</option>
            <option value="none">Ninguna</option>
          </Select>
        </Field>
        <Field label="Rate limit" hint="req/min">
          <Input
            type="number"
            min={1}
            value={form.rate_limit_rpm ?? ""}
            onChange={(e) => set("rate_limit_rpm", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        {form.auth_type !== "none" && (
          <div className="sm:col-span-2">
            <Field label="Credencial del target">
              <Input
                required
                type="password"
                autoComplete="off"
                value={form.auth_value ?? ""}
                onChange={(e) => set("auth_value", e.target.value)}
              />
            </Field>
          </div>
        )}
        <div className="space-y-4 sm:col-span-2">
          <ErrorLine message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Conectando…" : "Crear y probar"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
