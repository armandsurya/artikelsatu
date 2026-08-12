import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Search,
  Trash2,
  Copy,
  X,
  Download,
  Check,
  ImageOff,
  RefreshCw,
} from "lucide-react";
import { api } from "@/integrations/api/browser";
import {
  PageHeader,
  Card,
  inputCls,
  btnPrimary,
  btnGhost,
  btnDanger,
  Field,
} from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import {
  uploadMediaFile,
  replaceMediaFile,
  validateFile,
  formatBytes,
  ALLOWED_MIME,
} from "@/lib/media/upload";
import { getMediaUsage, describeUsage, type UsageRow } from "@/lib/media/usage";

export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => ({ meta: [{ title: "Media Library — Admin" }] }),
  component: MediaLibraryPage,
});

type MediaRow = {
  id: string;
  name: string;
  path: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

type SortKey = "newest" | "oldest" | "name" | "size";

const PAGE_SIZE = 40;
const acceptAttr = ALLOWED_MIME.join(",");

function MediaLibraryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<MediaRow | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["media", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as MediaRow[]) ?? [];
    },
  });

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          (r.alt ?? "").toLowerCase().includes(s) ||
          (r.title ?? "").toLowerCase().includes(s),
      );
    }
    if (typeFilter !== "all") {
      out = out.filter((r) => (r.mime_type ?? "").startsWith(typeFilter));
    }
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return +new Date(a.created_at) - +new Date(b.created_at);
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
        default:
          return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return out;
  }, [rows, q, typeFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    let ok = 0,
      fail = 0;
    for (const f of list) {
      const invalid = validateFile(f);
      if (invalid) {
        toast.error(`${f.name}: ${invalid.message}`);
        fail++;
        continue;
      }
      const res = await uploadMediaFile(f);
      if (res.ok) {
        ok++;
        await logActivity("upload_media", "media", res.media.id, { name: res.media.name });
      } else {
        toast.error(`${f.name} (${res.step}): ${res.message}`);
        fail++;
      }
    }
    setUploading(false);
    if (ok) toast.success(`${ok} file berhasil diunggah${fail ? `, ${fail} gagal` : ""}.`);
    qc.invalidateQueries({ queryKey: ["media"] });
  }

  async function bulkDelete() {
    const ids = Array.from(selection);
    if (!ids.length) return;
    // Check usage
    const { data: usage } = await supabase
      .from("media_usage")
      .select("media_id")
      .in("media_id", ids);
    const used = new Set((usage ?? []).map((u: { media_id: string }) => u.media_id));
    const blocked = ids.filter((id) => used.has(id));
    if (
      blocked.length &&
      !window.confirm(
        `${blocked.length} file masih digunakan pada halaman/section. Tetap hapus? Referensi akan ikut terhapus.`,
      )
    )
      return;
    if (!blocked.length && !window.confirm(`Hapus ${ids.length} file secara permanen?`)) return;

    const rowsToDelete = rows.filter((r) => ids.includes(r.id));
    for (const r of rowsToDelete) {
      await api.storage.from("media").remove([r.path]);
      await api.from("media").delete().eq("id", r.id);
      await logActivity("delete_media", "media", r.id, { name: r.name });
    }
    setSelection(new Set());
    toast.success(`${ids.length} file dihapus.`);
    qc.invalidateQueries({ queryKey: ["media"] });
  }

  async function bulkDownload() {
    const items = rows.filter((r) => selection.has(r.id));
    for (const r of items) {
      const a = document.createElement("a");
      a.href = r.url;
      a.download = r.name;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise((res) => setTimeout(res, 250));
    }
  }

  function toggleSelect(id: string) {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Pusat aset digital website. Upload sekali, gunakan di seluruh editor."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept={acceptAttr}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={btnPrimary}
            >
              <Upload className="h-4 w-4" /> {uploading ? "Mengunggah…" : "Upload"}
            </button>
          </>
        }
      />

      {/* Drag-drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mb-4 rounded-xl border-2 border-dashed p-6 text-center text-sm transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border bg-background text-muted-foreground"}`}
      >
        Tarik file ke sini untuk unggah cepat · JPG, PNG, WebP, SVG, GIF, AVIF · Maks 5 MB
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Cari nama, alt, title…"
              className={`${inputCls} pl-9`}
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className={inputCls + " max-w-[180px]"}
          >
            <option value="all">Semua tipe</option>
            <option value="image/">Semua Image</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
            <option value="image/svg">SVG</option>
            <option value="image/gif">GIF</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={inputCls + " max-w-[180px]"}
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="name">Nama A-Z</option>
            <option value="size">Ukuran terbesar</option>
          </select>
        </div>

        {selection.size > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium text-primary">{selection.size} dipilih</span>
            <div className="flex-1" />
            <button onClick={bulkDownload} className={btnGhost + " !py-1.5 text-xs"}>
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button onClick={bulkDelete} className={btnDanger + " text-xs"}>
              <Trash2 className="h-3.5 w-3.5" /> Hapus
            </button>
            <button
              onClick={() => setSelection(new Set())}
              className={btnGhost + " !py-1.5 text-xs"}
            >
              Batal
            </button>
          </div>
        )}
      </Card>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Memuat media…</p>
      ) : paged.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-muted-foreground">
            Belum ada media yang cocok.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {paged.map((m) => {
            const isSel = selection.has(m.id);
            return (
              <div
                key={m.id}
                className={`group relative overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-md ${isSel ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(m.id);
                  }}
                  className={`absolute top-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border transition-all ${isSel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white/90 opacity-0 group-hover:opacity-100"}`}
                  aria-label="Pilih"
                >
                  {isSel && <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="block w-full text-left"
                >
                  <div className="aspect-square w-full bg-muted">
                    {m.mime_type?.startsWith("image/") ? (
                      <img
                        src={m.url}
                        alt={m.alt ?? m.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="truncate text-xs font-medium text-secondary" title={m.name}>
                      {m.name}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{m.width && m.height ? `${m.width}×${m.height}` : "-"}</span>
                      <span>{formatBytes(m.size_bytes)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {m.mime_type?.split("/")[1] ?? "?"}
                      </span>
                      <span>{new Date(m.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className={btnGhost + " disabled:opacity-40"}
          >
            ‹ Prev
          </button>
          <span className="text-sm text-muted-foreground">
            Halaman {page + 1} / {pageCount}
          </span>
          <button
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className={btnGhost + " disabled:opacity-40"}
          >
            Next ›
          </button>
        </div>
      )}

      {selected && (
        <DetailDrawer
          media={selected}
          onClose={() => setSelected(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["media"] })}
        />
      )}
    </div>
  );
}

/* --------------------------- Detail Drawer --------------------------- */

function DetailDrawer({
  media,
  onClose,
  onChanged,
}: {
  media: MediaRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(media.name);
  const [alt, setAlt] = useState(media.alt ?? "");
  const [title, setTitle] = useState(media.title ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [description, setDescription] = useState(media.description ?? "");
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  useState(() => {
    getMediaUsage(media.id).then(setUsage);
  });

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("media")
      .update({ name, alt, title, caption, description })
      .eq("id", media.id);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    await logActivity("update_media_meta", "media", media.id);
    toast.success("Metadata disimpan.");
    onChanged();
  }

  async function onReplace(file: File) {
    setReplacing(true);
    const res = await replaceMediaFile(media.id, file);
    setReplacing(false);
    if (!res.ok) {
      toast.error(`Replace gagal (${res.step})`, { description: res.message });
      return;
    }
    await logActivity("replace_media", "media", media.id);
    toast.success("File berhasil diganti. URL tetap sama.");
    onChanged();
    onClose();
  }

  async function del() {
    const list = await getMediaUsage(media.id);
    if (
      list.length &&
      !window.confirm(
        `Gambar masih digunakan pada:\n\n${list.map(describeUsage).join("\n")}\n\nTetap hapus? Referensi akan hilang.`,
      )
    )
      return;
    if (!list.length && !window.confirm("Hapus file ini secara permanen?")) return;
    await api.storage.from("media").remove([media.path]);
    await api.from("media").delete().eq("id", media.id);
    await logActivity("delete_media", "media", media.id, { name: media.name });
    toast.success("File dihapus.");
    onChanged();
    onClose();
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} disalin.`));
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">Detail Media</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="overflow-hidden rounded-lg border border-border bg-muted">
            {media.mime_type?.startsWith("image/") ? (
              <img
                src={media.url}
                alt={alt || media.name}
                className="max-h-[300px] w-full object-contain"
              />
            ) : (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Preview tidak tersedia
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Info
              label="Dimensi"
              value={media.width && media.height ? `${media.width} × ${media.height} px` : "-"}
            />
            <Info label="Ukuran" value={formatBytes(media.size_bytes)} />
            <Info label="Tipe" value={media.mime_type ?? "-"} />
            <Info label="Diupload" value={new Date(media.created_at).toLocaleString("id-ID")} />
          </div>

          <div className="space-y-2">
            <CopyRow label="URL" value={media.url} onCopy={() => copyText(media.url, "URL")} />
            <CopyRow label="Path" value={media.path} onCopy={() => copyText(media.path, "Path")} />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <Field label="Nama File">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="ALT" hint="Wajib untuk SEO & aksesibilitas.">
              <input value={alt} onChange={(e) => setAlt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Caption">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <button
              onClick={save}
              disabled={saving}
              className={btnPrimary + " w-full justify-center"}
            >
              {saving ? "Menyimpan…" : "Save"}
            </button>
          </div>

          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold text-secondary">Dipakai di</h3>
            {usage === null ? (
              <p className="text-xs text-muted-foreground">Memuat…</p>
            ) : usage.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum digunakan di mana pun.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {usage.map((u) => (
                  <li key={u.id} className="rounded bg-muted px-2 py-1">
                    {describeUsage(u)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-2">
            <input
              ref={replaceRef}
              type="file"
              hidden
              accept={acceptAttr}
              onChange={(e) => e.target.files?.[0] && onReplace(e.target.files[0])}
            />
            <button
              onClick={() => replaceRef.current?.click()}
              disabled={replacing}
              className={btnGhost + " flex-1 justify-center"}
            >
              <RefreshCw className="h-4 w-4" /> {replacing ? "Mengganti…" : "Replace"}
            </button>
            <button onClick={del} className={btnDanger + " flex-1 justify-center"}>
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-secondary" title={value}>
        {value}
      </div>
    </div>
  );
}

function CopyRow({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded border border-border bg-muted/20 px-2.5 py-1.5 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="flex-1 truncate text-secondary" title={value}>
        {value}
      </span>
      <button
        onClick={onCopy}
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-secondary"
        aria-label="Copy"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
