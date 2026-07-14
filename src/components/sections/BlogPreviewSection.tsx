import type { BlogPost } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";
import { BlogCard } from "@/components/cards/BlogCard";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export function BlogPreviewSection({
  eyebrow,
  subtitle,
  title,
  data,
}: {
  eyebrow?: string;
  subtitle?: string;
  title?: string;
  data: BlogPost[];
}) {
  const items = data.filter((b) => b.status === "published").slice(0, 3);
  return (
    <section id="blogPreview" className="bg-accent/40 border-y border-border">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow={eyebrow ?? "Blog"}
          title={title ?? "Artikel Terbaru"}
          description={subtitle ?? "Insight seputar SEO, content marketing, dan copywriting."}
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
          >
            Lihat Semua Artikel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
