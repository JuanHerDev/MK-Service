export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (Math.abs(diff) < 60) return rtf.format(-Math.round(diff), "second");
  if (Math.abs(diff) < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (Math.abs(diff) < 86400) return rtf.format(-Math.round(diff / 3600), "hour");
  return rtf.format(-Math.round(diff / 86400), "day");
}

export function fmtBytes(n: number | null | undefined) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

export function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

export function humanize(code: string) {
  return code.replace(/_/g, " ");
}

export const CATEGORY_LABEL: Record<string, string> = {
  prompt_injection_direct: "Instrucciones engañosas (chat)",
  prompt_injection_indirect: "Instrucciones ocultas en documentos",
  data_leakage: "Filtración de información",
};

/** Log actions in everyday language */
export const ACTION_LABEL: Record<string, string> = {
  "invite.created": "Se envió una invitación",
  "invite.revoked": "Se canceló una invitación",
  "invite.accepted": "Alguien aceptó una invitación",
  "member.role_changed": "Se cambió el rol de un miembro",
  "member.activated": "Se activó un miembro",
  "member.deactivated": "Se desactivó un miembro",
  "api_key.created": "Se creó una clave de acceso",
  "api_key.revoked": "Se revocó una clave de acceso",
  "campaign.run": "Se ejecutó una auditoría",
  "campaign.created": "Se creó una auditoría",
  "report.generated": "Se generó un informe",
  "admin.member_patched": "Admin de plataforma modificó un miembro",
  "target.created": "Se registró un sistema a auditar",
  "target.updated": "Se actualizó un sistema a auditar",
  "target.tested": "Se probó la conexión a un sistema",
};

/** Tipos de recurso del log en lenguaje cotidiano. */
export const RESOURCE_LABEL: Record<string, string> = {
  membership: "Miembro del equipo",
  invitation: "Invitación",
  api_key: "Clave de acceso",
  campaign: "Auditoría",
  report: "Informe",
  target: "Sistema auditado",
  attack_document: "Documento de prueba",
  organization: "Organización",
  user: "Usuario",
};

export function labelAction(code: string | null | undefined): string {
  if (!code) return "—";
  return ACTION_LABEL[code] ?? code.replace(/[._]/g, " ");
}

export function labelResource(code: string | null | undefined): string {
  if (!code) return "—";
  return RESOURCE_LABEL[code] ?? code.replace(/_/g, " ");
}
