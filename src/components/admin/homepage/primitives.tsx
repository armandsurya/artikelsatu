import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Lucide from "lucide-react";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { api } from "@/integrations/api/browser";

/* ---------- Field primitives ---------- */

export const inputCls =
  "block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-secondary outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";
export const labelCls = "mb-1.5 block text-sm font-medium text-secondary";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  counter,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  counter?: string;
}) {
  return (
    <div className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className={labelCls + " mb-0"}>
          {label} {required && <span className="text-red-500">*</span>}
        </span>
        {counter && <span className="text-xs text-muted-foreground">{counter}</span>}
      </div>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  max,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  max?: number;
  type?: string;
}) {
  const over = max && value.length > max;
  return (
    <Field
      label={label}
      hint={hint}
      required={required}
      counter={max ? `${value.length}/${max}` : undefined}
      error={over ? `Maksimal ${max} karakter` : undefined}
    >
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </Field>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  rows = 4,
  required,
  hint,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
  hint?: string;
  max?: number;
  placeholder?: string;
}) {
  const over = max && value.length > max;
  return (
    <Field
      label={label}
      hint={hint}
      required={required}
      counter={max ? `${value.length}/${max}` : undefined}
      error={over ? `Maksimal ${max} karakter` : undefined}
    >
      <textarea
        rows={rows}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={inputCls}
      />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </button>
      {label && <span className="text-sm text-secondary">{label}</span>}
    </label>
  );
}

/* ---------- Accordion ---------- */

export function Accordion({
  items,
}: {
  items: {
    key: string;
    title: string;
    subtitle?: string;
    badge?: ReactNode;
    right?: ReactNode;
    content: ReactNode;
    defaultOpen?: boolean;
  }[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(
    items.find((i) => i.defaultOpen)?.key ?? null,
  );
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <ul className="divide-y divide-border">
        {items.map((it) => {
          const isOpen = openKey === it.key;
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => setOpenKey(isOpen ? null : it.key)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-accent/50"
              >
                <span className="flex-1">
                  <span className="block font-medium text-secondary">{it.title}</span>
                  {it.subtitle && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {it.subtitle}
                    </span>
                  )}
                </span>
                {it.badge}
                {it.right && <span onClick={(e) => e.stopPropagation()}>{it.right}</span>}
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && <div className="border-t border-border bg-muted/20 p-6">{it.content}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Repeater ---------- */

export function Repeater<T>({
  items,
  onChange,
  addLabel,
  newItem,
  renderItem,
  itemTitle,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  addLabel: string;
  newItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  itemTitle?: (item: T, index: number) => string;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="rounded-lg border border-border bg-background">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <button
              type="button"
              onClick={() => move(idx, idx - 1)}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="Naik"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="flex-1 text-sm font-medium text-secondary">
              {itemTitle ? itemTitle(it, idx) : `Item #${idx + 1}`}
            </span>
            <button
              type="button"
              onClick={() => move(idx, idx - 1)}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(idx, idx + 1)}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="rounded p-1.5 text-red-600 hover:bg-red-50"
              aria-label="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            {renderItem(
              it,
              (patch) => onChange(items.map((v, i) => (i === idx ? { ...v, ...patch } : v))),
              idx,
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, newItem()])}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-2 text-sm font-medium text-primary hover:bg-accent"
      >
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

/* ---------- Icon picker (Lucide) ---------- */

const ICON_CHOICES = [
  "Search",
  "BookOpen",
  "LayoutTemplate",
  "MessageSquare",
  "ShoppingBag",
  "RefreshCw",
  "Users",
  "PenTool",
  "ShieldCheck",
  "Target",
  "Clock",
  "TrendingDown",
  "TrendingUp",
  "UserX",
  "FileText",
  "PenLine",
  "Star",
  "CheckCircle2",
  "Award",
  "Zap",
  "Rocket",
  "Sparkles",
  "BarChart3",
  "Globe",
  "Heart",
  "ThumbsUp",
  "MessageCircle",
  "Mail",
  "Phone",
  "MapPin",
  "Calendar",
  "Layers",
  "Package",
  "Briefcase",
  "Lightbulb",
];

export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const Current =
    (Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[value] ??
    Lucide.Sparkles;
  const filtered = ICON_CHOICES.filter((n) => n.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-secondary hover:bg-accent"
      >
        <Current className="h-4 w-4 text-primary" />
        <span>{value || "Pilih icon"}</span>
      </button>
      {open && (
        <Modal title="Pilih Icon" onClose={() => setOpen(false)}>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari icon…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="grid max-h-[400px] grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
            {filtered.map((n) => {
              const I = (
                Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>
              )[n];
              if (!I) return null;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] hover:bg-accent ${value === n ? "border-primary bg-primary/5" : "border-border"}`}
                  title={n}
                >
                  <I className="h-5 w-5 text-secondary" />
                  <span className="truncate">{n}</span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Media Picker (WordPress-style, DAM-aware) ---------- */

type MediaItem = {
  id: string;
  url: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: string;
};

export function MediaPicker({
  value,
  onChange,
  label = "Gambar",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field
      label={label}
      hint="Pilih dari Media Library. Semua image website dikelola di satu tempat."
    >
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border bg-muted">
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 right-1 rounded-full bg-white/90 p-0.5 shadow"
              aria-label="Hapus"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            <ImageIcon className="h-4 w-4" /> Pilih dari Media
          </button>
          {value && (
            <span className="max-w-[280px] truncate text-xs text-muted-foreground">{value}</span>
          )}
        </div>
      </div>
      {open && (
        <MediaLibraryModal
          onClose={() => setOpen(false)}
          onPick={(url) => {
            onChange(url);
            setOpen(false);
          }}
        />
      )}
    </Field>
  );
}

export function MediaLibraryModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("media")
      .select("id,url,name,mime_type,size_bytes,width,height,alt,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setItems((data as MediaItem[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    // Lazy-import to keep primitives light on module load
    const { uploadMediaFile, validateFile } = await import("@/lib/media/upload");
    for (const f of Array.from(files)) {
      const invalid = validateFile(f);
      if (invalid) {
        console.error(`[picker upload] ${f.name}:`, invalid.message);
        alert(`${f.name}: ${invalid.message}`);
        continue;
      }
      const res = await uploadMediaFile(f);
      if (!res.ok) {
        console.error(`[picker upload] ${f.name}:`, res);
        alert(`${f.name} gagal (${res.step}): ${res.message}`);
      }
    }
    setUploading(false);
    await load();
  }

  const filtered = items.filter(
    (it) =>
      it.name.toLowerCase().includes(q.toLowerCase()) ||
      (it.alt ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Modal title="Media Library" onClose={onClose} wide>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari media…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif"
          multiple
          hidden
          onChange={(e) => onUpload(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> {uploading ? "Mengunggah…" : "Upload Baru"}
        </button>
      </div>
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada media. Klik Upload Baru untuk menambahkan.
        </p>
      ) : (
        <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.url)}
              className="group overflow-hidden rounded-lg border border-border bg-background text-left hover:border-primary"
              title={`${m.name}${m.width && m.height ? ` · ${m.width}×${m.height}` : ""}`}
            >
              <div className="aspect-square w-full bg-muted">
                {m.mime_type?.startsWith("image/") ? (
                  <img
                    src={m.url}
                    alt={m.alt ?? m.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="truncate px-2 py-1 text-xs text-secondary">{m.name}</div>
              <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] text-muted-foreground">
                <span>{m.width && m.height ? `${m.width}×${m.height}` : "-"}</span>
                <span>{m.size_bytes ? `${(m.size_bytes / 1024).toFixed(0)} KB` : ""}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-4xl" : "max-w-lg"} rounded-2xl bg-background shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-base font-semibold text-secondary">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent" aria-label="Tutup">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Save status ---------- */

export function SaveStatus({
  state,
  savedAt,
}: {
  state: "idle" | "saving" | "saved" | "error";
  savedAt?: string;
}) {
  if (state === "saving") return <span className="text-xs text-muted-foreground">Menyimpan…</span>;
  if (state === "error") return <span className="text-xs text-red-600">Gagal menyimpan</span>;
  if (state === "saved" || savedAt)
    return (
      <span className="text-xs text-muted-foreground">
        Tersimpan{savedAt ? ` • ${new Date(savedAt).toLocaleString("id-ID")}` : ""}
      </span>
    );
  return null;
}
