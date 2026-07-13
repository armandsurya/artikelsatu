import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import {
  fetchPublishedBlogPostBySlug,
  usePublishedBlogCategories,
  usePublishedBlogPosts,
} from "@/lib/publishedContent";
import { mapBlogPosts } from "@/lib/mapPublished";
import { BlogCard } from "@/components/cards/BlogCard";
import { Clock, User, ArrowLeft } from "lucide-react";
import { MediaFigure } from "@/components/media/MediaFigure";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData({
      queryKey: ["published", "blog_post", params.slug],
      queryFn: () => fetchPublishedBlogPostBySlug(params.slug),
      staleTime: 30_000,
    });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Artikel tidak ditemukan" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    const title = p.meta_title || p.title;
    const desc = p.meta_description || p.excerpt || p.title;
    const url = `/blog/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(p.featured_image ? [{ property: "og:image", content: p.featured_image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: p.canonical_url || url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: p.title,
          description: desc,
          image: p.featured_image || undefined,
          datePublished: p.published_at,
          dateModified: p.updated_at || p.published_at,
        }),
      }],
    };
  },
  errorComponent: ({ error }) => (
    <SiteLayout><div className="container-narrow py-20 text-center"><p className="text-sm text-muted-foreground">Terjadi kesalahan: {error.message}</p></div></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-narrow py-20 text-center">
        <h1 className="text-2xl font-semibold text-secondary">Artikel tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">Artikel yang Anda cari belum tersedia atau belum dipublikasikan.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"><ArrowLeft className="h-4 w-4" /> Kembali ke Blog</Link>
      </div>
    </SiteLayout>
  ),
  component: BlogDetail,
});

function BlogDetail() {
  const { post } = Route.useLoaderData();
  const cats = usePublishedBlogCategories();
  const allPosts = usePublishedBlogPosts();
  const categoryName = post.category_id
    ? cats.data?.find((c) => c.id === post.category_id)?.name ?? "Umum"
    : "Umum";

  // Related: same category, exclude current, top 3
  const related = mapBlogPosts(
    (allPosts.data ?? []).filter((r) => r.id !== post.id && r.category_id === post.category_id).slice(0, 3),
    cats.data ?? [],
  );

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "";

  // content stored as jsonb (either an HTML string or arbitrary JSON)
  const contentHtml = typeof post.content === "string" ? post.content : "";

  const { data: author } = useQuery({
    queryKey: ["profile", post.author_id],
    enabled: !!post.author_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", post.author_id!).maybeSingle();
      return data?.full_name ?? null;
    },
  });

  return (
    <SiteLayout>
      <article className="bg-background">
        <div className="container-narrow py-14">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
          </Link>
          <div className="mt-6 max-w-3xl">
            <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">{categoryName}</span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-secondary sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{author ?? "Tim ArtikelPro"}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{post.read_time ?? 5} menit baca</span>
              {date && <span>{date}</span>}
            </div>
          </div>

          {post.featured_image && (
            <MediaFigure
              src={post.featured_image}
              fallbackAlt={post.title}
              className="mt-10"
              imgClassName="aspect-[16/9] w-full rounded-[16px] border border-border object-cover"
            />
          )}

          <div className="article-body mt-10 max-w-3xl">
            {contentHtml
              ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }} />
              : <p className="text-muted-foreground">Konten artikel belum tersedia.</p>}
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="mt-10 flex max-w-3xl flex-wrap gap-2">
              {post.tags.map((t: string) => (
                <span key={t} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-accent/40">
          <div className="container-narrow py-14">
            <h2 className="text-xl font-semibold text-secondary">Artikel Terkait</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((p) => <BlogCard key={p.id} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
