"use client";

import { Globe, Plus, Trash2, Building2 } from "lucide-react";
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
  Textarea,
  cx,
} from "@/components/ui";
import { api } from "@/lib/api";
import { canWrite, useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, fmtBytes, fmtDate, pad } from "@/lib/format";
import type { AttackDocument, Paginated } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

const SCOPES = ["", "global", "organization"] as const;

export default function DocumentsPage() {
  const { user } = useAuth();
  const writable = canWrite(user);
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("");
  const { data, error, loading, reload } = useResource(
    () => api<Paginated<AttackDocument>>("/attack-documents", { query: { per_page: 100, scope: scope || undefined } }),
    [scope],
  );
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function remove(d: AttackDocument) {
    if (!confirm(`¿Desactivar el payload "${d.name}"?`)) return;
    setActionError(null);
    try {
      await api(`/attack-documents/${d.attack_document_id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  const items = data?.items ?? [];

  return (
    <>
      <PageHeader
        index="04"
        subtitle="Arsenal"
        title="Payloads"
        actions={
          writable && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nuevo payload
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-px border border-line bg-line">
        {SCOPES.map((s) => (
          <button
            key={s || "all"}
            onClick={() => setScope(s)}
            className={cx(
              "flex-1 px-4 py-3 font-mono text-[10px] tracking-[0.14em] uppercase transition",
              scope === s ? "bg-white/[0.05] text-accent" : "bg-ink text-muted hover:text-fg",
            )}
          >
            {s === "" ? "Todos" : s === "global" ? "Globales" : "Organización"}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <ErrorLine message={error || actionError} />
        {loading && !data ? (
          <Loader />
        ) : items.length === 0 ? (
          <Panel>
            <EmptyState title="Arsenal vacío" hint="Los payloads globales se cargan con el seed del backend." />
          </Panel>
        ) : (
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
            {items.map((d, i) => (
              <article
                key={d.attack_document_id}
                className="group relative flex animate-fade-up flex-col gap-4 bg-ink p-5 transition hover:bg-panel"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] text-dim">PLD-{pad(d.attack_document_id, 3)}</span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                    {d.scope === "global" ? <Globe className="size-3" /> : <Building2 className="size-3" />}
                    {d.scope}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg tracking-tight">{d.name}</h3>
                  {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{d.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge value={CATEGORY_LABEL[d.category] ?? d.category} tone="accent" />
                  {d.technique && <Badge value={d.technique} tone="muted" />}
                </div>
                <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4 font-mono text-[10px]">
                  <div>
                    <dt className="text-dim uppercase">Archivo</dt>
                    <dd className="truncate" title={d.file_name}>
                      {d.file_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-dim uppercase">Tamaño</dt>
                    <dd>{fmtBytes(d.size_bytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-dim uppercase">Alta</dt>
                    <dd>{fmtDate(d.created_at)}</dd>
                  </div>
                </dl>
                {writable && d.scope === "organization" && (
                  <button
                    onClick={() => remove(d)}
                    className="absolute right-4 bottom-4 hidden text-muted transition group-hover:block hover:text-critical"
                    aria-label="Desactivar payload"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <CreateDocumentModal open={creating} onClose={() => setCreating(false)} onCreated={reload} isAdmin={!!user?.is_platform_admin} />
    </>
  );
}

function CreateDocumentModal({
  open,
  onClose,
  onCreated,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isAdmin: boolean;
}) {
  const empty = {
    name: "",
    description: "",
    technique: "",
    category_code: "prompt_injection_direct",
    scope: "organization",
    file_name: "",
    storage_path: "",
    doc_version: "",
  };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/attack-documents", {
        method: "POST",
        body: {
          ...form,
          description: form.description || null,
          technique: form.technique || null,
          doc_version: form.doc_version || null,
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
    <Modal open={open} onClose={onClose} title="Registrar payload" code="PLD+" wide>
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre">
            <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Descripción" hint="opcional">
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
        <Field label="Categoría">
          <Select value={form.category_code} onChange={(e) => set("category_code", e.target.value)}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Técnica" hint="opcional">
          <Input value={form.technique} onChange={(e) => set("technique", e.target.value)} placeholder="instruction_override" />
        </Field>
        <Field label="Nombre de archivo">
          <Input required value={form.file_name} onChange={(e) => set("file_name", e.target.value)} placeholder="payload_01.txt" />
        </Field>
        <Field label="Ruta de almacenamiento">
          <Input
            required
            value={form.storage_path}
            onChange={(e) => set("storage_path", e.target.value)}
            placeholder="attack_docs/org/payload_01.txt"
          />
        </Field>
        <Field label="Versión" hint="opcional">
          <Input value={form.doc_version} onChange={(e) => set("doc_version", e.target.value)} placeholder="1.0" />
        </Field>
        {isAdmin && (
          <Field label="Alcance">
            <Select value={form.scope} onChange={(e) => set("scope", e.target.value)}>
              <option value="organization">Organización</option>
              <option value="global">Global</option>
            </Select>
          </Field>
        )}
        <div className="space-y-4 sm:col-span-2">
          <ErrorLine message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Guardando…" : "Registrar"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
