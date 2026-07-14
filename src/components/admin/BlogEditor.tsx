import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, Field, inputCls, labelCls, btnPrimary, btnGhost, btnDanger } from "./ui";
import { CKEditorField } from "./CKEditorField";
import { contentStats } from "@/lib/editor/sanitize";
import { MediaPicker } from "./homepage/primitives";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { logActivity, slugify } from "@/lib/admin/log";
import { analyzeSeo } from "@/lib/blog/seoScore";
import { saveRevision, listRevisions, getRevision } from "@/lib/blog/revisions";
import {
  ArrowLeft, Save, Loader2, Eye, Send, Copy, EyeOff, Archive, RotateCcw,
  Check, AlertCircle, FileText, History, Clock, Image as ImageIcon,
  Search as SearchIcon, Settings as SettingsIcon,
  ExternalLink, X as CloseIcon,
} from "lucide-react";

const PREVIEW_DRAFT_KEY = "lovable:blog-preview-draft";
const PREVIEW_WINDOW_NAME = "lovable-blog-preview";
import type { Database } from "@/integrations/supabase/types";

type Props = { mode: "new" | "edit"; id?: string; onSaved?: (id: string) => void };
type Status = Database["public"]["Enums"]["post_status"];
type TabKey = "konten" | "media" | "seo" | "pengaturan" | "revisi";

function calcReadTime(html: string) {
  const s = contentStats(html);
  return { words: s.words, chars: s.chars, minutes: Math.max(1, s.minutes || 1) };
}

async function ensureUniqueSlug(base: string, ignoreId?: string) {
  let candidate = base || "artikel";
  let i = 2;
  while (true) {
    const { data, error } = await supabase.from("blog_posts").select("id").eq("slug", candidate).limit(1);
    if (error) throw error;
    const clash = (data ?? []).find((r) => r.id !== ignoreId);
    if (!clash) return candidate;
    candidate = `${base}-${i++}`;
    if (i > 500) throw new Error("Tidak dapat menghasilkan slug unik");
  }
}

const STATUS_STYLES: Record<Status | "new", string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-green-50 text-green-700",
  scheduled: "bg-blue-50 text-blue-700",
  archived: "bg-slate-200 text-slate-700",
  new: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<Status | "new", string> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  scheduled: "SCHEDULED",
  archived: "ARCHIVED",
  new: "ARTIKEL BARU",
};


const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "konten", label: "Konten", icon: FileText },
  { key: "media", label: "Media", icon: ImageIcon },
  { key: "seo", label: "SEO", icon: SearchIcon },
  { key: "pengaturan", label: "Pengaturan", icon: SettingsIcon },
  { key: "revisi", label: "Revisi", icon: History },
];

export function BlogEditor({ mode, id, onSaved }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [canonical, setCanonical] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDesc, setOgDesc] = useState("");
  const [robotsIndex, setRobotsIndex] = useState<"index" | "noindex">("index");
  const [tags, setTags] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [readTime, setReadTime] = useState(5);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState<null | "draft" | "publish" | "unpublish" | "duplicate" | "schedule" | "archive" | "restore">(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [isPersisted, setIsPersisted] = useState(mode === "edit");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("konten");
  const currentId = useRef<string | undefined>(id);
  const previewWinRef = useRef<Window | null>(null);
  const [quickPreviewOpen, setQuickPreviewOpen] = useState(false);
  const [quickPreviewTick, setQuickPreviewTick] = useState(0);

  function writePreviewDraft() {
    const payload = {
      id: currentId.current ?? "draft",
      title: title || "(Tanpa Judul)",
      slug,
      excerpt: excerpt || null,
      content,
      featured_image: featuredImage || null,
      category_id: categoryId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      read_time: readTime,
      status,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : lastPublishedAt,
      updated_at: new Date().toISOString(),
      author_id: authorId,
      meta_title: metaTitle || null,
      meta_description: metaDesc || null,
    };
    try { localStorage.setItem(PREVIEW_DRAFT_KEY, JSON.stringify(payload)); } catch (e) { console.warn("preview draft write failed", e); }
    return payload;
  }

  function openPreviewTab() {
    const payload = writePreviewDraft();
    const url = `/admin/blog/preview/${payload.id}?live=1&t=${Date.now()}`;
    if (previewWinRef.current && !previewWinRef.current.closed) {
      try {
        previewWinRef.current.location.href = url;
        previewWinRef.current.focus();
        return;
      } catch { /* fallthrough */ }
    }
    previewWinRef.current = window.open(url, PREVIEW_WINDOW_NAME);
  }

  function openQuickPreview() {
    writePreviewDraft();
    setQuickPreviewTick((t) => t + 1);
    setQuickPreviewOpen(true);
  }

  useEffect(() => {
    if (!quickPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setQuickPreviewOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [quickPreviewOpen]);


  type Snapshot = {
    title: string; slug: string; excerpt: string; content: string;
    featuredImage: string; imageAlt: string; imageCaption: string;
    categoryId: string; metaTitle: string; metaDesc: string; canonical: string;
    ogTitle: string; ogDesc: string; robotsIndex: string;
    tags: string; focusKeyword: string; publishedAt: string; scheduledAt: string;
  };
  const emptySnap: Snapshot = {
    title: "", slug: "", excerpt: "", content: "", featuredImage: "", imageAlt: "",
    imageCaption: "", categoryId: "", metaTitle: "", metaDesc: "", canonical: "",
    ogTitle: "", ogDesc: "", robotsIndex: "index", tags: "", focusKeyword: "",
    publishedAt: "", scheduledAt: "",
  };
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnap);

  const currentSnap: Snapshot = {
    title, slug, excerpt, content, featuredImage, imageAlt, imageCaption,
    categoryId, metaTitle, metaDesc, canonical, ogTitle, ogDesc, robotsIndex,
    tags, focusKeyword, publishedAt, scheduledAt,
  };
  const dirty = useMemo(
    () => JSON.stringify(currentSnap) !== JSON.stringify(snapshot),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSnap.title, currentSnap.slug, currentSnap.excerpt, currentSnap.content,
     currentSnap.featuredImage, currentSnap.imageAlt, currentSnap.imageCaption,
     currentSnap.categoryId, currentSnap.metaTitle, currentSnap.metaDesc,
     currentSnap.canonical, currentSnap.ogTitle, currentSnap.ogDesc,
     currentSnap.robotsIndex, currentSnap.tags, currentSnap.focusKeyword,
     currentSnap.publishedAt, currentSnap.scheduledAt, snapshot],
  );

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("blog_categories").select("id, name").order("name")).data ?? [],
  });

  const { data: authorName } = useQuery({
    queryKey: ["profile-name", authorId],
    enabled: !!authorId,
    queryFn: async () => (await supabase.from("profiles").select("full_name").eq("id", authorId!).maybeSingle()).data?.full_name ?? null,
  });

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    supabase.from("blog_posts").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) { setToast({ kind: "err", msg: `Gagal memuat: ${error.message}` }); setLoading(false); return; }
      if (!data) { setLoading(false); return; }
      const loaded: Snapshot = {
        title: data.title, slug: data.slug, excerpt: data.excerpt ?? "",
        content: (typeof data.content === "string" ? data.content : "") ?? "",
        featuredImage: data.featured_image ?? "", imageAlt: "", imageCaption: "",
        categoryId: data.category_id ?? "", metaTitle: data.meta_title ?? "",
        metaDesc: data.meta_description ?? "", canonical: data.canonical_url ?? "",
        ogTitle: "", ogDesc: "", robotsIndex: "index",
        tags: (data.tags ?? []).join(", "), focusKeyword: "",
        publishedAt: data.published_at ? data.published_at.slice(0, 16) : "",
        scheduledAt: data.scheduled_at ? data.scheduled_at.slice(0, 16) : "",
      };
      setTitle(loaded.title); setSlug(loaded.slug); setExcerpt(loaded.excerpt);
      setContent(loaded.content); setFeaturedImage(loaded.featuredImage);
      setCategoryId(loaded.categoryId); setMetaTitle(loaded.metaTitle);
      setMetaDesc(loaded.metaDesc); setCanonical(loaded.canonical);
      setTags(loaded.tags); setStatus(data.status); setReadTime(data.read_time ?? 5);
      setPublishedAt(loaded.publishedAt); setScheduledAt(loaded.scheduledAt);
      setLastSavedAt(data.updated_at ?? null);
      setLastPublishedAt(data.published_at ?? null);
      setAuthorId(data.author_id ?? null);
      setSnapshot(loaded);
      setIsPersisted(true);
      setLoading(false);
    });
  }, [mode, id]);

  // Auto-slug from title for new posts, only while slug hasn't been persisted.
  useEffect(() => {
    if (mode === "new" && title && !slug) setSlug(slugify(title));
  }, [title, slug, mode]);


  const stats = useMemo(() => calcReadTime(content), [content]);
  useEffect(() => { if (stats.minutes && stats.minutes !== readTime) setReadTime(stats.minutes); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stats.minutes]);

  const seo = useMemo(
    () => analyzeSeo({ title, metaTitle: metaTitle || title, metaDescription: metaDesc, contentHtml: content, focusKeyword }),
    [title, metaTitle, metaDesc, content, focusKeyword],
  );

  // Refs let the blocker read the latest values without depending on stale render closures.
  const dirtyRef = useRef(false);
  const bypassGuardRef = useRef(false);
  const isPersistedRef = useRef(isPersisted);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { isPersistedRef.current = isPersisted; }, [isPersisted]);

  useBlocker({
    shouldBlockFn: () => {
      if (bypassGuardRef.current) {
        bypassGuardRef.current = false;
        if (import.meta.env.DEV) console.debug("[BlogEditor] guard bypassed after successful save/publish");
        return false;
      }
      if (!dirtyRef.current) return false;
      const msg = !isPersistedRef.current
        ? "Anda sedang membuat artikel baru dan terdapat perubahan yang belum disimpan. Apakah Anda yakin ingin keluar? Perubahan yang belum disimpan akan hilang."
        : "Perubahan pada artikel ini belum disimpan. Apakah Anda yakin ingin meninggalkan halaman? Perubahan terakhir akan hilang.";
      // eslint-disable-next-line no-alert
      return !confirm(msg);
    },
    enableBeforeUnload: () => dirtyRef.current && !bypassGuardRef.current,
  });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      console.debug("[BlogEditor] state", {
        dirty, isPersisted, status,
        bypassGuard: bypassGuardRef.current,
        snapshotKeys: Object.keys(snapshot).length,
      });
    }, [dirty, isPersisted, status, snapshot]);
  }

  const checklist = useMemo(() => ({
    title: !!title.trim(),
    slug: !!slug.trim(),
    category: !!categoryId,
    content: stats.words >= 30,
    metaTitle: !!metaTitle.trim(),
    metaDesc: metaDesc.trim().length >= 50 && metaDesc.trim().length <= 160,
  }), [title, slug, categoryId, stats.words, metaTitle, metaDesc]);
  const publishReady = Object.values(checklist).every(Boolean);
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const checklistTotal = Object.keys(checklist).length;

  async function persist(nextStatus: Status, opts: { schedule?: string | null } = {}): Promise<{ id: string; slug: string } | null> {
    if (!title.trim()) throw new Error("Judul artikel wajib diisi");
    const baseSlug = slugify(slug || title);
    const uniqueSlug = await ensureUniqueSlug(baseSlug, currentId.current);
    if (uniqueSlug !== slug) setSlug(uniqueSlug);

    const nowIso = new Date().toISOString();
    const { data: user } = await supabase.auth.getUser();
    const scheduleIso = opts.schedule ? new Date(opts.schedule).toISOString() : null;

    const payload = {
      title: title.trim(),
      slug: uniqueSlug,
      excerpt: excerpt.trim() || null,
      content: content as never,
      featured_image: featuredImage || null,
      category_id: categoryId || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDesc.trim() || null,
      canonical_url: canonical.trim() || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: nextStatus,
      read_time: readTime,
      published_at:
        nextStatus === "published"
          ? (publishedAt ? new Date(publishedAt).toISOString() : (lastPublishedAt ?? nowIso))
          : nextStatus === "archived" ? lastPublishedAt : null,
      scheduled_at: nextStatus === "scheduled" ? scheduleIso : null,
      seo_score: seo.score,
      seo_report: seo as never,
      author_id: authorId ?? user.user?.id,
      last_editor_id: user.user?.id,
    };

    let saved: { id: string; slug: string; published_at: string | null; updated_at: string };
    if (!currentId.current) {
      const { data, error } = await supabase.from("blog_posts").insert(payload).select("id, slug, published_at, updated_at").single();
      if (error) throw error;
      currentId.current = data.id;
      saved = data;
      onSaved?.(data.id);
    } else {
      const { data, error } = await supabase.from("blog_posts").update(payload).eq("id", currentId.current).select("id, slug, published_at, updated_at").single();
      if (error) throw error;
      saved = data;
    }

    if (featuredImage) await trackMediaUsage(featuredImage, "blog_post", saved.id, "featured_image");
    else await clearMediaUsage("blog_post", saved.id, "featured_image");

    await logActivity(
      nextStatus === "published" ? "publish_post"
      : nextStatus === "scheduled" ? "schedule_post"
      : nextStatus === "archived" ? "archive_post"
      : "save_post",
      "blog_posts", saved.id, { title: payload.title, status: nextStatus },
    );

    try {
      await saveRevision({
        post_id: saved.id,
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        content: payload.content,
        featured_image: payload.featured_image,
        meta_title: payload.meta_title,
        meta_description: payload.meta_description,
        canonical_url: payload.canonical_url,
        tags: payload.tags,
        category_id: payload.category_id,
        status: nextStatus,
        seo_score: payload.seo_score,
        reason: nextStatus,
      });
    } catch (e) {
      console.warn("saveRevision failed", e);
    }

    setLastSavedAt(saved.updated_at);
    setLastPublishedAt(saved.published_at ?? null);
    return { id: saved.id, slug: saved.slug };
  }

  async function handle(action: "draft" | "publish" | "unpublish" | "schedule" | "archive" | "restore") {
    setBusy(action);
    setToast(null);
    try {
      let nextStatus: Status;
      let schedule: string | null = null;
      if (action === "publish") {
        if (!publishReady) throw new Error("Checklist Publish belum lengkap. Cek tab SEO & Konten.");
        nextStatus = "published";
      } else if (action === "schedule") {
        if (!scheduledAt) throw new Error("Tentukan tanggal & waktu publish di tab Pengaturan.");
        if (new Date(scheduledAt).getTime() <= Date.now()) throw new Error("Waktu jadwal harus di masa depan.");
        if (!publishReady) throw new Error("Checklist Publish belum lengkap.");
        nextStatus = "scheduled";
        schedule = scheduledAt;
      } else if (action === "archive") {
        nextStatus = "archived";
      } else if (action === "restore") {
        nextStatus = "draft";
      } else if (action === "unpublish") {
        nextStatus = "draft";
      } else {
        nextStatus = "draft";
      }
      const res = await persist(nextStatus, { schedule });
      setStatus(nextStatus);
      setIsPersisted(true);
      isPersistedRef.current = true;
      // Snapshot current values (incl. any slug rewritten during persist)
      const newSnap: Snapshot = {
        title, slug: res?.slug ?? slug, excerpt, content, featuredImage, imageAlt, imageCaption,
        categoryId, metaTitle, metaDesc, canonical, ogTitle, ogDesc, robotsIndex,
        tags, focusKeyword, publishedAt, scheduledAt,
      };
      setSnapshot(newSnap);
      dirtyRef.current = false;
      bypassGuardRef.current = true;
      if (import.meta.env.DEV) console.debug("[BlogEditor] persisted → snapshot reset", { action, saved: res });
      qc.invalidateQueries({ queryKey: ["published"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-revisions"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });

      const msg =
        action === "publish" ? "Artikel berhasil dipublikasikan"
        : action === "schedule" ? "Jadwal publish tersimpan"
        : action === "unpublish" ? "Artikel dikembalikan menjadi Draft"
        : action === "archive" ? "Artikel diarsipkan"
        : action === "restore" ? "Artikel dikembalikan dari arsip menjadi Draft"
        : "Draft berhasil disimpan";
      setToast({ kind: "ok", msg });
      if (mode === "new" && res) {
        bypassGuardRef.current = true;
        navigate({ to: "/admin/blog/$id", params: { id: res.id } });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
      setToast({ kind: "err", msg: `Gagal: ${msg}` });
    } finally {
      setBusy(null);
    }
  }

  /* Autosave — every 60s, drafts only, requires title + dirty state.
     Never triggers publish; only silently writes as `draft` when the article
     is already a draft. Skips when user is actively busy or in a modal flow. */
  const busyRef = useRef(busy);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => {
    const iv = setInterval(() => {
      if (busyRef.current) return;
      if (!dirtyRef.current) return;
      if (!title.trim()) return;
      if (status !== "draft") return; // never overwrite scheduled/published/archived
      // Fire and forget; handle() manages its own toast/busy states.
      handle("draft").catch((e) => console.warn("[autosave]", e));
    }, 60_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, status]);

  async function handleDuplicate() {
    if (!currentId.current) return;
    setBusy("duplicate");
    try {
      const baseSlug = await ensureUniqueSlug(`${slug || slugify(title)}-copy`);
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("blog_posts").insert({
        title: `${title} (Copy)`,
        slug: baseSlug,
        excerpt: excerpt || null,
        content: content as never,
        featured_image: featuredImage || null,
        category_id: categoryId || null,
        meta_title: metaTitle || null,
        meta_description: metaDesc || null,
        canonical_url: null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: "draft" as Status,
        read_time: readTime,
        published_at: null,
        author_id: user.user?.id,
      }).select("id").single();
      if (error) throw error;
      await logActivity("duplicate_post", "blog_posts", data.id, { source: currentId.current });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      bypassGuardRef.current = true;
      navigate({ to: "/admin/blog/$id", params: { id: data.id } });
    } catch (e: unknown) {
      setToast({ kind: "err", msg: `Gagal duplikat: ${e instanceof Error ? e.message : "error"}` });
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  const bandColor = seo.band === "green" ? "text-green-700 bg-green-50 border-green-200"
    : seo.band === "yellow" ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <div>
      {/* Header: tombol aksi */}
      <div className="z-20 -mx-6 mb-4 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/admin/blog" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {currentId.current && (
              <button onClick={handleDuplicate} disabled={!!busy} className={btnGhost} title="Duplikat artikel">
                {busy === "duplicate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate
              </button>
            )}
            <button onClick={openPreviewTab} disabled={!title.trim()} className={btnGhost} title="Buka preview di tab baru">
              <ExternalLink className="h-4 w-4" /> Preview
            </button>
            <button onClick={openQuickPreview} disabled={!title.trim()} className={btnGhost} title="Quick Preview (modal)">
              <Eye className="h-4 w-4" /> Quick Preview
            </button>
            {status === "archived" ? (
              <button onClick={() => handle("restore")} disabled={!!busy} className={btnGhost}>
                {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restore
              </button>
            ) : (
              <>
                {status === "published" && (
                  <button onClick={() => handle("unpublish")} disabled={!!busy} className={btnGhost}>
                    {busy === "unpublish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} Unpublish
                  </button>
                )}
                {currentId.current && (
                  <button onClick={() => handle("archive")} disabled={!!busy} className={btnDanger + " !py-1.5"}>
                    {busy === "archive" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Archive
                  </button>
                )}
                <button onClick={() => handle("draft")} disabled={!!busy || !title.trim()} className={btnGhost}>
                  {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
                </button>
                {scheduledAt && status !== "published" && (
                  <button onClick={() => handle("schedule")} disabled={!!busy || !publishReady} className={btnGhost} title="Jadwalkan publish">
                    {busy === "schedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />} Schedule
                  </button>
                )}
                <button onClick={() => handle("publish")} disabled={!!busy || !publishReady} className={btnPrimary}
                  title={publishReady ? "Publish artikel" : "Lengkapi checklist (lihat tab SEO)"}>
                  {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {status === "published" ? "Update Publish" : "Publish"}
                </button>
              </>
            )}
          </div>
        </div>
        {toast && (
          <div className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${toast.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {toast.kind === "ok" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {toast.msg}
          </div>
        )}

        {/* Tab bar */}
        <div className="mt-3 flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-secondary"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels */}
      {tab === "konten" && (
        <div className="mx-auto w-full max-w-none space-y-4">
          <Field label="Judul Artikel">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Judul artikel yang menarik & mengandung keyword" />
          </Field>
          <Field label="Slug" hint={`URL: /blog/${slug || "..."}`}>
            <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={inputCls} placeholder="slug-artikel" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                <option value="">— Pilih —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Tags" hint="Pisahkan dengan koma">
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="seo, menulis" />
            </Field>
          </div>
          <Field label="Excerpt" hint="Ringkasan singkat (muncul di daftar & default meta description)">
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={inputCls} />
          </Field>
          {/* NOTE: jangan bungkus CKEditorField dengan <Field> (yang merender <label>).
              Klik di dalam <label> diteruskan ke tombol pertama (Fullscreen) sehingga
              editor tidak bisa dipakai. Gunakan div + span sebagai label. */}
          <div className="block">
            <span className={labelCls}>Konten</span>
            <CKEditorField value={content} onChange={setContent} minHeight={520} />
          </div>
          <EditorLiveStats html={content} focusKeyword={focusKeyword} readTimeOverride={readTime} onOverrideChange={setReadTime} />
        </div>
      )}

      {tab === "media" && (
        <div className="mx-auto max-w-4xl space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Featured Image</h3>
            <MediaPicker label="Gambar utama" value={featuredImage} onChange={setFeaturedImage} />
            {featuredImage && <FeaturedMediaMetadataEditor url={featuredImage} articleTitle={title} />}
          </Card>
          <Card>
            <h3 className="mb-1 text-sm font-semibold text-secondary">Gallery</h3>
            <p className="text-xs text-muted-foreground">Fitur gallery akan tersedia pada rilis berikutnya. Sisipkan gambar tambahan langsung di editor konten via toolbar Tiptap.</p>
          </Card>
        </div>
      )}

      {tab === "seo" && (
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-secondary">Meta Tags</h3>
              <div className="space-y-3">
                <Field label="SEO Title" hint={`${metaTitle.length}/60 · ideal 50–60`}>
                  <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} placeholder="Judul di hasil pencarian Google" />
                </Field>
                <Field label="Meta Description" hint={`${metaDesc.length}/160 · ideal 50–160`}>
                  <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} className={inputCls} />
                </Field>
                <Field label="Canonical URL" hint="Kosongkan untuk pakai URL default">
                  <input value={canonical} onChange={(e) => setCanonical(e.target.value)} className={inputCls} placeholder="https://..." />
                </Field>
              </div>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-secondary">Open Graph & Twitter</h3>
              <div className="space-y-3">
                <Field label="OG Title" hint="Fallback ke SEO Title bila kosong">
                  <input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} className={inputCls} placeholder={metaTitle || title} />
                </Field>
                <Field label="OG Description" hint="Fallback ke Meta Description bila kosong">
                  <textarea value={ogDesc} onChange={(e) => setOgDesc(e.target.value)} rows={2} className={inputCls} placeholder={metaDesc} />
                </Field>
                <p className="text-xs text-muted-foreground">Twitter Card otomatis <code>summary_large_image</code>. OG Image otomatis mengambil Featured Image.</p>
              </div>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-secondary">Indexing</h3>
              <Field label="Robots">
                <select value={robotsIndex} onChange={(e) => setRobotsIndex(e.target.value as "index" | "noindex")} className={inputCls}>
                  <option value="index">index, follow (default)</option>
                  <option value="noindex">noindex, nofollow</option>
                </select>
              </Field>
              <p className="mt-2 text-xs text-muted-foreground">Schema <code>Article</code> JSON-LD dihasilkan otomatis pada halaman detail.</p>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-secondary"><FileText className="h-4 w-4" /> Checklist Publish</h3>
              <ul className="space-y-1.5 text-xs">
                {[
                  ["Judul", checklist.title],
                  ["Slug", checklist.slug],
                  ["Kategori", checklist.category],
                  ["Konten ≥ 30 kata", checklist.content],
                  ["Meta Title", checklist.metaTitle],
                  ["Meta Description (50–160)", checklist.metaDesc],
                ].map(([label, ok]) => (
                  <li key={label as string} className={`flex items-center gap-2 ${ok ? "text-green-700" : "text-muted-foreground"}`}>
                    {ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />} {label}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-secondary">SEO Score</h3>
              <div className={`mb-3 flex items-center justify-between rounded-md border px-3 py-2 ${bandColor}`}>
                <span className="text-sm font-semibold">{seo.score}/100</span>
                <span className="text-xs uppercase">{seo.band === "green" ? "Baik" : seo.band === "yellow" ? "Cukup" : "Perbaiki"}</span>
              </div>
              <Field label="Focus Keyword (opsional)">
                <input value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} className={inputCls} placeholder="mis. seo blog" />
              </Field>
              <ul className="mt-3 space-y-1 text-xs">
                {seo.checks.map((c) => (
                  <li key={c.key} className="flex items-start justify-between gap-2">
                    <span className={`flex items-center gap-1.5 ${c.ok ? "text-green-700" : "text-muted-foreground"}`}>
                      {c.ok ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
                      {c.label}
                    </span>
                    <span className="text-right text-[10px] text-muted-foreground">{c.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "pengaturan" && (
        <div className="mx-auto max-w-3xl space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Author</h3>
            <div className="text-sm text-secondary">{authorName ?? "—"}</div>
            <p className="mt-1 text-xs text-muted-foreground">Author diambil dari akun pembuat artikel. Untuk multi-author, gunakan fitur transfer author (akan datang).</p>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Publikasi</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status Saat Ini">
                <div className={`inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium ${STATUS_STYLES[status]}`}>{status.toUpperCase()}</div>
              </Field>
              <Field label="Visibility">
                <select value={robotsIndex} onChange={(e) => setRobotsIndex(e.target.value as "index" | "noindex")} className={inputCls}>
                  <option value="index">Public (index)</option>
                  <option value="noindex">Public (noindex)</option>
                </select>
              </Field>
              <Field label="Publish Date" hint="Kosongkan untuk pakai waktu Publish saat ini">
                <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Scheduled Publish" hint="Set waktu di masa depan, lalu klik Schedule">
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Template</h3>
            <div className="text-sm text-secondary">Default Article Template</div>
            <p className="mt-1 text-xs text-muted-foreground">Semua artikel menggunakan template dinamis <code>/blog/$slug</code>. Halaman detail terbentuk otomatis saat artikel Published.</p>
          </Card>
        </div>
      )}

      {tab === "revisi" && currentId.current && (
        <div className="mx-auto max-w-4xl">
          <RevisionsPanel
            postId={currentId.current}
            currentSnapshot={{ title, content, excerpt, metaTitle, metaDesc }}
            onRestore={async (revId) => {
              const rev = await getRevision(revId);
              if (!rev) return;
              setTitle(rev.title ?? "");
              setSlug(rev.slug ?? "");
              setExcerpt(rev.excerpt ?? "");
              setContent(typeof rev.content === "string" ? rev.content : "");
              setFeaturedImage(rev.featured_image ?? "");
              setCategoryId(rev.category_id ?? "");
              setMetaTitle(rev.meta_title ?? "");
              setMetaDesc(rev.meta_description ?? "");
              setCanonical(rev.canonical_url ?? "");
              setTags((rev.tags ?? []).join(", "));
              // Restoring a revision changes form values, so dirty derives to true automatically
              setTab("konten");
              setToast({ kind: "ok", msg: `Revisi #${rev.revision_number} dimuat. Klik Save Draft untuk menyimpan.` });
            }}
          />
        </div>
      )}
      {tab === "revisi" && !currentId.current && (
        <div className="mx-auto max-w-4xl">
          <Card><p className="text-sm text-muted-foreground">Simpan artikel sebagai Draft terlebih dahulu untuk melihat riwayat revisi.</p></Card>
        </div>
      )}
      {quickPreviewOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-background px-4 py-2">
            <div className="flex items-center gap-2 text-sm font-medium text-secondary">
              <Eye className="h-4 w-4" /> Quick Preview
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Live Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openPreviewTab} className={btnGhost} title="Buka di tab baru">
                <ExternalLink className="h-4 w-4" /> Open in New Tab
              </button>
              <button onClick={() => setQuickPreviewOpen(false)} className={btnGhost} title="Tutup (Esc)">
                <CloseIcon className="h-4 w-4" /> Close
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-background">
            <iframe
              key={quickPreviewTick}
              title="Quick Preview"
              src={`/admin/blog/preview/${currentId.current ?? "draft"}?live=1&t=${quickPreviewTick}`}
              className="h-full w-full border-0"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RevisionsPanel({
  postId,
  currentSnapshot,
  onRestore,
}: {
  postId: string;
  currentSnapshot: { title: string; content: string; excerpt: string; metaTitle: string; metaDesc: string };
  onRestore: (id: string) => void;
}) {
  const { data: revs = [], isLoading } = useQuery({
    queryKey: ["blog-revisions", postId],
    queryFn: () => listRevisions(postId),
  });
  const [compareId, setCompareId] = useState<string | null>(null);
  const compareQ = useQuery({
    queryKey: ["blog-revision", compareId],
    enabled: !!compareId,
    queryFn: () => getRevision(compareId!),
  });

  const diffField = (label: string, current: string, past: string) => {
    const same = current === past;
    return (
      <div className="rounded-md border border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
          <span className={`text-[11px] ${same ? "text-muted-foreground" : "text-amber-600"}`}>{same ? "sama" : "berbeda"}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Revisi</div>
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-secondary">{past || "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Saat ini</div>
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-secondary">{current || "—"}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="!p-0">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-secondary">Riwayat Revisi</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Maksimal 50 revisi terbaru</p>
        </div>
        <div className="max-h-[560px] overflow-y-auto p-2">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Memuat…</div>}
          {!isLoading && revs.length === 0 && <div className="p-4 text-sm text-muted-foreground">Belum ada revisi.</div>}
          <ul className="space-y-1">
            {revs.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setCompareId(r.id)}
                  className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                    compareId === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-secondary">#{r.revision_number}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{r.status ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{r.title || "(tanpa judul)"}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                    {typeof r.seo_score === "number" && <> · SEO {r.seo_score}</>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        {!compareId && <div className="text-sm text-muted-foreground">Pilih revisi di kiri untuk membandingkan dengan konten saat ini.</div>}
        {compareId && compareQ.isLoading && <div className="text-sm text-muted-foreground">Memuat revisi…</div>}
        {compareId && compareQ.data && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-secondary">Revisi #{compareQ.data.revision_number}</h4>
                <p className="text-[11px] text-muted-foreground">{new Date(compareQ.data.created_at).toLocaleString("id-ID")} · status: {compareQ.data.status ?? "—"}</p>
              </div>
              <button onClick={() => onRestore(compareId)} className={btnPrimary}><RotateCcw className="h-4 w-4" /> Restore Revisi Ini</button>
            </div>
            <div className="space-y-2">
              {diffField("Judul", currentSnapshot.title, compareQ.data.title ?? "")}
              {diffField("Excerpt", currentSnapshot.excerpt, compareQ.data.excerpt ?? "")}
              {diffField("Meta Title", currentSnapshot.metaTitle, compareQ.data.meta_title ?? "")}
              {diffField("Meta Description", currentSnapshot.metaDesc, compareQ.data.meta_description ?? "")}
              {diffField("Konten", currentSnapshot.content, typeof compareQ.data.content === "string" ? compareQ.data.content : "")}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------- Featured Image Metadata Editor (Media Library = single source of truth) ---------- */

function FeaturedMediaMetadataEditor({ url, articleTitle }: { url: string; articleTitle: string }) {
  const qc = useQueryClient();
  const { data: media, isLoading, refetch } = useQuery({
    queryKey: ["media-by-url", url],
    queryFn: async () => {
      const { data } = await supabase
        .from("media")
        .select("id,url,name,title,alt,caption,description,mime_type,width,height,size_bytes,created_at,updated_at")
        .eq("url", url)
        .maybeSingle();
      return data as {
        id: string; url: string; name: string; title: string | null; alt: string | null;
        caption: string | null; description: string | null; mime_type: string | null;
        width: number | null; height: number | null; size_bytes: number | null;
        created_at: string; updated_at: string;
      } | null;
    },
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (media && !editing) {
      setTitle(media.title ?? "");
      setAlt(media.alt ?? "");
      setCaption(media.caption ?? "");
      setDescription(media.description ?? "");
    }
  }, [media, editing]);

  if (isLoading) {
    return <div className="mt-3 text-xs text-muted-foreground">Memuat metadata…</div>;
  }
  if (!media) {
    return (
      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Gambar ini tidak berasal dari Media Library sehingga metadata tidak dapat dikelola.
        Upload ulang melalui Media Library atau ganti gambar untuk mengaktifkan pengelolaan ALT & Caption.
      </div>
    );
  }

  const LIMITS = { title: 120, alt: 125, caption: 300 };
  const over =
    title.length > LIMITS.title || alt.length > LIMITS.alt || caption.length > LIMITS.caption;

  async function save() {
    setErr(null);
    if (over) { setErr("Melebihi batas karakter."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("media")
      .update({
        title: title.trim() || null,
        alt: alt.trim() || null,
        caption: caption.trim() || null,
        description: description.trim() || null,
      })
      .eq("id", media!.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    await refetch();
    // Invalidate every consumer of media metadata across the app.
    qc.invalidateQueries({ queryKey: ["media-by-url", url] });
    qc.invalidateQueries({ queryKey: ["media"] });
    qc.invalidateQueries({ queryKey: ["published"] });
    setEditing(false);
  }

  function cancel() {
    setTitle(media!.title ?? "");
    setAlt(media!.alt ?? "");
    setCaption(media!.caption ?? "");
    setDescription(media!.description ?? "");
    setErr(null);
    setEditing(false);
  }

  const fallbackAlt = alt.trim() || title.trim() || articleTitle.trim() || media.name;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-secondary">Metadata Gambar</h4>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Tersimpan pada Media Library — berlaku di seluruh website yang memakai gambar ini.
          </p>
        </div>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className={btnGhost}>Edit Metadata</button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={cancel} disabled={saving} className={btnGhost}>Cancel</button>
            <button type="button" onClick={save} disabled={saving || over} className={btnPrimary}>
              {saving ? "Menyimpan…" : "Save Metadata"}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-start gap-3 rounded-md border border-border bg-background p-3">
          <img src={media.url} alt={fallbackAlt} className="h-20 w-20 flex-shrink-0 rounded object-cover" />
          <div className="min-w-0 text-[11px] text-muted-foreground">
            <div className="truncate font-medium text-secondary">{media.name}</div>
            <div>{media.mime_type ?? "—"} · {media.width && media.height ? `${media.width}×${media.height}` : "?"} · {media.size_bytes ? `${Math.round(media.size_bytes / 1024)} KB` : "?"}</div>
            <div className="mt-1 break-all">{media.url}</div>
          </div>
        </div>

        <Field label={`Title (${title.length}/${LIMITS.title})`}>
          <input disabled={!editing} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title + 20} className={inputCls + (editing ? "" : " opacity-70")} />
        </Field>
        <Field label={`ALT Text (${alt.length}/${LIMITS.alt})`} hint="Wajib untuk SEO & aksesibilitas">
          <input disabled={!editing} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={LIMITS.alt + 20} className={inputCls + (editing ? "" : " opacity-70")} placeholder={articleTitle || "Deskripsi singkat gambar"} />
        </Field>
        <Field label={`Caption (${caption.length}/${LIMITS.caption})`} hint="Ditampilkan di bawah gambar pada frontend">
          <input disabled={!editing} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={LIMITS.caption + 20} className={inputCls + (editing ? "" : " opacity-70")} />
        </Field>
        <Field label="Description">
          <textarea disabled={!editing} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls + (editing ? "" : " opacity-70")} />
        </Field>
      </div>

      {err && <p className="text-xs text-red-600">{err}</p>}
      {over && <p className="text-xs text-amber-600">Beberapa field melebihi batas karakter.</p>}
    </div>
  );
}

/* ---------- EditorLiveStats — SEO-oriented panel below editor ---------- */

function EditorLiveStats({
  html, focusKeyword, readTimeOverride, onOverrideChange,
}: {
  html: string;
  focusKeyword: string;
  readTimeOverride: number;
  onOverrideChange: (n: number) => void;
}) {
  const s = useMemo(() => contentStats(html), [html]);
  const density = useMemo(() => {
    const k = focusKeyword.trim().toLowerCase();
    if (!k) return null;
    const text = html.replace(/<[^>]+>/g, " ").toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return 0;
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    return ((text.match(re) ?? []).length / words.length) * 100;
  }, [html, focusKeyword]);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-secondary">Statistik & SEO Live</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Override reading time:</span>
          <input
            type="number" min={1}
            value={readTimeOverride}
            onChange={(e) => onOverrideChange(Number(e.target.value))}
            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-secondary"
          />
          <span>menit</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 md:grid-cols-6">
        <StatCell label="Kata" value={s.words} />
        <StatCell label="Karakter" value={s.chars} />
        <StatCell label="Reading Time" value={`~${s.minutes || 0} min`} hint="200 wpm" />
        <StatCell label="Paragraf" value={s.paragraphs} />
        <StatCell label="Gambar" value={s.images} />
        <StatCell label="Tabel" value={s.tables} />
        <StatCell label="H1" value={s.h1} warn={s.h1 > 1} />
        <StatCell label="H2" value={s.h2} />
        <StatCell label="H3" value={s.h3} />
        <StatCell label="Link internal" value={s.internalLinks} />
        <StatCell label="Link eksternal" value={s.externalLinks} />
        <StatCell
          label={`Density "${focusKeyword.trim() || "—"}"`}
          value={density === null ? "—" : `${density.toFixed(2)}%`}
          warn={density !== null && (density < 0.5 || density > 3)}
          hint={density === null ? "Isi Focus Keyword di tab SEO" : "Ideal 0.5–3%"}
        />
      </div>
    </div>
  );
}

function StatCell({ label, value, hint, warn }: { label: string; value: string | number; hint?: string; warn?: boolean }) {
  return (
    <div className={`rounded-md border px-2.5 py-2 ${warn ? "border-amber-300 bg-amber-50" : "border-border bg-background"}`}>
      <div className={`text-[15px] font-semibold ${warn ? "text-amber-800" : "text-secondary"}`}>{value}</div>
      <div className="mt-0.5 truncate text-[10.5px] uppercase tracking-wide text-muted-foreground" title={hint}>{label}</div>
    </div>
  );
}
