import { supabase } from "@/integrations/supabase/client";
import { blogPosts, blogCategories } from "@/data/blog";

/**
 * Seed blog_categories and blog_posts from the frontend data files
 * if the CMS tables are still empty. Runs once per session.
 */
let ran = false;

export async function ensureBlogSeeded(): Promise<void> {
  if (ran) return;
  ran = true;

  const { count: catCount } = await supabase
    .from("blog_categories")
    .select("*", { count: "exact", head: true });

  const catMap = new Map<string, string>(); // name -> id

  if (!catCount || catCount === 0) {
    const cats = blogCategories
      .filter((c) => c.toLowerCase() !== "semua")
      .map((name) => ({ name, slug: slugify(name) }));
    const { data: inserted } = await supabase
      .from("blog_categories")
      .insert(cats as never)
      .select("id, name");
    (inserted ?? []).forEach((c: { id: string; name: string }) => catMap.set(c.name, c.id));
  } else {
    const { data: existing } = await supabase.from("blog_categories").select("id, name");
    (existing ?? []).forEach((c: { id: string; name: string }) => catMap.set(c.name, c.id));
  }

  const { count: postCount } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true });

  if (!postCount || postCount === 0) {
    const rows = blogPosts.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      featured_image: p.featuredImage,
      category_id: catMap.get(p.category) ?? null,
      author: p.author,
      published_at: p.publishedDate ? new Date(p.publishedDate).toISOString() : null,
      read_time: p.readTime,
      tags: p.tags ?? [],
      status: p.status ?? "published",
      content: `<p>${p.excerpt}</p>`,
    }));
    await supabase.from("blog_posts").insert(rows as never);
  }
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
