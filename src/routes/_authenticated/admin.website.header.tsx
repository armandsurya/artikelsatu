import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLISHED_QUERY_KEY } from "@/lib/publishedContent";
import { toast } from "sonner";
import { PageHeader, Card } from "@/components/admin/ui";
import { TextField, Repeater, SelectField, MediaPicker } from "@/components/admin/homepage/primitives";
import { EditorToolbar } from "@/components/admin/homepage/EditorToolbar";
import { UnsavedDialog } from "@/components/admin/homepage/UnsavedDialog";
import { jsonEqual } from "@/lib/admin/sectionMeta";
import { settings } from "@/data/settings";
import { mainNav } from "@/data/navigation";
import { logActivity } from "@/lib/admin/log";
import { loadSiteSettings, patchSiteSettings } from "@/lib/admin/siteSettings";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";

type HeaderData = {
  logo: string;
  menu: { label: string; href: string; target: "_self" | "_blank" }[];
  ctaLabel: string;
  ctaUrl: string;
  ctaVisible: boolean;
};

const DEFAULT_HEADER: HeaderData = {
  logo: settings.logo,
  menu: mainNav.map((m) => ({ label: m.label, href: m.href, target: "_self" })),
  ctaLabel: "Konsultasi Gratis",
  ctaUrl: `https://wa.me/${settings.whatsapp}`,
  ctaVisible: true,
};

export const Route = createFileRoute("/_authenticated/admin/website/header")({
  head: () => ({ meta: [{ title: "Header — Admin" }] }),
  component: HeaderEditor,
});

function HeaderEditor() {
  const queryClient = useQueryClient();
  const [live, setLive] = useState<HeaderData | null>(null);
  const [serverDraft, setServerDraft] = useState<HeaderData | null>(null);
  const [local, setLocal] = useState<HeaderData | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const all = await loadSiteSettings<{ header?: HeaderData; header_draft?: HeaderData; header_saved_at?: string }>();
      const liveVal = { ...DEFAULT_HEADER, ...(all.header ?? {}), menu: all.header?.menu?.length ? all.header.menu : DEFAULT_HEADER.menu };
      const draftVal = all.header_draft ? { ...DEFAULT_HEADER, ...all.header_draft } : liveVal;
      if (!all.header) await patchSiteSettings({ header: liveVal, header_draft: draftVal });
      setLive(liveVal);
      setServerDraft(draftVal);
      setLocal(draftVal);
      setSavedAt(all.header_saved_at ?? null);
    })();
  }, []);

  const isDirty = useMemo(() => !!local && !!serverDraft && !jsonEqual(local, serverDraft), [local, serverDraft]);
  const status = !live || !serverDraft ? "draft" : jsonEqual(live, serverDraft) ? "published" : "modified";

  const blocker = useBlocker({ shouldBlockFn: () => isDirty, withResolver: true });

  async function saveDraft(): Promise<boolean> {
    if (!local) return false;
    if (!local.logo?.trim()) { toast.error("Logo wajib diisi"); return false; }
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await patchSiteSettings({ header_draft: local, header_saved_at: nowIso });
      if (error) {
        console.error("[header saveDraft]", error);
        toast.error("Gagal menyimpan draft", { description: error.message });
        return false;
      }
      setServerDraft(local);
      setSavedAt(nowIso);
      await logActivity("save_draft_header", "site_settings", "header");
      toast.success("Draft header disimpan");
      return true;
    } finally { setSaving(false); }
  }

  async function publish() {
    if (!local) return;
    if (isDirty) { const ok = await saveDraft(); if (!ok) return; }
    setPublishing(true);
    try {
      const { error } = await patchSiteSettings({ header: local });
      if (error) {
        console.error("[header publish]", error);
        toast.error("Gagal mem-publish header", { description: error.message });
        return;
      }
      setLive(local);
      if (local.logo) await trackMediaUsage(local.logo, "site_settings", "header", "logo");
      else await clearMediaUsage("site_settings", "header", "logo");
      queryClient.invalidateQueries({ queryKey: PUBLISHED_QUERY_KEY });
      await logActivity("publish_header", "site_settings", "header");
      toast.success("Header berhasil di-publish");
    } finally { setPublishing(false); }
  }

  function resetLocal() {
    if (!serverDraft) return;
    setLocal(serverDraft);
    toast("Perubahan dikembalikan");
  }

  function openPreview() {
    window.open(`/?preview=header&t=${Date.now()}`, "_blank", "noopener,noreferrer");
  }

  if (!local) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  const set = <K extends keyof HeaderData>(k: K, v: HeaderData[K]) => setLocal({ ...local, [k]: v });

  return (
    <div className="space-y-6">
      <PageHeader title="Header" description="Kelola logo, menu navigasi, dan tombol CTA header." />

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
        <h3 className="mb-4 text-sm font-semibold text-secondary">Logo & CTA</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <MediaPicker label="Logo (image)" value={local.logo} onChange={(v) => set("logo", v)} />
          </div>
          <TextField label="CTA Label" value={local.ctaLabel} onChange={(v) => set("ctaLabel", v)} max={40} />
          <TextField label="CTA URL" value={local.ctaUrl} onChange={(v) => set("ctaUrl", v)} placeholder="https://wa.me/…" />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Menu Navigasi</h3>
        <Repeater
          items={local.menu}
          onChange={(menu) => set("menu", menu)}
          addLabel="Tambah Menu"
          itemTitle={(it, i) => it.label || `Menu #${i + 1}`}
          newItem={() => ({ label: "", href: "", target: "_self" as const })}
          renderItem={(it, up) => (
            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="Label" value={it.label} onChange={(label) => up({ label })} max={40} />
              <TextField label="URL / Anchor" value={it.href} onChange={(href) => up({ href })} placeholder="/blog atau /#pricing" />
              <SelectField label="Target" value={it.target} onChange={(target) => up({ target: target as "_self" | "_blank" })}
                options={[{ label: "Sama tab", value: "_self" }, { label: "Tab baru", value: "_blank" }]} />
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
