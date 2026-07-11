import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, inputCls, btnPrimary, btnDanger } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Upload, Copy, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/media")({
  head: () => ({ meta: [{ title: "Media — Admin" }] }),
  component: MediaPage,
});

function MediaPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: media = [] } = useQuery({
    queryKey: ["media", q],
    queryFn: async () => {
      let query = supabase.from("media").select("*").order("created_at", { ascending: false });
      if (q) query = query.ilike("name", `%${q}%`);
      return (await query).data ?? [];
    },
  });

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      for (const file of Array.from(files)) {
        const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, file, { cacheControl: "3600" });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
        await supabase.from("media").insert({
          name: file.name, path, url: signed?.signedUrl ?? "",
          mime_type: file.type, size_bytes: file.size, uploaded_by: user?.id,
        });
        await logActivity("upload_media", "media", path, { name: file.name });
      }
      qc.invalidateQueries({ queryKey: ["media"] });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal upload");
    } finally { setUploading(false); }
  }

  async function remove(id: string, path: string) {
    if (!confirm("Hapus file ini?")) return;
    await supabase.storage.from("media").remove([path]);
    await supabase.from("media").delete().eq("id", id);
    await logActivity("delete_media", "media", id);
    qc.invalidateQueries({ queryKey: ["media"] });
  }

  return (
    <div>
      <PageHeader
        title="Media"
        description="Unggah dan kelola file gambar & dokumen."
        actions={
          <>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className={btnPrimary}>
              <Upload className="h-4 w-4" /> {uploading ? "Mengunggah..." : "Upload"}
            </button>
          </>
        }
      />
      <Card className="mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari file..." className={`${inputCls} pl-9`} />
        </div>
      </Card>
      {media.length === 0 ? (
        <Card><p className="py-6 text-center text-sm text-muted-foreground">Belum ada media.</p></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((m) => (
            <Card key={m.id} className="!p-2">
              <div className="aspect-square overflow-hidden rounded-md bg-muted">
                {m.mime_type?.startsWith("image/") ? (
                  <img src={m.url} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{m.mime_type ?? "file"}</div>
                )}
              </div>
              <div className="mt-2 truncate text-xs font-medium text-secondary">{m.name}</div>
              <div className="mt-1.5 flex justify-between gap-1">
                <button onClick={() => { navigator.clipboard.writeText(m.url); }} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"><Copy className="h-3 w-3" /> URL</button>
                <button onClick={() => remove(m.id, m.path)} className={btnDanger + " !py-1 !px-2 text-xs"}><Trash2 className="h-3 w-3" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
