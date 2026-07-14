import { Clock, User } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { BlogPost } from "@/types";
import { useMediaByUrl, resolveAlt } from "@/lib/media/metadata";

export function BlogCard({ post }: { post: BlogPost }) {
  const date = new Date(post.publishedDate).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const { data: media } = useMediaByUrl(post.featuredImage);
  const alt = resolveAlt(media, post.title);
  return (
    <article className="group flex flex-col overflow-hidden rounded-[16px] border border-border bg-card transition-colors hover:border-primary/40">
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="block aspect-[16/9] overflow-hidden bg-accent"
        aria-label={post.title}
      >
        <img
          src={post.featuredImage}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={media?.width ?? undefined}
          height={media?.height ?? undefined}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <span className="inline-flex w-fit rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
          {post.category}
        </span>
        <h3 className="mt-3 text-base font-semibold leading-snug text-secondary">
          <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {post.author}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime} menit
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{date}</div>
      </div>
    </article>
  );
}
