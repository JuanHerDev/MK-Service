"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Panel({
  title,
  code,
  actions,
  className,
  children,
  bodyClassName,
}: {
  title?: string;
  code?: string;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx("hud border border-line bg-panel/70 backdrop-blur-sm", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3">
          <div className="flex items-center gap-3">
            {code && <span className="font-mono text-[10px] text-accent">{code}</span>}
            {title && <h2 className="label !text-fg">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      <div className={cx("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ variant = "ghost", size = "md", className, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        "group relative inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.14em] transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-[10px]" : "h-10 px-4 text-[11px]",
        variant === "primary" &&
          "bg-accent text-void hover:shadow-[0_0_24px_rgb(212_255_63/0.45)] active:translate-y-px",
        variant === "ghost" && "border border-line-strong text-fg hover:border-accent hover:text-accent",
        variant === "danger" && "border border-critical/40 text-critical hover:bg-critical/10",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="label flex justify-between">
        {label}
        {hint && <span className="normal-case tracking-normal text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full border border-line-strong bg-void/60 px-3 py-2.5 text-sm text-fg placeholder:text-dim outline-none transition focus:border-accent focus:shadow-[0_0_0_1px_var(--color-accent)]";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-24 resize-y", props.className)} />;
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "flex w-full items-center gap-3 border px-3 py-2.5 text-left text-sm transition",
        checked ? "border-accent bg-accent/5 text-fg" : "border-line-strong text-muted hover:border-dim",
      )}
    >
      <span className={cx("grid size-4 place-items-center border", checked ? "border-accent" : "border-dim")}>
        {checked && <span className="size-2 bg-accent" />}
      </span>
      {label}
    </button>
  );
}

const TONES: Record<string, string> = {
  critical: "text-critical border-critical/40 bg-critical/10",
  high: "text-high border-high/40 bg-high/10",
  medium: "text-medium border-medium/40 bg-medium/10",
  low: "text-low border-low/40 bg-low/10",
  ok: "text-ok border-ok/40 bg-ok/10",
  accent: "text-accent border-accent/40 bg-accent/10",
  muted: "text-muted border-line-strong bg-white/[0.02]",
};

export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  // severities
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  // campaign
  queued: "muted",
  running: "accent",
  completed: "ok",
  failed: "critical",
  cancelled: "muted",
  // finding
  open: "high",
  in_progress: "accent",
  resolved: "ok",
  false_positive: "muted",
  accepted_risk: "medium",
  // target / report
  active: "ok",
  error: "critical",
  pending: "muted",
  untested: "muted",
  ready: "ok",
  generating: "accent",
};

export function Badge({ value, tone, pulse }: { value: string; tone?: keyof typeof TONES; pulse?: boolean }) {
  const t = tone ?? STATUS_TONE[value] ?? "muted";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] whitespace-nowrap",
        TONES[t],
      )}
    >
      <span className={cx("size-1.5 rounded-full bg-current", (pulse || value === "running") && "animate-pulse-dot")} />
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  code,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  code?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-void/80 p-4 backdrop-blur-md sm:items-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal
        className={cx(
          "hud relative w-full animate-fade-up border border-line-strong bg-ink shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            {code && <span className="font-mono text-[10px] text-accent">{code}</span>}
            <h3 className="label !text-fg">{title}</h3>
          </div>
          <button onClick={onClose} className="text-muted transition hover:text-accent" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="relative grid size-14 place-items-center border border-dashed border-line-strong">
        <span className="size-1.5 animate-pulse-dot bg-accent" />
      </div>
      <p className="label !text-fg">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="border-l-2 border-critical bg-critical/5 px-3 py-2 font-mono text-xs text-critical">
      ERR // {message}
    </p>
  );
}

export function Loader({ label = "Sincronizando" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-3 w-1 animate-pulse-dot bg-accent" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </span>
      {label}
      <span className="animate-blink">_</span>
    </div>
  );
}

export function PageHeader({
  index,
  title,
  subtitle,
  actions,
}: {
  index: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-fade-up">
        <p className="label mb-3">
          <span className="text-accent">{index}</span> / {subtitle}
        </p>
        <h1 className="text-4xl font-medium tracking-[-0.04em] sm:text-5xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export { cx };
