import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/layouts/SiteLayout";
import { BlogCard } from "@/components/cards/BlogCard";
import { blogPosts, blogCategories } from "@/data/blog";

const PAGE_SIZE = 6;
const TITLE = "Blog — Insight SEO, Content Marketing & Copywriting";
const DESC = "Kumpulan artikel dan panduan seputar SEO, penulisan konten, dan strategi digital untuk membantu bisnis Anda bertumbuh.";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "/blog" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogPage,
});

function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return blogPosts
      .filter((p) => p.status === "published")
      .filter((p) => category === "Semua" || p.category === category)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q));
  }, [query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const items = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-accent/40">
        <div className="container-narrow py-16 text-center">
          <div className="mx-auto inline-flex rounded-full bg-background px-3 py-1 text-xs font-medium text-accent-foreground">Blog</div>
          <h1 className="mt-4 text-4xl font-bold text-secondary sm:text-5xl">Insight & Panduan Konten</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">{DESC}</p>

          <div className="mx-auto mt-8 max-w-xl">
            <label className="relative block">
              <span className="sr-only">Cari artikel</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Cari artikel..."
                className="w-full rounded-[12px] border border-border bg-background py-3 pl-10 pr-4 text-sm text-secondary placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="container-narrow py-12">
          <div className="flex flex-wrap justify-center gap-2">
            {blogCategories.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(1); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === c
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-secondary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {items.length === 0 ? (
            <p className="mt-16 text-center text-sm text-muted-foreground">Tidak ada artikel yang cocok dengan pencarian Anda.</p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((post) => <BlogCard key={post.id} post={post} />)}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 min-w-9 rounded-md px-3 text-sm font-medium ${
                    p === currentPage
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-secondary hover:bg-accent"
                  }`}
                >
                  {p}
                </button>
              ))}
            </nav>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
