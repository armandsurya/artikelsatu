import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import { ArrowLeft, Clock, User, Eye, RefreshCw } from "lucide-react";
import { sanitizeHtml } from "@/lib/editor/sanitize";
import { authorDisplayName } from "@/lib/blog/author";

const DRAFT_STORAGE_KEY = "lovable:blog-preview-draft";

type DraftPayload = {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  content: string;
  featured_image?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  tags?: string[];
  read_time?: number;
  status?: string;
  published_at?: string | null;
  updated_at?: string;
  author_id?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
};

function readDraft(): DraftPayload | null {
  try {
    const raw =
      typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_STORAGE_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/_authenticated/admin/blog/preview/$id")({
  head: () => ({
    meta: [{ title: "Preview Artikel — Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    live: s.live === "1" || s.live === 1 || s.live === true ? true : false,
  }),
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const { live } = Route.useSearch();
  const isDraftSentinel = id === "draft" || live;

  const [draft, setDraft] = useState<DraftPayload | null>(() =>
    isDraftSentinel ? readDraft() : null,
  );
  const [reloadTick, setReloadTick] = useState(0);

  // Auto-refresh: when the editor tab writes a new draft blob, re-read it.
  useEffect(() => {
    if (!isDraftSentinel) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === DRAFT_STORAGE_KEY) {
        setDraft(readDraft());
        setReloadTick((t) => t + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [isDraftSentinel]);

  // Fallback DB fetch (published/persisted articles, or when no draft blob is available)
  const { data: dbPost, isLoading } = useQuery({
    queryKey: ["blog-preview", id, reloadTick],
    enabled: !isDraftSentinel || (isDraftSentinel && !draft && id !== "draft"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Live mode: hydrate category name if draft only carried an id
  const { data: catName } = useQuery({
    queryKey: ["blog-preview-cat", draft?.category_id],
    enabled: !!(draft && draft.category_id && !draft.category_name),
    queryFn: async () =>
      (
        await supabase
          .from("blog_categories")
          .select("name")
          .eq("id", draft!.category_id!)
          .maybeSingle()
      ).data?.name ?? null,
  });

  const post = draft
    ? {
        id: draft.id,
        title: draft.title || "(Tanpa Judul)",
        excerpt: draft.excerpt ?? null,
        content: draft.content ?? "",
        featured_image: draft.featured_image ?? null,
        status: draft.status ?? "draft",
        read_time: draft.read_time ?? 5,
        tags: draft.tags ?? [],
        published_at: draft.published_at ?? null,
        updated_at: draft.updated_at ?? new Date().toISOString(),
        author_id: draft.author_id ?? null,
        category_name: draft.category_name ?? catName ?? "Umum",
      }
    : dbPost
      ? {
          id: dbPost.id,
          title: dbPost.title,
          excerpt: dbPost.excerpt,
          content: (typeof dbPost.content === "string" ? dbPost.content : "") as string,
          featured_image: dbPost.featured_image,
          status: dbPost.status,
          read_time: dbPost.read_time ?? 5,
          tags: dbPost.tags ?? [],
          published_at: dbPost.published_at,
          updated_at: dbPost.updated_at,
          author_id: dbPost.author_id,
          category_name:
            (dbPost as { blog_categories?: { name?: string } }).blog_categories?.name ?? "Umum",
        }
      : null;

  const { data: authorName } = useQuery({
    queryKey: ["profile", post?.author_id],
    enabled: !!post?.author_id,
    queryFn: async () =>
      (await supabase.from("profiles").select("full_name").eq("id", post!.author_id!).maybeSingle())
        .data?.full_name ?? null,
  });

  if (isLoading && !post)
    return (
      <SiteLayout>
        <div className="container-narrow py-20 text-center text-sm text-muted-foreground">
          Memuat preview…
        </div>
      </SiteLayout>
    );
  if (!post)
    return (
      <SiteLayout>
        <div className="container-narrow py-20 text-center text-sm text-muted-foreground">
          {isDraftSentinel
            ? "Belum ada draft untuk dipreview. Kembali ke editor lalu klik Preview kembali."
            : "Artikel tidak ditemukan."}
        </div>
      </SiteLayout>
    );

  const contentHtml = post.content;
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(post.updated_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <SiteLayout>
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50">
        <div className="container-narrow flex items-center justify-between py-2 text-xs text-amber-900">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Eye className="h-3.5 w-3.5" /> Mode Preview — status: {post.status}
            {draft && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                <RefreshCw className="h-3 w-3" /> Live Draft
              </span>
            )}{" "}
            (tidak diindex Google)
          </span>
          {id !== "draft" && (
            <Link
              to="/admin/blog/$id"
              params={{ id }}
              className="rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium hover:bg-amber-100"
            >
              Kembali ke Editor
            </Link>
          )}
        </div>
      </div>
      <article className="bg-background">
        <div className="container-narrow py-14">
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Semua Artikel
          </Link>
          <div className="mt-6 max-w-3xl">
            <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {post.category_name}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {authorDisplayName(authorName)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.read_time ?? 5} menit baca
              </span>
              {date && <span>{date}</span>}
            </div>
          </div>
          {post.featured_image && (
            <div className="mt-10 overflow-hidden rounded-[16px] border border-border">
              <img
                src={post.featured_image}
                alt={post.title}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          )}
          <div className="article-body mt-10 max-w-3xl">
            {contentHtml ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }} />
            ) : (
              <p className="text-muted-foreground">Konten belum ada.</p>
            )}
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 flex max-w-3xl flex-wrap gap-2">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    </SiteLayout>
  );
}
