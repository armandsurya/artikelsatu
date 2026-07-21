import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import { BlogCard } from "@/components/cards/BlogCard";
import { DebugSource } from "@/components/DebugSource";
import {
  usePublishedBlogPosts,
  usePublishedBlogCategories,
  useSiteSettings,
  publishedBlogPostsQueryOptions,
  blogCategoriesQueryOptions,
  siteSettingsQueryOptions,
} from "@/lib/publishedContent";
import { mapBlogPosts } from "@/lib/mapPublished";

const PAGE_SIZE = 6;
const DEFAULT_TITLE = "Blog ArtikelPro";
const DEFAULT_DESC =
  "Kumpulan artikel dan panduan seputar SEO, penulisan konten, dan strategi digital untuk membantu bisnis Anda bertumbuh.";
const META_TITLE = "Blog — Insight SEO, Content Marketing & Copywriting";

export const Route = createFileRoute("/blog/")({
  // Prime caches during SSR so first paint uses real DB content instead of
  // defaults ("Blog ArtikelPro" hero + empty state) that flash before the
  // client refetch completes.
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.fetchQuery(publishedBlogPostsQueryOptions()),
      context.queryClient.fetchQuery(blogCategoriesQueryOptions()),
      context.queryClient.fetchQuery(siteSettingsQueryOptions()),
    ]);
  },
  head: () => ({
    meta: [
      { title: META_TITLE },
      { name: "description", content: DEFAULT_DESC },
      { property: "og:title", content: META_TITLE },
      { property: "og:description", content: DEFAULT_DESC },
      { property: "og:url", content: "/blog" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
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
        <p className="text-sm text-muted-foreground">Halaman blog tidak ditemukan.</p>
      </div>
    </SiteLayout>
  ),
  component: BlogPage,
});

function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [page, setPage] = useState(1);

  const postsQ = usePublishedBlogPosts();
  const catsQ = usePublishedBlogCategories();
  const settingsQ = useSiteSettings();

  const hero = useMemo(() => {
    const blob = (settingsQ.data?.blogHero ?? {}) as {
      published?: { title?: string; description?: string };
    };
    return {
      title: blob.published?.title?.trim() || DEFAULT_TITLE,
      description: blob.published?.description?.trim() || DEFAULT_DESC,
    };
  }, [settingsQ.data]);

  // Single source of truth: public.blog_posts. No static fallback — an empty
  // DB shows the empty state, not seeded/mock data that never syncs back.
  const posts = useMemo(
    () => mapBlogPosts(postsQ.data ?? [], catsQ.data ?? []),
    [postsQ.data, catsQ.data],
  );
  const categories = useMemo(
    () => ["Semua", ...(catsQ.data ?? []).map((c) => c.name)],
    [catsQ.data],
  );


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts
      .filter((p) => p.status === "published")
      .filter((p) => category === "Semua" || p.category === category)
      .filter(
        (p) =>
          !q || p.title.toLowerCase().includes(q) || (p.excerpt ?? "").toLowerCase().includes(q),
      );
  }, [posts, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <SiteLayout>
      <section className="relative border-b border-border bg-background">
        <DebugSource label="blog" source="database" />
        <div className="container-narrow py-14">
          <h1 className="text-3xl font-bold tracking-tight text-secondary sm:text-4xl">
            {hero.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">{hero.description}</p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari artikel…"
                className="h-11 w-full rounded-[12px] border border-border bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-secondary"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-narrow py-14">
          {current.length === 0 ? (
            <div className="rounded-[16px] border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              Tidak ada artikel yang cocok.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {current.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-9 min-w-[36px] rounded-lg border px-3 text-sm ${
                    page === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-secondary hover:bg-accent"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
