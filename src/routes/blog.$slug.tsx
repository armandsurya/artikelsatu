import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import {
  usePublishedBlogCategories,
  usePublishedBlogPosts,
  publishedBlogPostBySlugQueryOptions,
  publishedBlogPostsQueryOptions,
  blogCategoriesQueryOptions,
  primePublicQuery,
} from "@/lib/publishedContent";
import { mapBlogPosts } from "@/lib/mapPublished";
import { BlogCard } from "@/components/cards/BlogCard";
import { Clock, User, ArrowLeft } from "lucide-react";
import { MediaFigure } from "@/components/media/MediaFigure";
import { sanitizeHtml } from "@/lib/editor/sanitize";
import { authorDisplayName } from "@/lib/blog/author";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.fetchQuery(
      publishedBlogPostBySlugQueryOptions(params.slug),
    );
    if (!post) throw notFound();
    await Promise.all([
      primePublicQuery(context.queryClient, blogCategoriesQueryOptions(), []),
      primePublicQuery(context.queryClient, publishedBlogPostsQueryOptions(), []),
    ]);
    return { post };
  },

  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Artikel tidak ditemukan" }, { name: "robots", content: "noindex" }],
      };
    }
    const p = loaderData.post;
    const title = p.meta_title || p.title;
    const desc = p.meta_description || p.excerpt || p.title;
    const url = `/blog/${params.slug}`;
    // Per-article keywords override the global meta keywords (root head).
    // Empty list = no override, so the global value stays as fallback.
    const keywords = ((p.focus_keywords as string[] | null) ?? [])
      .map((k) => k.trim())
      .filter(Boolean)
      .join(", ");
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(keywords ? [{ name: "keywords", content: keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(p.featured_image ? [{ property: "og:image", content: p.featured_image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: p.canonical_url || url }],
      scripts: [
        {
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
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="container-narrow py-20 text-center">
        <p className="text-sm text-muted-foreground">Terjadi kesalahan: {error.message}</p>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container-narrow py-20 text-center">
        <h1 className="text-2xl font-semibold text-secondary">Artikel tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Artikel yang Anda cari belum tersedia atau belum dipublikasikan.
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
        </Link>
      </div>
    </SiteLayout>
  ),
  pendingComponent: BlogDetailPending,
  component: BlogDetail,
});

function BlogDetailPending() {
  return (
    <SiteLayout>
      <article className="bg-background">
        <div className="container-narrow py-14">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-6 w-24 animate-pulse rounded-full bg-muted" />
          <div className="mt-4 h-12 w-full max-w-3xl animate-pulse rounded-lg bg-muted" />
          <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded bg-muted" />
          <div className="mt-10 aspect-[16/9] w-full animate-pulse rounded-[16px] bg-muted" />
          <div className="mt-10 space-y-3 max-w-3xl">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </article>
    </SiteLayout>
  );
}

function BlogDetail() {
  const { post } = Route.useLoaderData();
  const cats = usePublishedBlogCategories();
  const allPosts = usePublishedBlogPosts();
  const categoryName = post.category_id
    ? (cats.data?.find((c) => c.id === post.category_id)?.name ?? "Umum")
    : "Umum";

  // Related: same category, exclude current, top 3
  const related = mapBlogPosts(
    (allPosts.data ?? [])
      .filter((r) => r.id !== post.id && r.category_id === post.category_id)
      .sort(
        (a, b) =>
          new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
      )
      .slice(0, 5),
    cats.data ?? [],
  );

  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // content is `jsonb` — usually a string of raw HTML, but legacy seed rows
  // used `{html: "..."}`. Migration normalized DB; this stays defensive.
  const rawContent: unknown = post.content;
  const contentHtml =
    typeof rawContent === "string"
      ? rawContent
      : rawContent && typeof rawContent === "object" && "html" in rawContent
        ? String((rawContent as { html: unknown }).html ?? "")
        : "";

  const author = authorDisplayName(post.author_name);

  return (
    <SiteLayout>
      <article className="bg-background">
        <div className="container-narrow py-14">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Blog
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <div className="max-w-3xl">
                <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                  {categoryName}
                </span>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {author}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {post.read_time ?? 5} menit baca
                  </span>
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
                {contentHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }} />
                ) : (
                  <p className="text-muted-foreground">Konten artikel belum tersedia.</p>
                )}
              </div>

              {post.tags && post.tags.length > 0 && (
                <div className="mt-10 flex max-w-3xl flex-wrap gap-2">
                  {post.tags.map((t: string) => (
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

            <RelatedSidebar posts={related} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-accent/40">
          <div className="container-narrow py-14">
            <h2 className="text-xl font-semibold text-secondary">Artikel Terkait</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
