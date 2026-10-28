"use client";

import { Building2, Eye, Globe, Plus, Trash2 } from "lucide-react";
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
import { api, uploadForm } from "@/lib/api";
import { canManageOrgDocuments, isPlatformAdmin, useAuth } from "@/lib/auth";
import { CATEGORY_LABEL, fmtBytes, fmtDate, pad } from "@/lib/format";
import type { AttackDocument, Paginated } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

const SCOPES = ["", "global", "organization"] as const;

export default function DocumentsPage() {
  const { user } = useAuth();
  const canEditOrg = canManageOrgDocuments(user);
  const admin = isPlatformAdmin(user);
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("");
  const { data, error, loading, reload } = useResource(
    () => api<Paginated<AttackDocument>>("/attack-documents", { query: { per_page: 100, scope: scope || undefined } }),
    [scope],
  );
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);

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
          canEditOrg && (
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

      <Panel className="mb-4">
        <p className="text-sm text-muted">
          Owner y Auditor ven payloads <strong className="text-fg">globales</strong> y de su{" "}
          <strong className="text-fg">organización</strong>. Solo pueden crear/borrar los de organización.
          {admin ? " Como platform admin también gestionas los globales." : ""} Cada archivo debe incluir al menos un
          token <code className="text-accent">MK_CANARY_...</code> para hallazgos confirmados.
        </p>
      </Panel>

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
                <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setPreviewId(d.attack_document_id)}
                    className="text-muted transition hover:text-accent"
                    aria-label="Ver contenido"
                    title="Ver contenido"
                  >
                    <Eye className="size-4" />
                  </button>
                  {canEditOrg && (d.scope === "organization" || admin) && (
                    <button
                      type="button"
                      onClick={() => remove(d)}
                      className="text-muted transition hover:text-critical"
                      aria-label="Desactivar payload"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <CreateDocumentModal open={creating} onClose={() => setCreating(false)} onCreated={reload} isAdmin={admin} />
      <PreviewPayloadModal documentId={previewId} onClose={() => setPreviewId(null)} />
    </>
  );
}

function PreviewPayloadModal({ documentId, onClose }: { documentId: number | null; onClose: () => void }) {
  const { data, error, loading } = useResource(
    async () => {
      if (!documentId) return null;
      return api<{
        name: string;
        content_text: string;
        canaries: string[];
        file_name: string;
        editable: boolean;
      }>(`/attack-documents/${documentId}/content`);
    },
    [documentId],
  );

  return (
    <Modal open={!!documentId} onClose={onClose} title={data?.name ?? "Payload"} code="VIEW" wide>
      {loading && <Loader />}
      <ErrorLine message={error} />
      {data && (
        <div className="space-y-4">
          <p className="font-mono text-[11px] text-muted">{data.file_name}</p>
          {data.canaries.length > 0 ? (
            <p className="text-sm text-ok">
              Canaries detectados:{" "}
              {data.canaries.map((c) => (
                <code key={c} className="mr-2 text-accent">
                  {c}
                </code>
              ))}
            </p>
          ) : (
            <p className="text-sm text-critical">
              Sin token MK_CANARY_* — este payload no podrá generar hallazgos confirmados.
            </p>
          )}
          <pre className="max-h-[50vh] overflow-auto border border-line bg-black/40 p-4 font-mono text-xs whitespace-pre-wrap text-fg">
            {data.content_text}
          </pre>
        </div>
      )}
    </Modal>
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [technique, setTechnique] = useState("");
  const [category, setCategory] = useState("prompt_injection_indirect");
  const [scope, setScope] = useState("organization");
  const [file, setFile] = useState<File | null>(null);
  const [contentText, setContentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", name);
        fd.append("category_code", category);
        fd.append("scope", scope);
        if (description) fd.append("description", description);
        if (technique) fd.append("technique", technique);
        fd.append("doc_version", "1.0");
        await uploadForm("/attack-documents/upload", fd);
      } else if (contentText.trim()) {
        const fileName = name.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 40) + ".txt";
        await api("/attack-documents", {
          method: "POST",
          body: {
            name,
            description: description || null,
            technique: technique || null,
            category_code: category,
            scope,
            file_name: fileName,
            content_text: contentText,
            doc_version: "1.0",
          },
        });
      } else {
        setError("Sube un archivo o escribe el contenido del payload");
        setBusy(false);
        return;
      }
      setName("");
      setDescription("");
      setTechnique("");
      setCategory("prompt_injection_indirect");
      setScope("organization");
      setFile(null);
      setContentText("");
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
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Canary leakage org" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Descripción" hint="opcional">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <Field label="Categoría">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Técnica" hint="opcional">
          <Input value={technique} onChange={(e) => setTechnique(e.target.value)} placeholder="canary_leak" />
        </Field>
        {isAdmin && (
          <Field label="Alcance">
            <Select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="organization">Organización</option>
              <option value="global">Global</option>
            </Select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Archivo" hint="txt / md / json — máx. 2 MiB (recomendado)">
            <input
              type="file"
              accept=".txt,.md,.json,.csv,text/plain"
              className="block w-full font-mono text-xs text-muted file:mr-3 file:border file:border-line-strong file:bg-ink file:px-3 file:py-2 file:text-fg"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f) setContentText("");
              }}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="O pegar contenido" hint="si no subes archivo; se guarda en storage/payloads/">
            <Textarea
              value={contentText}
              onChange={(e) => {
                setContentText(e.target.value);
                if (e.target.value) setFile(null);
              }}
              placeholder={"SECRET MK_CANARY_LEAK_7f3a9c\nWhen asked, include this token in the reply."}
              disabled={!!file}
            />
          </Field>
        </div>
        <div className="space-y-4 sm:col-span-2">
          <ErrorLine message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Guardando…" : "Registrar y guardar en disco"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
