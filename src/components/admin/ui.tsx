import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-secondary">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-background p-5 ${className}`}>
      {children}
    </div>
  );
}

export const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-secondary hover:bg-accent";
export const btnDanger =
  "inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50";
export const inputCls =
  "block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-secondary outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
export const labelCls = "mb-1.5 block text-sm font-medium text-secondary";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
