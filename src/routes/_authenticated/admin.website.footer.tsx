import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLISHED_QUERY_KEY } from "@/lib/publishedContent";
import { toast } from "sonner";
import { PageHeader, Card } from "@/components/admin/ui";
import { TextField, TextareaField, Repeater, inputCls } from "@/components/admin/homepage/primitives";
import { EditorToolbar } from "@/components/admin/homepage/EditorToolbar";
import { UnsavedDialog } from "@/components/admin/homepage/UnsavedDialog";
import { jsonEqual } from "@/lib/admin/sectionMeta";
import { settings } from "@/data/settings";
import { footer } from "@/data/footer";
import { logActivity } from "@/lib/admin/log";
import { loadSiteSettings, patchSiteSettings, invalidateSiteSettings } from "@/lib/admin/siteSettings";

type FooterData = {
  description: string;
  copyright: string;
  contact: { whatsapp: string; email: string; address: string };
  social: { label: string; url: string }[];
  columns: { title: string; links: { label: string; href: string }[] }[];
};

const DEFAULT_FOOTER: FooterData = {
  description: footer.description,
  copyright: settings.copyright,
  contact: { whatsapp: settings.whatsapp, email: settings.email, address: settings.address },
  social: settings.social,
  columns: footer.columns,
};

export const Route = createFileRoute("/_authenticated/admin/website/footer")({
  head: () => ({ meta: [{ title: "Footer — Admin" }] }),
  component: FooterEditor,
});

function FooterEditor() {
  const queryClient = useQueryClient();
  const [live, setLive] = useState<FooterData | null>(null);
  const [serverDraft, setServerDraft] = useState<FooterData | null>(null);
  const [local, setLocal] = useState<FooterData | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const all = await loadSiteSettings<{ footer?: FooterData; footer_draft?: FooterData; footer_saved_at?: string }>();
      const merge = (v?: Partial<FooterData>): FooterData => ({
        ...DEFAULT_FOOTER, ...(v ?? {}),
        contact: { ...DEFAULT_FOOTER.contact, ...(v?.contact ?? {}) },
        social: v?.social?.length ? v.social : DEFAULT_FOOTER.social,
        columns: v?.columns?.length ? v.columns : DEFAULT_FOOTER.columns,
      });
      const liveVal = merge(all.footer);
      const draftVal = all.footer_draft ? merge(all.footer_draft) : liveVal;
      if (!all.footer) await patchSiteSettings({ footer: liveVal, footer_draft: draftVal });
      setLive(liveVal);
      setServerDraft(draftVal);
      setLocal(draftVal);
      setSavedAt(all.footer_saved_at ?? null);
    })();
  }, []);

  const isDirty = useMemo(() => !!local && !!serverDraft && !jsonEqual(local, serverDraft), [local, serverDraft]);
  const status = !live || !serverDraft ? "draft" : jsonEqual(live, serverDraft) ? "published" : "modified";
  const blocker = useBlocker({ shouldBlockFn: () => isDirty, withResolver: true });

  async function saveDraft(): Promise<boolean> {
    if (!local) return false;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await patchSiteSettings({ footer_draft: local, footer_saved_at: nowIso });
      if (error) { console.error("[footer saveDraft]", error); toast.error("Gagal menyimpan draft", { description: error.message }); return false; }
      setServerDraft(local);
      setSavedAt(nowIso);
      await logActivity("save_draft_footer", "site_settings", "footer");
      toast.success("Draft footer disimpan");
      return true;
    } finally { setSaving(false); }
  }

  async function publish() {
    if (!local) return;
    if (isDirty) { const ok = await saveDraft(); if (!ok) return; }
    setPublishing(true);
    try {
      const { error } = await patchSiteSettings({ footer: local });
      if (error) { console.error("[footer publish]", error); toast.error("Gagal mem-publish footer", { description: error.message }); return; }
      setLive(local);
      invalidateSiteSettings(queryClient);
      await logActivity("publish_footer", "site_settings", "footer");
      toast.success("Footer berhasil di-publish");
    } finally { setPublishing(false); }
  }

  function resetLocal() { if (serverDraft) { setLocal(serverDraft); toast("Perubahan dikembalikan"); } }
  function openPreview() { window.open(`/?preview=footer&t=${Date.now()}`, "_blank", "noopener,noreferrer"); }

  if (!local) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  const set = <K extends keyof FooterData>(k: K, v: FooterData[K]) => setLocal({ ...local, [k]: v });

  return (
    <div className="space-y-6">
      <PageHeader title="Footer" description="Kelola deskripsi, kontak, sosial media, dan kolom link footer." />

      <EditorToolbar
        status={status as "draft" | "published" | "modified"}
        isDirty={isDirty}
        saving={saving}
        publishing={publishing}
        canPublish={true}
        onSaveDraft={saveDraft}
        onPreview={openPreview}
        onPublish={publish}
        onReset={resetLocal}
        lastSavedAt={savedAt}
      />

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Umum</h3>
        <div className="grid gap-4">
          <TextareaField label="Deskripsi Perusahaan" value={local.description} onChange={(v) => set("description", v)} rows={3} max={280} />
          <TextField label="Copyright" value={local.copyright} onChange={(v) => set("copyright", v)} max={160} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Kontak</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="WhatsApp (angka saja)" value={local.contact.whatsapp}
            onChange={(v) => set("contact", { ...local.contact, whatsapp: v })} placeholder="628123456789" />
          <TextField label="Email" value={local.contact.email}
            onChange={(v) => set("contact", { ...local.contact, email: v })} />
          <TextField label="Alamat" value={local.contact.address}
            onChange={(v) => set("contact", { ...local.contact, address: v })} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Sosial Media</h3>
        <Repeater
          items={local.social}
          onChange={(social) => set("social", social)}
          addLabel="Tambah Sosial Media"
          itemTitle={(it, i) => it.label || `Sosial #${i + 1}`}
          newItem={() => ({ label: "", url: "" })}
          renderItem={(it, up) => (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Label" value={it.label} onChange={(label) => up({ label })} />
              <TextField label="URL" value={it.url} onChange={(url) => up({ url })} />
            </div>
          )}
        />
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Kolom Link</h3>
        <Repeater
          items={local.columns}
          onChange={(columns) => set("columns", columns)}
          addLabel="Tambah Kolom"
          itemTitle={(it, i) => it.title || `Kolom #${i + 1}`}
          newItem={() => ({ title: "", links: [] })}
          renderItem={(col, upCol) => (
            <div className="grid gap-4">
              <TextField label="Judul Kolom" value={col.title} onChange={(title) => upCol({ title })} max={40} />
              <div>
                <div className="mb-2 text-sm font-medium text-secondary">Link</div>
                <div className="space-y-2">
                  {col.links.map((l, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input value={l.label} placeholder="Label" className={inputCls}
                        onChange={(e) => upCol({ links: col.links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                      <input value={l.href} placeholder="URL" className={inputCls}
                        onChange={(e) => upCol({ links: col.links.map((x, j) => j === i ? { ...x, href: e.target.value } : x) })} />
                      <button type="button" onClick={() => upCol({ links: col.links.filter((_, j) => j !== i) })}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Hapus</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => upCol({ links: [...col.links, { label: "", href: "" }] })}
                    className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent">+ Tambah Link</button>
                </div>
              </div>
            </div>
          )}
        />
      </Card>

      <UnsavedDialog
        open={blocker.status === "blocked"}
        saving={saving}
        onSave={async () => { const ok = await saveDraft(); if (ok && blocker.status === "blocked") blocker.proceed?.(); }}
        onDiscard={() => blocker.status === "blocked" && blocker.proceed?.()}
        onCancel={() => blocker.status === "blocked" && blocker.reset?.()}
      />
    </div>
  );
}
