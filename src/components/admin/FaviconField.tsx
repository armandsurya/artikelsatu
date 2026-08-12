import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugifyFilename } from "@/lib/media/upload";
import { MediaLibraryModal } from "@/components/admin/homepage/primitives";
import { inputCls, labelCls } from "@/components/admin/ui";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_EXT = ["ico", "png", "svg"] as const;
const ALLOWED_MIME = ["image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml"];

function validateFavicon(file: File): string | null {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const mimeOk = ALLOWED_MIME.includes(file.type);
  const extOk = (ALLOWED_EXT as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) return "Format harus .ico, .png, atau .svg.";
  if (file.size === 0) return "File kosong.";
  if (file.size > MAX_BYTES)
    return `Ukuran ${(file.size / 1024 / 1024).toFixed(2)} MB melebihi batas 2 MB.`;
  return null;
}

async function uploadFaviconFile(file: File): Promise<{ url: string } | { error: string }> {
  const invalid = validateFavicon(file);
  if (invalid) return { error: invalid };

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const finalMime =
    file.type || (ext === "ico" ? "image/x-icon" : ext === "svg" ? "image/svg+xml" : "image/png");

  const now = new Date();
  const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  let name = slugifyFilename(file.name, ext);
  let path = `${folder}/${name}`;
  for (let i = 2; i < 30; i++) {
    const { data: existing } = await supabase
      .from("media")
      .select("id")
      .eq("path", path)
      .maybeSingle();
    if (!existing) break;
    const dot = name.lastIndexOf(".");
    name = `${name.slice(0, dot)}-${i}${name.slice(dot)}`;
    path = `${folder}/${name}`;
  }

  const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "31536000",
    contentType: finalMime,
    upsert: false,
  });
  if (upErr) return { error: upErr.message };

  const { data: signed, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr || !signed?.signedUrl) {
    await supabase.storage.from("media").remove([path]);
    return { error: signErr?.message ?? "Gagal membuat signed URL." };
  }

  const user = (await supabase.auth.getUser()).data.user;
  const { data: inserted, error: dbErr } = await supabase
    .from("media")
    .insert({
      name,
      path,
      url: signed.signedUrl,
      mime_type: finalMime,
      size_bytes: file.size,
      uploaded_by: user?.id,
    })
    .select("url")
    .single();
  if (dbErr || !inserted) {
    await supabase.storage.from("media").remove([path]);
    return { error: dbErr?.message ?? "Gagal menyimpan metadata." };
  }
  return { url: inserted.url };
}

export function FaviconField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  async function onPick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    setUploading(true);
    const res = await uploadFaviconFile(f);
    setUploading(false);
    if ("error" in res) {
      toast.error("Upload favicon gagal", { description: res.error });
      return;
    }
    onChange(res.url);
    toast.success("Favicon terunggah", { description: "Klik Simpan untuk menerapkan." });
  }

  return (
    <div>
      <span className={labelCls}>Favicon</span>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
            {value ? (
              <img
                src={value}
                alt="Preview favicon"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
                hidden
                onChange={(e) => onPick(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Mengunggah…" : "Upload dari Komputer"}
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-secondary hover:bg-accent"
              >
                <ImageIcon className="h-4 w-4" /> Pilih dari Media
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Format: .ico, .png, .svg · Maks 2 MB. File otomatis masuk ke Media Library.
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-border pt-3">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            atau URL Manual (opsional)
          </span>
          <input
            type="url"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://cdn.example.com/favicon.png"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Gunakan bila favicon di-host di CDN eksternal.
          </p>
        </div>
      </div>

      {pickerOpen && (
        <MediaLibraryModal
          onClose={() => setPickerOpen(false)}
          onPick={(url) => {
            onChange(url);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
