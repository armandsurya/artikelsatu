import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary, btnGhost } from "./ui";
import { TiptapEditor } from "./TiptapEditor";
import { MediaPicker } from "./homepage/primitives";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { logActivity, slugify } from "@/lib/admin/log";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

type Props = { mode: "new" | "edit"; id?: string; onSaved?: (id: string) => void };

export function BlogEditor({ mode, id, onSaved }: Props) {
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
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [readTime, setReadTime] = useState(5);
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("blog_categories").select("id, name").order("name")).data ?? [],
  });

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    supabase.from("blog_posts").select("*").eq("id", id).single().then(({ data }) => {
      if (!data) return;
      setTitle(data.title); setSlug(data.slug); setExcerpt(data.excerpt ?? "");
      setContent((data.content as string) ?? ""); setFeaturedImage(data.featured_image ?? "");
      setCategoryId(data.category_id ?? ""); setMetaTitle(data.meta_title ?? "");
      setMetaDesc(data.meta_description ?? ""); setCanonical(data.canonical_url ?? "");
      setTags((data.tags ?? []).join(", ")); setStatus(data.status); setReadTime(data.read_time ?? 5);
      setPublishedAt(data.published_at ? data.published_at.slice(0, 16) : "");
    });
  }, [mode, id]);

  useEffect(() => { if (mode === "new" && title && !slug) setSlug(slugify(title)); }, [title, slug, mode]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        title, slug: slug || slugify(title), excerpt: excerpt || null,
        content: content as never, featured_image: featuredImage || null,
        category_id: categoryId || null,
        meta_title: metaTitle || null, meta_description: metaDesc || null, canonical_url: canonical || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status, read_time: readTime,
        published_at: status === "published" ? (publishedAt || new Date().toISOString()) : null,
        author_id: (await supabase.auth.getUser()).data.user?.id,
      };
      if (mode === "new") {
        const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
        if (error) throw error;
        if (featuredImage) await trackMediaUsage(featuredImage, "blog_post", data.id, "featured_image");
        await logActivity("create_post", "blog_posts", data.id, { title });
        onSaved?.(data.id);
      } else if (id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
        if (error) throw error;
        if (featuredImage) await trackMediaUsage(featuredImage, "blog_post", id, "featured_image");
        else await clearMediaUsage("blog_post", id, "featured_image");
        await logActivity("update_post", "blog_posts", id, { title });
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title={mode === "new" ? "Tambah Artikel" : "Edit Artikel"}
        actions={
          <>
            <Link to="/admin/blog" className={btnGhost}><ArrowLeft className="h-4 w-4" /> Kembali</Link>
            <button onClick={save} disabled={saving || !title} className={btnPrimary}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
            </button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Field label="Judul">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Judul artikel" />
          </Field>
          <Field label="Slug">
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} placeholder="slug-artikel" />
          </Field>
          <Field label="Excerpt">
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className={inputCls} />
          </Field>
          <Field label="Konten">
            <TiptapEditor value={content} onChange={setContent} />
          </Field>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Publikasi</h3>
            <div className="space-y-3">
              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} className={inputCls}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>
              <Field label="Publish Date">
                <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Read Time (menit)">
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
              <Field label="Featured Image URL">
                <input value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} className={inputCls} placeholder="https://..." />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">SEO</h3>
            <div className="space-y-3">
              <Field label="Meta Title"><input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} /></Field>
              <Field label="Meta Description"><textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3} className={inputCls} /></Field>
              <Field label="Canonical URL"><input value={canonical} onChange={(e) => setCanonical(e.target.value)} className={inputCls} /></Field>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
