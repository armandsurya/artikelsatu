import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PUBLISHED_QUERY_KEY } from "@/lib/publishedContent";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/admin/log";
import { Card } from "@/components/admin/ui";
import { SectionMetaForm } from "./SectionMetaForm";
import { EditorToolbar, type SectionStatus } from "./EditorToolbar";
import { UnsavedDialog } from "./UnsavedDialog";
import { VersionPanel, type VersionRow } from "./VersionPanel";
import {
  DEFAULTS,
  SECTION_META,
  SECTION_META_DEFAULTS,
  type SectionKey,
} from "@/data/homepageDefaults";
import {
  splitMeta,
  joinMeta,
  jsonEqual,
  DEFAULT_META,
  type SectionMeta,
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
  const queryClient = useQueryClient();

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
        .from("homepage_sections")
        .select("*")
        .eq("section_key", sectionKey)
        .maybeSingle();

      // Seed defaults with per-section meta so admin sees the current frontend badge/subtitle.
      const seedMeta: SectionMeta = { ...DEFAULT_META, ...SECTION_META_DEFAULTS[sectionKey] };
      const defaultRaw = joinMeta(seedMeta, DEFAULTS[sectionKey]);
      const isEmpty = (v: unknown) =>
        !v || typeof v !== "object" || Array.isArray(v) || Object.keys(v as object).length === 0;

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
        const draftEmpty = isEmpty(row.draft_data);
        const pubEmpty = isEmpty(row.data);
        const draft = draftEmpty ? (pubEmpty ? defaultRaw : row.data) : row.draft_data;
        const published = pubEmpty ? (draftEmpty ? defaultRaw : row.draft_data) : row.data;

        // Backfill the DB with frontend defaults so subsequent loads are stable.
        if (draftEmpty || pubEmpty) {
          await supabase
            .from("homepage_sections")
            .update({
              data: published as never,
              draft_data: draft as never,
              title: row.title ?? meta.title,
              sort_order: row.sort_order ?? meta.sortOrder,
            })
            .eq("section_key", sectionKey);
        }

        applyRow({ ...row, draft_data: draft, data: published });
        if (row.last_saved_by) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", row.last_saved_by)
            .maybeSingle();
          setSavedByName((prof as { full_name?: string } | null)?.full_name ?? null);
        }
      }
      setLoaded(true);
      bootstrap.current = true;
    })();

    function applyRow(row: Row) {
      const draftRaw = row.draft_data as Record<string, unknown>;
      const pubRaw = row.data as Record<string, unknown>;
      const { meta: mm, content: cc } = splitMeta<T>(draftRaw);
      // Backfill badge/subtitle from per-section defaults so admin sees actual
      // current frontend values instead of empty fields. Normalize serverDraft
      // with the same merged meta so isDirty doesn't fire on first load.
      const d = SECTION_META_DEFAULTS[sectionKey];
      const mergedMeta: SectionMeta = {
        ...mm,
        badge: (mm.badge && mm.badge.trim()) || d.badge,
        subtitle: (mm.subtitle && mm.subtitle.trim()) || d.subtitle,
      };
      const normalizedDraft = joinMeta(mergedMeta, cc);
      const { meta: pubMeta, content: pubContent } = splitMeta<T>(pubRaw);
      const mergedPubMeta: SectionMeta = {
        ...pubMeta,
        badge: (pubMeta.badge && pubMeta.badge.trim()) || d.badge,
        subtitle: (pubMeta.subtitle && pubMeta.subtitle.trim()) || d.subtitle,
      };
      const normalizedPub = joinMeta(mergedPubMeta, pubContent);
      setServerDraft(normalizedDraft);
      setServerPublished(normalizedPub);
      setSectionMeta(mergedMeta);
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
  const [rowSnap, setRowSnap] = useState<{
    title: string;
    sortOrder: number;
    visible: boolean;
  } | null>(null);
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
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        console.error("[saveDraft] no auth session", userErr);
        toast.error("Sesi login berakhir", {
          description: "Silakan login ulang sebelum menyimpan.",
        });
        return false;
      }
      const user = userData.user;
      const payload = joinMeta(sectionMeta, content);
      const nowIso = new Date().toISOString();
      console.info("[saveDraft] payload", {
        sectionKey,
        userId: user.id,
        title,
        payloadSize: JSON.stringify(payload).length,
      });
      const { data: updated, error } = await supabase
        .from("homepage_sections")
        .update({
          title,
          sort_order: sortOrder,
          is_visible: visible,
          draft_data: payload as never,
          status:
            serverPublished && jsonEqual(serverPublished, payload)
              ? "published"
              : serverPublished
                ? "modified"
                : "draft",
          last_saved_at: nowIso,
          last_saved_by: user.id,
        })
        .eq("section_key", sectionKey)
        .select();
      if (error) {
        console.error("[saveDraft] update error", error);
        const desc = [error.message, error.code && `(code ${error.code})`, error.hint]
          .filter(Boolean)
          .join(" ");
        toast.error("Perubahan gagal disimpan", { description: desc || "Silakan coba lagi." });
        return false;
      }
      if (!updated || updated.length === 0) {
        console.error("[saveDraft] 0 rows updated — RLS likely blocked write", {
          sectionKey,
          userId: user.id,
        });
        toast.error("Perubahan tidak tersimpan", {
          description:
            "Tidak ada baris yang ter-update. Akun Anda kemungkinan bukan super_admin atau session sudah kadaluarsa. Silakan login ulang.",
        });
        return false;
      }
      setServerDraft(payload);
      setSavedAt(nowIso);
      setRowSnap({ title, sortOrder, visible });
      await logActivity("save_draft_section", "homepage_sections", sectionKey);
      toast.success("Perubahan berhasil disimpan sebagai draft");
      return true;
    } catch (e) {
      console.error("[saveDraft] unexpected", e);
      toast.error("Perubahan gagal disimpan", {
        description: e instanceof Error ? e.message : String(e),
      });
      return false;
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
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        console.error("[publish] no auth session", userErr);
        toast.error("Sesi login berakhir", { description: "Silakan login ulang sebelum publish." });
        return;
      }
      const user = userData.user;
      console.info("[publish] payload", {
        sectionKey,
        userId: user.id,
        payloadSize: JSON.stringify(payload).length,
      });

      const { data: updated, error } = await supabase
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
          last_saved_by: user.id,
        })
        .eq("section_key", sectionKey)
        .select();
      if (error) {
        console.error("[publish] update error", error);
        const desc = [error.message, error.code && `(code ${error.code})`, error.hint]
          .filter(Boolean)
          .join(" ");
        toast.error("Gagal mem-publish", { description: desc || "Silakan coba lagi." });
        return;
      }
      if (!updated || updated.length === 0) {
        console.error("[publish] 0 rows updated — RLS likely blocked", {
          sectionKey,
          userId: user.id,
        });
        toast.error("Publish gagal", {
          description:
            "Tidak ada baris yang ter-update. Akun Anda kemungkinan bukan super_admin atau session sudah kadaluarsa.",
        });
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
      const { error: versionErr } = await supabase.from("homepage_section_versions").insert({
        section_key: sectionKey,
        version: nextVersion,
        title,
        data: payload as never,
        created_by: user.id,
        note: `Publish v${nextVersion}`,
      });
      if (versionErr) console.warn("[publish] version insert failed (non-fatal)", versionErr);

      setServerPublished(payload);
      setServerDraft(payload);
      setSavedAt(nowIso);
      setRowSnap({ title, sortOrder, visible });
      setVersionReloadKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: PUBLISHED_QUERY_KEY });
      // Sync media usage for known image fields in this section
      try {
        await clearMediaUsage("homepage_section", sectionKey);
        const c = content as unknown as Record<string, unknown>;
        const track = async (url: unknown, field: string) => {
          if (typeof url === "string" && url)
            await trackMediaUsage(url, "homepage_section", sectionKey, field);
        };
        if (sectionKey === "hero") await track(c.image, "image");
        if (sectionKey === "cta") await track(c.backgroundImage, "background");
        if (Array.isArray((c as { items?: unknown[] }).items)) {
          const items = (c as { items: Array<Record<string, unknown>> }).items;
          for (let i = 0; i < items.length; i++) {
            await track(items[i].thumbnail, `items.${i}.thumbnail`);
            await track(items[i].image, `items.${i}.image`);
          }
        }
      } catch (usageErr) {
        console.warn("[publish] usage sync failed (non-fatal)", usageErr);
      }
      await logActivity("publish_section", "homepage_sections", sectionKey);
      toast.success(`Berhasil di-publish (Version ${nextVersion})`);
    } catch (e) {
      console.error("[publish] unexpected", e);
      toast.error("Gagal mem-publish", { description: e instanceof Error ? e.message : String(e) });
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
          <Link
            to="/admin/website/homepage"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary"
          >
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
            {validationErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {sectionKey !== "hero" && (
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
      )}

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Konten Section</h3>
        {render(content, setContent)}
      </Card>

      <VersionPanel
        sectionKey={sectionKey}
        reloadKey={versionReloadKey}
        onRestore={restoreVersion}
      />

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
