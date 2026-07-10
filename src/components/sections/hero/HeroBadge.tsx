export function HeroBadge({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </div>
  );
}
