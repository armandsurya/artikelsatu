import { Eye, RotateCcw, Save, Upload, ExternalLink } from "lucide-react";

export type SectionStatus = "draft" | "published" | "modified";

export function StatusBadge({ status, isDirty }: { status: SectionStatus; isDirty: boolean }) {
  if (isDirty) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Belum Disimpan
      </span>
    );
  }
  const map = {
    draft: {
      cls: "border-slate-200 bg-slate-50 text-slate-700",
      dot: "bg-slate-400",
      label: "Draft",
    },
    published: {
      cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
      dot: "bg-emerald-500",
      label: "Published",
    },
    modified: {
      cls: "border-blue-200 bg-blue-50 text-blue-700",
      dot: "bg-blue-500",
      label: "Modified",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${m.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
}

export function EditorToolbar({
  status,
  isDirty,
  saving,
  publishing,
  canPublish,
  onSaveDraft,
  onPreview,
  onPublish,
  onReset,
  lastSavedAt,
  lastSavedByName,
}: {
  status: SectionStatus;
  isDirty: boolean;
  saving: boolean;
  publishing: boolean;
  canPublish: boolean;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onReset: () => void;
  lastSavedAt?: string | null;
  lastSavedByName?: string | null;
}) {
  const busy = saving || publishing;
  return (
    <div className="sticky top-0 z-20 -mx-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} isDirty={isDirty} />
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground">
              Terakhir disimpan: {new Date(lastSavedAt).toLocaleString("id-ID")}
              {lastSavedByName ? ` oleh ${lastSavedByName}` : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={busy || !isDirty}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary hover:bg-accent disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary hover:bg-accent disabled:opacity-50"
          >
            <Eye className="h-4 w-4" /> Preview <ExternalLink className="h-3 w-3 opacity-60" />
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={busy || !isDirty}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={busy || !canPublish}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            title={!canPublish ? "Simpan draft terlebih dahulu" : "Publikasikan ke frontend"}
          >
            <Upload className="h-4 w-4" /> {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
