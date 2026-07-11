import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card, Field, inputCls, btnPrimary, btnGhost } from "./ui";
import { TiptapEditor } from "./TiptapEditor";
import { MediaPicker } from "./homepage/primitives";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { logActivity, slugify } from "@/lib/admin/log";
import {
  ArrowLeft, Save, Loader2, Eye, Send, Copy, EyeOff,
  Check, AlertCircle, FileText,
} from "lucide-react";

type Props = { mode: "new" | "edit"; id?: string; onSaved?: (id: string) => void };
type Status = "draft" | "published";

function calcReadTime(html: string) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").filter(Boolean).length : 0;
  return { words, chars: text.length, minutes: Math.max(1, Math.round(words / 220)) };
}

async function ensureUniqueSlug(base: string, ignoreId?: string) {
  let candidate = base || "artikel";
  let i = 2;
  while (true) {
    const q = supabase.from("blog_posts").select("id").eq("slug", candidate).limit(1);
    const { data, error } = await q;
    if (error) throw error;
    const clash = (data ?? []).find((r) => r.id !== ignoreId);
    if (!clash) return candidate;
    candidate = `${base}-${i++}`;
    if (i > 500) throw new Error("Tidak dapat menghasilkan slug unik");
  }
}

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
  const [status, setStatus] = useState<Status>("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [readTime, setReadTime] = useState(5);
  const [loading, setLoading] = useState(mode === "edit");
  const [busy, setBusy] = useState<null | "draft" | "publish" | "unpublish" | "duplicate">(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
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
      setLastSavedAt(data.updated_at ?? null);
      setLastPublishedAt(data.published_at ?? null);
      setLoading(false);
      setTimeout(() => { initialized.current = true; setDirty(false); }, 0);
    });
  }, [mode, id]);

  // Auto-slug when creating from title
  useEffect(() => {
    if (mode === "new" && title && !slug) setSlug(slugify(title));
  }, [title, slug, mode]);

  // Track dirty state for anything the user edits
  useEffect(() => {
    if (!initialized.current) return;
    setDirty(true);
  }, [title, slug, excerpt, content, featuredImage, categoryId, metaTitle, metaDesc, canonical, tags, publishedAt]);

  // Word / read-time counter
  const stats = useMemo(() => calcReadTime(content), [content]);
  useEffect(() => { if (stats.minutes && stats.minutes !== readTime) setReadTime(stats.minutes); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [stats.minutes]);

  // Confirm on leave with unsaved changes
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      // eslint-disable-next-line no-alert
      return !confirm("Ada perubahan yang belum disimpan. Yakin ingin meninggalkan halaman?");
    },
    enableBeforeUnload: dirty,
  });

  // Validation checklist for publish
  const checklist = useMemo(() => ({
    title: !!title.trim(),
    slug: !!slug.trim(),
    category: !!categoryId,
    content: stats.words >= 30,
    metaTitle: !!metaTitle.trim(),
    metaDesc: metaDesc.trim().length >= 50 && metaDesc.trim().length <= 160,
  }), [title, slug, categoryId, stats.words, metaTitle, metaDesc]);
  const publishReady = Object.values(checklist).every(Boolean);

  async function persist(nextStatus: Status): Promise<{ id: string; slug: string } | null> {
    if (!title.trim()) throw new Error("Judul artikel wajib diisi");
    const baseSlug = slugify(slug || title);
    const uniqueSlug = await ensureUniqueSlug(baseSlug, currentId.current);
    if (uniqueSlug !== slug) setSlug(uniqueSlug);

    const nowIso = new Date().toISOString();
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
          : null,
      author_id: (await supabase.auth.getUser()).data.user?.id,
    };

    if (!currentId.current) {
      const { data, error } = await supabase.from("blog_posts").insert(payload).select("id, slug, published_at, updated_at").single();
      if (error) throw error;
      currentId.current = data.id;
      if (featuredImage) await trackMediaUsage(featuredImage, "blog_post", data.id, "featured_image");
      await logActivity(nextStatus === "published" ? "publish_post" : "create_post", "blog_posts", data.id, { title: payload.title });
      setLastSavedAt(data.updated_at);
      setLastPublishedAt(data.published_at ?? null);
      onSaved?.(data.id);
      return { id: data.id, slug: data.slug };
    } else {
      const { data, error } = await supabase.from("blog_posts").update(payload).eq("id", currentId.current).select("id, slug, published_at, updated_at").single();
      if (error) throw error;
      if (featuredImage) await trackMediaUsage(featuredImage, "blog_post", currentId.current, "featured_image");
      else await clearMediaUsage("blog_post", currentId.current, "featured_image");
      await logActivity(nextStatus === "published" ? "publish_post" : "update_post", "blog_posts", currentId.current, { title: payload.title });
      setLastSavedAt(data.updated_at);
      setLastPublishedAt(data.published_at ?? null);
      return { id: data.id, slug: data.slug };
    }
  }

  async function handle(action: "draft" | "publish" | "unpublish") {
    setBusy(action);
    setToast(null);
    try {
      if (action === "publish" && !publishReady) {
        throw new Error("Checklist Publish belum lengkap. Lengkapi field wajib terlebih dahulu.");
      }
      const nextStatus: Status = action === "publish" ? "published" : "draft";
      const res = await persist(nextStatus);
      setStatus(nextStatus);
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["published"] });
      qc.invalidateQueries({ queryKey: ["blog-posts"] });
      const msg =
        action === "publish" ? "Artikel berhasil dipublikasikan"
        : action === "unpublish" ? "Artikel dikembalikan menjadi Draft"
        : "Draft berhasil disimpan";
      setToast({ kind: "ok", msg });
      if (mode === "new" && res) {
        // navigate to edit route so subsequent saves are updates
        navigate({ to: "/admin/blog/$id", params: { id: res.id } });
      }
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

  return (
    <div>
      {/* Sticky editor header */}
      <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link to="/admin/blog" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === "published" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{status.toUpperCase()}</span>
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
              <button onClick={handleDuplicate} disabled={!!busy} className={btnGhost} title="Duplikat artikel">
                {busy === "duplicate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate
              </button>
            )}
            {currentId.current && (
              <Link
                to="/admin/blog/preview/$id"
                params={{ id: currentId.current }}
                target="_blank"
                className={btnGhost}
              >
                <Eye className="h-4 w-4" /> Preview
              </Link>
            )}
            {status === "published" && (
              <button onClick={() => handle("unpublish")} disabled={!!busy} className={btnGhost}>
                {busy === "unpublish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />} Unpublish
              </button>
            )}
            <button onClick={() => handle("draft")} disabled={!!busy || !title.trim()} className={btnGhost}>
              {busy === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
            </button>
            <button
              onClick={() => handle("publish")}
              disabled={!!busy || !publishReady}
              className={btnPrimary}
              title={publishReady ? "Publish artikel" : "Lengkapi checklist di sidebar terlebih dahulu"}
            >
              {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {status === "published" ? "Update Publish" : "Publish"}
            </button>
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
            <h3 className="mb-3 text-sm font-semibold text-secondary">Publikasi</h3>
            <div className="space-y-3">
              <Field label="Publish Date" hint="Kosongkan untuk memakai waktu Publish saat ini">
                <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputCls} />
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
            <h3 className="mb-3 text-sm font-semibold text-secondary">SEO</h3>
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
    </div>
  );
}
