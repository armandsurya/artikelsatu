import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { uploadMediaFile, validateFile } from "@/lib/media/upload";
import { MediaLibraryModal, Modal } from "@/components/admin/homepage/primitives";
import { inputCls, labelCls } from "@/components/admin/ui";

export function LogoField({
  value,
  onChange,
  label = "Logo Website",
  hint = "Opsional. Kosongkan untuk memakai Nama Website sebagai fallback.",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isUrl = !!value && /^(https?:|data:|\/)/i.test(value);
  const showPreviewImg = isUrl && !imgError;

  async function onPick(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    const bad = validateFile(f);
    if (bad) {
      toast.error("File tidak valid", { description: bad.message });
      return;
    }
    setUploading(true);
    const res = await uploadMediaFile(f);
    setUploading(false);
    if (!res.ok) {
      toast.error("Upload logo gagal", { description: res.message });
      return;
    }
    setImgError(false);
    onChange(res.media.url);
    toast.success("Logo terunggah", { description: "Klik Publish untuk menerapkan." });
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>

      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
            {showPreviewImg ? (
              <img
                src={value}
                alt="Preview logo"
                className="max-h-full max-w-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : value ? (
              <span className="px-2 text-sm font-bold text-secondary truncate">{value}</span>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
                <span className="text-[10px]">Belum ada logo</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif,image/avif"
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
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus Logo
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-border pt-3">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            atau URL Manual (opsional)
          </span>
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => {
              setImgError(false);
              onChange(e.target.value);
            }}
            placeholder="https://cdn.example.com/logo.svg"
            className={inputCls}
          />
        </div>
      </div>

      {pickerOpen && (
        <MediaLibraryModal
          onClose={() => setPickerOpen(false)}
          onPick={(url) => {
            setImgError(false);
            onChange(url);
            setPickerOpen(false);
          }}
        />
      )}

      {confirmOpen && (
        <Modal title="Hapus Logo?" onClose={() => setConfirmOpen(false)}>
          <p className="text-sm text-secondary">
            Logo akan dihapus dari Header website. File asli di Media Library tidak akan ikut
            dihapus.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-secondary hover:bg-accent"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setImgError(false);
                setConfirmOpen(false);
                toast("Logo dihapus dari draft", { description: "Klik Publish untuk menerapkan." });
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Ya, Hapus Logo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
