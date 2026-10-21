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
  prompt_injection_direct: "PI · Directa",
  prompt_injection_indirect: "PI · Indirecta",
  data_leakage: "Data Leakage",
};
