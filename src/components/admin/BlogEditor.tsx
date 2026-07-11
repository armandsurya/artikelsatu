import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, Field, inputCls, btnPrimary, btnGhost, btnDanger } from "./ui";
import { TiptapEditor } from "./TiptapEditor";
import { MediaPicker } from "./homepage/primitives";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { logActivity, slugify } from "@/lib/admin/log";
import { analyzeSeo } from "@/lib/blog/seoScore";
import { saveRevision, listRevisions, getRevision } from "@/lib/blog/revisions";
import {
  ArrowLeft, Save, Loader2, Eye, Send, Copy, EyeOff, Archive, RotateCcw,
  Check, AlertCircle, FileText, History, Trash2, Clock,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Props = { mode: "new" | "edit"; id?: string; onSaved?: (id: string) => void };
type Status = Database["public"]["Enums"]["post_status"]; // draft | published | scheduled | archived

function calcReadTime(html: string) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").filter(Boolean).length : 0;
  return { words, chars: text.length, minutes: Math.max(1, Math.round(words / 220)) };
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

const STATUS_STYLES: Record<Status, string> = {
  draft: "bg-amber-50 text-amber-700",
  published: "bg-green-50 text-green-700",
  scheduled: "bg-blue-50 text-blue-700",
  archived: "bg-slate-200 text-slate-700",
};

export function BlogEditor({ mode, id, onSaved }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [canonical, setCanonical] = useState("");
  const [tags, setTags] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [readTime, setReadTime] = useState(5);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState<null | "draft" | "publish" | "unpublish" | "duplicate" | "schedule" | "archive" | "restore">(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const initialized = useRef(false);
  const currentId = useRef<string | undefined>(id);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("blog_categories").select("id, name").order("name")).data ?? [],
  });

  useEffect(() => {
    if (mode !== "edit" || !id) { initialized.current = true; return; }
    supabase.from("blog_posts").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error) { setToast({ kind: "err", msg: `Gagal memuat: ${error.message}` }); setLoading(false); return; }
      if (!data) { setLoading(false); return; }
      setTitle(data.title); setSlug(data.slug); setExcerpt(data.excerpt ?? "");
      setContent((typeof data.content === "string" ? data.content : "") ?? "");
      setFeaturedImage(data.featured_image ?? "");
      setCategoryId(data.category_id ?? "");
      setMetaTitle(data.meta_title ?? "");
      setMetaDesc(data.meta_description ?? "");
      setCanonical(data.canonical_url ?? "");
      setTags((data.tags ?? []).join(", "));
      setStatus(data.status);
      setReadTime(data.read_time ?? 5);
      setPublishedAt(data.published_at ? data.published_at.slice(0, 16) : "");
      setScheduledAt(data.scheduled_at ? data.scheduled_at.slice(0, 16) : "");
      setLastSavedAt(data.updated_at ?? null);
      setLastPublishedAt(data.published_at ?? null);
      setLoading(false);
      setTimeout(() => { initialized.current = true; setDirty(false); }, 0);
    });
  }, [mode, id]);

  useEffect(() => {
    if (mode === "new" && title && !slug) setSlug(slugify(title));
  }, [title, slug, mode]);

  useEffect(() => {
    if (!initialized.current) return;
    setDirty(true);
  }, [title, slug, excerpt, content, featuredImage, categoryId, metaTitle, metaDesc, canonical, tags, publishedAt, scheduledAt, focusKeyword]);

  const stats = useMemo(() => calcReadTime(content), [content]);
  useEffect(() => { if (stats.minutes && stats.minutes !== readTime) setReadTime(stats.minutes); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stats.minutes]);

  const seo = useMemo(
    () => analyzeSeo({ title, metaTitle: metaTitle || title, metaDescription: metaDesc, contentHtml: content, focusKeyword }),
    [title, metaTitle, metaDesc, content, focusKeyword],
  );

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      // eslint-disable-next-line no-alert
      return !confirm("Ada perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?");
    },
    enableBeforeUnload: dirty,
  });

  const checklist = useMemo(() => ({
    title: !!title.trim(),
    slug: !!slug.trim(),
    category: !!categoryId,
    content: stats.words >= 30,
    metaTitle: !!metaTitle.trim(),
    metaDesc: metaDesc.trim().length >= 50 && metaDesc.trim().length <= 160,
  }), [title, slug, categoryId, stats.words, metaTitle, metaDesc]);
  const publishReady = Object.values(checklist).every(Boolean);

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
      author_id: user.user?.id,
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

    // Save revision snapshot
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
      // Non-fatal
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
        if (!publishReady) throw new Error("Checklist Publish belum lengkap.");
        nextStatus = "published";
      } else if (action === "schedule") {
        if (!scheduledAt) throw new Error("Tentukan tanggal & waktu publish terlebih dahulu.");
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
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["published"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      qc.invalidateQueries({ queryKey: ["blog-revisions"] });
      const msg =
        action === "publish" ? "Artikel berhasil dipublikasikan"
        : action === "schedule" ? "Jadwal publish tersimpan"
        : action === "unpublish" ? "Artikel dikembalikan menjadi Draft"
        : action === "archive" ? "Artikel diarsipkan"
        : action === "restore" ? "Artikel dikembalikan dari arsip menjadi Draft"
        : "Draft berhasil disimpan";
      setToast({ kind: "ok", msg });
      if (mode === "new" && res) navigate({ to: "/admin/blog/$id", params: { id: res.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
      setToast({ kind: "err", msg: `Gagal: ${msg}` });
    } finally {
      setBusy(null);
    }
  }

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
      navigate({ to: "/admin/blog/$id", params: { id: data.id } });
    } catch (e: unknown) {
      setToast({ kind: "err", msg: `Gagal duplikat: ${e instanceof Error ? e.message : "error"}` });
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="py-10 text-center text-sm text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");
  const bandColor = seo.band === "green" ? "text-green-700 bg-green-50 border-green-200"
    : seo.band === "yellow" ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <div>
      {/* Sticky editor header */}
      <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link to="/admin/blog" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>{status.toUpperCase()}</span>
              {status === "scheduled" && scheduledAt && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-700"><Clock className="h-3 w-3" />{fmt(new Date(scheduledAt).toISOString())}</span>
              )}
              {dirty && <span className="text-[11px] font-medium text-amber-600">• Perubahan belum disimpan</span>}
            </div>
            <h1 className="mt-1 truncate text-lg font-semibold text-secondary">{title || (mode === "new" ? "Artikel Baru" : "Tanpa Judul")}</h1>
            <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
              <span>Last saved: {fmt(lastSavedAt)}</span>
              <span>Last published: {fmt(lastPublishedAt)}</span>
              <span>{stats.words} kata • {stats.chars} karakter • ~{stats.minutes} mnt baca</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentId.current && (
              <button onClick={() => setShowRevisions(true)} className={btnGhost} title="Riwayat Revisi">
                <History className="h-4 w-4" /> Revisi
              </button>
            )}
            {currentId.current && (
              <button onClick={handleDuplicate} disabled={!!busy} className={btnGhost} title="Duplikat artikel">
                {busy === "duplicate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate
              </button>
            )}
            {currentId.current && (
              <Link to="/admin/blog/preview/$id" params={{ id: currentId.current }} target="_blank" className={btnGhost}>
                <Eye className="h-4 w-4" /> Preview
              </Link>
            )}
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
                  title={publishReady ? "Publish artikel" : "Lengkapi checklist di sidebar terlebih dahulu"}>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Field label="Judul"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Judul artikel" /></Field>
          <Field label="Slug" hint={`URL akhir: /blog/${slug || "..."}`}>
            <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className={inputCls} placeholder="slug-artikel" />
          </Field>
          <Field label="Excerpt" hint="Ringkasan singkat (muncul di daftar & meta description default)">
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={inputCls} />
          </Field>
          <Field label="Konten">
            <TiptapEditor value={content} onChange={setContent} />
          </Field>
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
                ["Meta Description (50–160 karakter)", checklist.metaDesc],
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
              <span className="text-xs uppercase">{seo.band === "green" ? "Baik" : seo.band === "yellow" ? "Cukup" : "Perlu Perbaikan"}</span>
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
                  <span className="text-[10px] text-muted-foreground">{c.message}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Publikasi</h3>
            <div className="space-y-3">
              <Field label="Publish Date" hint="Kosongkan untuk memakai waktu Publish saat ini">
                <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Jadwal Publish" hint="Set waktu di masa depan, lalu klik Schedule">
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Read Time (menit)" hint="Otomatis dihitung dari konten, dapat diubah manual">
                <input type="number" min={1} value={readTime} onChange={(e) => setReadTime(Number(e.target.value))} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Klasifikasi</h3>
            <div className="space-y-3">
              <Field label="Kategori">
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">— Pilih —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Tags" hint="Pisahkan dengan koma">
                <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="seo, menulis" />
              </Field>
              <MediaPicker label="Featured Image" value={featuredImage} onChange={setFeaturedImage} />
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">SEO Meta</h3>
            <div className="space-y-3">
              <Field label="Meta Title" hint={`${metaTitle.length}/60`}>
                <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Meta Description" hint={`${metaDesc.length}/160 (ideal 50–160)`}>
                <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} className={inputCls} />
              </Field>
              <Field label="Canonical URL"><input value={canonical} onChange={(e) => setCanonical(e.target.value)} className={inputCls} placeholder="Kosongkan untuk pakai URL default" /></Field>
            </div>
          </Card>
        </div>
      </div>

      {showRevisions && currentId.current && (
        <RevisionsDrawer
          postId={currentId.current}
          onClose={() => setShowRevisions(false)}
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
            setDirty(true);
            setShowRevisions(false);
            setToast({ kind: "ok", msg: `Revisi #${rev.revision_number} dimuat ke editor. Klik Save Draft untuk menyimpan.` });
          }}
        />
      )}
    </div>
  );
}

function RevisionsDrawer({ postId, onClose, onRestore }: { postId: string; onClose: () => void; onRestore: (id: string) => void }) {
  const { data: revs = [], isLoading } = useQuery({
    queryKey: ["blog-revisions", postId],
    queryFn: () => listRevisions(postId),
  });
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      <button aria-label="Close" className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="w-full max-w-md bg-background p-5 shadow-xl overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-secondary">Riwayat Revisi</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><Trash2 className="h-4 w-4 rotate-45" /></button>
        </div>
        {isLoading && <div className="text-sm text-muted-foreground">Memuat…</div>}
        {!isLoading && revs.length === 0 && <div className="text-sm text-muted-foreground">Belum ada revisi tersimpan.</div>}
        <ul className="space-y-2">
          {revs.map((r) => (
            <li key={r.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-secondary">#{r.revision_number} — {r.title || "(tanpa judul)"}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("id-ID")} · status: {r.status ?? "—"} · SEO: {r.seo_score ?? "—"}
                  </div>
                </div>
                <button onClick={() => onRestore(r.id)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent">Restore</button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">Menyimpan maksimal 50 revisi terbaru per artikel. Restore akan memuat konten revisi ke editor; simpan sebagai Draft untuk mengaktifkannya.</p>
      </aside>
    </div>
  );
}
