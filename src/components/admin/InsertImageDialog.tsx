import { useEffect, useRef, useState } from "react";
import { Modal } from "./homepage/primitives";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, validateFile, formatBytes } from "@/lib/media/upload";
import { Upload, Link2, Image as ImageIcon, Search, Loader2, CheckCircle2 } from "lucide-react";

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

type Tab = "library" | "upload" | "url";

export function InsertImageDialog({
  onClose, onInsert,
}: {
  onClose: () => void;
  onInsert: (payload: { url: string; alt?: string; caption?: string }) => void;
}) {
  const [tab, setTab] = useState<Tab>("library");

  return (
    <Modal title="Insert Image" onClose={onClose} wide>
      <div className="mb-4 flex gap-1 border-b border-border">
        <TabButton active={tab === "library"} onClick={() => setTab("library")} icon={<ImageIcon className="h-4 w-4" />} label="Media Library" />
        <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={<Upload className="h-4 w-4" />} label="Upload" />
        <TabButton active={tab === "url"} onClick={() => setTab("url")} icon={<Link2 className="h-4 w-4" />} label="URL" />
      </div>
      {tab === "library" && <LibraryTab onPick={(m) => onInsert({ url: m.url, alt: m.alt ?? undefined })} />}
      {tab === "upload" && <UploadTab onDone={(m) => onInsert({ url: m.url, alt: m.alt ?? undefined })} />}
      {tab === "url" && <UrlTab onInsert={(p) => onInsert(p)} />}
    </Modal>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-secondary"
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ---------- Library tab ---------- */

function LibraryTab({ onPick }: { onPick: (m: MediaItem) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "old" | "az" | "size">("new");

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("media")
        .select("id,url,name,mime_type,size_bytes,width,height,alt,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!cancel) { setItems((data as MediaItem[]) ?? []); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  const filtered = items
    .filter((it) => it.name.toLowerCase().includes(q.toLowerCase()) || (it.alt ?? "").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sort === "old") return a.created_at.localeCompare(b.created_at);
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "size") return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
      return b.created_at.localeCompare(a.created_at);
    });

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau alt text…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <option value="new">Terbaru</option>
          <option value="old">Terlama</option>
          <option value="az">Nama A-Z</option>
          <option value="size">Ukuran terbesar</option>
        </select>
      </div>
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Belum ada media.</p>
      ) : (
        <div className="grid max-h-[55vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onDoubleClick={() => onPick(m)}
              onClick={() => onPick(m)}
              className="group overflow-hidden rounded-lg border border-border bg-background text-left hover:border-primary"
              title={`${m.name}${m.width && m.height ? ` · ${m.width}×${m.height}` : ""} · ${formatBytes(m.size_bytes)}`}
            >
              <div className="aspect-square w-full bg-muted">
                {m.mime_type?.startsWith("image/") ? (
                  <img src={m.url} alt={m.alt ?? m.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
                )}
              </div>
              <div className="truncate px-2 py-1 text-xs text-secondary">{m.name}</div>
              <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] text-muted-foreground">
                <span>{m.width && m.height ? `${m.width}×${m.height}` : "-"}</span>
                <span>{formatBytes(m.size_bytes)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">Tip: klik untuk memilih, double-click untuk langsung insert.</p>
    </div>
  );
}

/* ---------- Upload tab ---------- */

function UploadTab({ onDone }: { onDone: (m: MediaItem) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    const invalid = validateFile(file);
    if (invalid) { setError(invalid.message); return; }
    setError(null);
    setUploading(true);
    const res = await uploadMediaFile(file);
    setUploading(false);
    if (!res.ok) { setError(res.message); return; }
    onDone({
      id: res.media.id, url: res.media.url, name: res.media.name,
      mime_type: res.media.mime_type, size_bytes: res.media.size_bytes,
      width: res.media.width, height: res.media.height, alt: null,
      created_at: new Date().toISOString(),
    });
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:border-primary/40"
        }`}
      >
        {uploading ? (
          <><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-secondary">Mengunggah…</p></>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-secondary">Drop file di sini atau klik untuk memilih</p>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, SVG, GIF, AVIF · maks 5MB</p>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif" hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/* ---------- URL tab ---------- */

function UrlTab({ onInsert }: { onInsert: (p: { url: string; alt?: string; caption?: string }) => void }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewOk, setPreviewOk] = useState<boolean | null>(null);

  function insert() {
    if (!url.trim()) { setError("URL wajib diisi."); return; }
    try { new URL(url); } catch { setError("URL tidak valid."); return; }
    onInsert({ url: url.trim(), alt: alt.trim() || undefined, caption: caption.trim() || undefined });
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-secondary">URL gambar</span>
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); setPreviewOk(null); }}
          onBlur={() => { if (url) { try { new URL(url); setPreviewOk(true); } catch { setPreviewOk(false); } } }}
          placeholder="https://…"
          className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-secondary">Alt text (SEO)</span>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-secondary">Caption</span>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
      </div>
      {previewOk && url && (
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs text-muted-foreground">Pratinjau</p>
          <img src={url} alt={alt} className="max-h-64 rounded-md" onError={() => setError("Gambar gagal dimuat.")} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={insert}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <CheckCircle2 className="h-4 w-4" /> Insert
        </button>
      </div>
    </div>
  );
}
