import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/admin/log";
import { Card } from "@/components/admin/ui";
import { SectionMetaForm } from "./SectionMetaForm";
import { EditorToolbar, type SectionStatus } from "./EditorToolbar";
import { UnsavedDialog } from "./UnsavedDialog";
import { VersionPanel, type VersionRow } from "./VersionPanel";
import { DEFAULTS, SECTION_META, type SectionKey } from "@/data/homepageDefaults";
import {
  splitMeta, joinMeta, jsonEqual, DEFAULT_META, type SectionMeta,
} from "@/lib/admin/sectionMeta";
import { validateTitle, validateMeta, validateContent } from "@/lib/admin/sectionValidators";
import { useDirtyGuard } from "@/lib/admin/useDirtyGuard";

type Row = {
  section_key: string;
  title: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  data: unknown;
  draft_data: unknown;
  status: string | null;
  last_saved_at: string | null;
  last_saved_by: string | null;
  last_published_at: string | null;
};

export function SectionEditor<T>({
  sectionKey,
  render,
  previewHash,
  showSubtitle = true,
}: {
  sectionKey: SectionKey;
  render: (value: T, onChange: (v: T) => void) => ReactNode;
  previewHash?: string;
  showSubtitle?: boolean;
}) {
  const meta = SECTION_META[sectionKey];

  /* ---------- loaded from server ---------- */
  const [loaded, setLoaded] = useState(false);
  const [serverDraft, setServerDraft] = useState<Record<string, unknown> | null>(null);
  const [serverPublished, setServerPublished] = useState<Record<string, unknown> | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedByName, setSavedByName] = useState<string | null>(null);
  const [versionReloadKey, setVersionReloadKey] = useState(0);

  /* ---------- local editable state ---------- */
  const [content, setContent] = useState<T | null>(null);
  const [sectionMeta, setSectionMeta] = useState<SectionMeta>(DEFAULT_META);
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(meta.sortOrder);
  const [visible, setVisible] = useState(true);

  /* ---------- ui state ---------- */
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const bootstrap = useRef(false);

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase
        .from("homepage_sections").select("*").eq("section_key", sectionKey).maybeSingle();

      const defaultRaw = joinMeta(DEFAULT_META, DEFAULTS[sectionKey]);

      if (!existing) {
        await supabase.from("homepage_sections").insert({
          section_key: sectionKey,
          title: meta.title,
          data: defaultRaw as never,
          draft_data: defaultRaw as never,
          is_visible: true,
          sort_order: meta.sortOrder,
          status: "draft",
        });
        applyRow({
          section_key: sectionKey,
          title: meta.title,
          sort_order: meta.sortOrder,
          is_visible: true,
          data: defaultRaw,
          draft_data: defaultRaw,
          status: "draft",
          last_saved_at: null,
          last_saved_by: null,
          last_published_at: null,
        });
      } else {
        const row = existing as unknown as Row;
        const draft = row.draft_data ?? row.data ?? defaultRaw;
        const published = row.data ?? row.draft_data ?? defaultRaw;
        applyRow({
          ...row,
          draft_data: draft,
          data: published,
        });
        if (row.last_saved_by) {
          const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", row.last_saved_by).maybeSingle();
          setSavedByName((prof as { full_name?: string } | null)?.full_name ?? null);
        }
      }
      setLoaded(true);
      bootstrap.current = true;
    })();

    function applyRow(row: Row) {
      const draftRaw = row.draft_data as Record<string, unknown>;
      const pubRaw = row.data as Record<string, unknown>;
      setServerDraft(draftRaw);
      setServerPublished(pubRaw);
      const { meta: mm, content: cc } = splitMeta<T>(draftRaw);
      setSectionMeta(mm);
      setContent(cc);
      setTitle(row.title ?? meta.title);
      setSortOrder(row.sort_order ?? meta.sortOrder);
      setVisible(row.is_visible ?? true);
      setSavedAt(row.last_saved_at);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  /* ---------- dirty tracking ---------- */
  const currentRaw = useMemo(
    () => (content === null ? null : joinMeta(sectionMeta, content)),
    [content, sectionMeta],
  );
  const isDirty = useMemo(() => {
    if (!currentRaw || !serverDraft) return false;
    return !jsonEqual(currentRaw, serverDraft);
  }, [currentRaw, serverDraft]);

  // Track title/order/visible dirty separately (server row values snapshot).
  const [rowSnap, setRowSnap] = useState<{ title: string; sortOrder: number; visible: boolean } | null>(null);
  useEffect(() => {
    if (loaded && rowSnap === null && serverDraft !== null) {
      setRowSnap({ title, sortOrder, visible });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, serverDraft]);
  const rowDirty = rowSnap
    ? rowSnap.title !== title || rowSnap.sortOrder !== sortOrder || rowSnap.visible !== visible
    : false;

  const anyDirty = isDirty || rowDirty;

  const status: SectionStatus = useMemo(() => {
    if (!serverPublished || !serverDraft) return "draft";
    if (jsonEqual(serverPublished, serverDraft)) return "published";
    return "modified";
  }, [serverPublished, serverDraft]);

  /* ---------- navigation guard ---------- */
  const blocker = useDirtyGuard(anyDirty);

  /* ---------- validation ---------- */
  function validate(): string[] {
    const errs = [
      ...validateTitle(title),
      ...validateMeta(sectionMeta),
      ...(content ? validateContent(sectionKey, content) : []),
    ];
    setValidationErrors(errs);
    return errs;
  }

  /* ---------- actions ---------- */
  async function saveDraft(): Promise<boolean> {
    if (!content) return false;
    const errs = validate();
    if (errs.length) {
      toast.error("Perubahan gagal disimpan", { description: errs[0] });
      return false;
    }
    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const payload = joinMeta(sectionMeta, content);
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("homepage_sections")
        .update({
          title,
          sort_order: sortOrder,
          is_visible: visible,
          draft_data: payload as never,
          status: serverPublished && jsonEqual(serverPublished, payload) ? "published" : (serverPublished ? "modified" : "draft"),
          last_saved_at: nowIso,
          last_saved_by: user?.id ?? null,
        })
        .eq("section_key", sectionKey);
      if (error) {
        toast.error("Perubahan gagal disimpan", { description: "Silakan coba lagi." });
        return false;
      }
      setServerDraft(payload);
      setSavedAt(nowIso);
      setRowSnap({ title, sortOrder, visible });
      await logActivity("save_draft_section", "homepage_sections", sectionKey);
      toast.success("Perubahan berhasil disimpan sebagai draft");
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!content) return;
    // Ensure latest draft is saved first if dirty.
    if (anyDirty) {
      const ok = await saveDraft();
      if (!ok) return;
    }
    const errs = validate();
    if (errs.length) {
      toast.error("Publish dibatalkan", { description: errs[0] });
      return;
    }
    setPublishing(true);
    try {
      const payload = joinMeta(sectionMeta, content);
      const nowIso = new Date().toISOString();
      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase
        .from("homepage_sections")
        .update({
          title,
          sort_order: sortOrder,
          is_visible: visible,
          data: payload as never,
          draft_data: payload as never,
          status: "published",
          last_published_at: nowIso,
          last_saved_at: nowIso,
          last_saved_by: user?.id ?? null,
        })
        .eq("section_key", sectionKey);
      if (error) {
        toast.error("Gagal mem-publish", { description: "Silakan coba lagi." });
        return;
      }

      // Version bump: next version number = max + 1
      const { data: last } = await supabase
        .from("homepage_section_versions")
        .select("version")
        .eq("section_key", sectionKey)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVersion = ((last as { version?: number } | null)?.version ?? 0) + 1;
      await supabase.from("homepage_section_versions").insert({
        section_key: sectionKey,
        version: nextVersion,
        title,
        data: payload as never,
        created_by: user?.id ?? null,
        note: `Publish v${nextVersion}`,
      });

      setServerPublished(payload);
      setServerDraft(payload);
      setSavedAt(nowIso);
      setRowSnap({ title, sortOrder, visible });
      setVersionReloadKey((k) => k + 1);
      await logActivity("publish_section", "homepage_sections", sectionKey);
      toast.success(`Berhasil di-publish (Version ${nextVersion})`);
    } finally {
      setPublishing(false);
    }
  }

  function resetLocal() {
    if (!serverDraft) return;
    const { meta: mm, content: cc } = splitMeta<T>(serverDraft);
    setSectionMeta(mm);
    setContent(cc);
    if (rowSnap) {
      setTitle(rowSnap.title);
      setSortOrder(rowSnap.sortOrder);
      setVisible(rowSnap.visible);
    }
    setValidationErrors([]);
    toast("Perubahan dikembalikan ke draft terakhir");
  }

  function openPreview() {
    const url = `/${previewHash ?? ""}${previewHash?.includes("?") ? "&" : "?"}preview=${sectionKey}&t=${Date.now()}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function restoreVersion(v: VersionRow) {
    if (anyDirty && !window.confirm("Restore akan mengganti draft saat ini. Lanjutkan?")) return;
    const raw = (v.data ?? {}) as Record<string, unknown>;
    const { meta: mm, content: cc } = splitMeta<T>(raw);
    setSectionMeta(mm);
    setContent(cc);
    if (v.title) setTitle(v.title);
    toast(`Versi ${v.version} dimuat ke draft. Klik Save Draft lalu Publish untuk mengaktifkan.`);
  }

  if (!loaded || content === null) {
    return <div className="text-sm text-muted-foreground">Memuat data section…</div>;
  }

  const canPublish = !!content;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/website/homepage" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Homepage
          </Link>
          <h1 className="text-2xl font-bold text-secondary">Section: {meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>
      </div>

      <EditorToolbar
        status={status}
        isDirty={anyDirty}
        saving={saving}
        publishing={publishing}
        canPublish={canPublish}
        onSaveDraft={saveDraft}
        onPreview={openPreview}
        onPublish={publish}
        onReset={resetLocal}
        lastSavedAt={savedAt}
        lastSavedByName={savedByName}
      />

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" /> Validasi gagal
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-red-700">
            {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Pengaturan Section</h3>
        <SectionMetaForm
          title={title}
          sortOrder={sortOrder}
          visible={visible}
          meta={sectionMeta}
          onTitle={setTitle}
          onSortOrder={setSortOrder}
          onVisible={setVisible}
          onMeta={setSectionMeta}
          showSubtitle={showSubtitle}
        />
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Konten Section</h3>
        {render(content, setContent)}
      </Card>

      <VersionPanel sectionKey={sectionKey} reloadKey={versionReloadKey} onRestore={restoreVersion} />

      <UnsavedDialog
        open={blocker.status === "blocked"}
        saving={saving}
        onSave={async () => {
          const ok = await saveDraft();
          if (ok && blocker.status === "blocked") blocker.proceed?.();
        }}
        onDiscard={() => blocker.status === "blocked" && blocker.proceed?.()}
        onCancel={() => blocker.status === "blocked" && blocker.reset?.()}
      />
    </div>
  );
}
