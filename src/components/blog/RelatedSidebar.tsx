import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import type { BlogPost } from "@/types";

/**
 * Sidebar for the article detail page.
 * Shows up to 5 related posts (same category); falls back to a search box
 * when the current article has no siblings in its category.
 */
export function RelatedSidebar({ posts }: { posts: BlogPost[] }) {
  return (
    <aside className="mt-12 lg:mt-0">
      <div className="lg:sticky lg:top-24">
        {posts.length > 0 ? (
          <>
            <h2 className="text-base font-semibold text-secondary">Artikel Terkait</h2>
            <ul className="mt-4 space-y-3">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: p.slug }}
                    className="group flex gap-3 rounded-[12px] border border-border bg-card p-2 transition-colors hover:border-primary/40"
                  >
                    <img
                      src={p.featuredImage}
                      alt={p.title}
                      loading="lazy"
                      decoding="async"
                      className="h-[64px] w-[88px] shrink-0 rounded-[8px] object-cover"
                    />
                    <span className="line-clamp-2 self-center text-sm font-medium leading-snug text-secondary group-hover:text-primary">
                      {p.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <SearchBox />
        )}
      </div>
    </aside>
  );
}

function SearchBox() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ to: "/blog", search: { q: q.trim() || undefined } });
      }}
    >
      <h2 className="text-base font-semibold text-secondary">Cari Artikel</h2>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari artikel…"
          aria-label="Cari artikel"
          className="h-11 w-full rounded-[12px] border border-border bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="mt-3 h-10 w-full rounded-[12px] bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Cari
      </button>
    </form>
  );
}
