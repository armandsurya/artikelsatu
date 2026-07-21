import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * SSR-safe blog readers.
 *
 * The browser Supabase client relies on localStorage and silently fails on
 * the Cloudflare Worker used for SSR — that caused blog detail loaders to
 * throw notFound() during server render, killing OG tags and SEO. These
 * server fns use a scoped publishable client so both SSR and client hit
 * the same path with the same public RLS policy.
 *
 * Payloads are JSON-stringified before crossing the RPC boundary so
 * jsonb `content` (arbitrary shape) survives serialization.
 */

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getPublishedPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<{ payload: string | null }> => {
    const client = getClient();
    if (!client) return { payload: null };
    const { data: row, error } = await client
      .from("blog_posts")
      .select(
        "id,title,slug,excerpt,content,featured_image,category_id,tags,author_id,status,read_time,published_at,updated_at,meta_title,meta_description,canonical_url",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();
    if (error) {
      console.error("[getPublishedPostBySlug]", error);
      return { payload: null };
    }
    return { payload: row ? JSON.stringify(row) : null };
  });

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ payload: string }> => {
    const client = getClient();
    if (!client) return { payload: "[]" };
    const { data, error } = await client
      .from("blog_posts")
      .select(
        "id,title,slug,excerpt,content,featured_image,category_id,tags,author_id,status,read_time,published_at,updated_at,meta_title,meta_description",
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("[listPublishedPosts]", error);
      return { payload: "[]" };
    }
    return { payload: JSON.stringify(data ?? []) };
  },
);

export const listBlogCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ payload: string }> => {
    const client = getClient();
    if (!client) return { payload: "[]" };
    const { data, error } = await client
      .from("blog_categories")
      .select("id,name,slug")
      .order("name");
    if (error) {
      console.error("[listBlogCategories]", error);
      return { payload: "[]" };
    }
    return { payload: JSON.stringify(data ?? []) };
  },
);
