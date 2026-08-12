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
  const url = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function withAuthorNames<T extends { author_id: string | null }>(
  client: ReturnType<typeof getClient>,
  rows: T[],
): Promise<(T & { author_name: string | null })[]> {
  if (!client || rows.length === 0) return rows.map((row) => ({ ...row, author_name: null }));
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter(Boolean))) as string[];
  if (authorIds.length === 0) return rows.map((row) => ({ ...row, author_name: null }));
  // profiles is not readable by `anon` (RLS), so public reads go through a
  // security-definer RPC that only exposes names of published-post authors.
  const { data, error } = await client.rpc("get_public_author_names", { _ids: authorIds });
  if (error) {
    console.error("[withAuthorNames]", error);
    return rows.map((row) => ({ ...row, author_name: null }));
  }
  const names = new Map((data ?? []).map((profile) => [profile.id, profile.full_name]));
  return rows.map((row) => ({ ...row, author_name: row.author_id ? names.get(row.author_id) ?? null : null }));
}


export const getPublishedPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<{ payload: string | null }> => {
    const client = getClient();
    if (!client) throw new Error("Public blog backend is not configured");
    const { data: row, error } = await client
      .from("blog_posts")
      .select(
        "id,title,slug,excerpt,content,featured_image,category_id,tags,focus_keywords,author_id,status,read_time,published_at,updated_at,meta_title,meta_description,canonical_url",
      )
      .eq("slug", data.slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (error) {
      console.error("[getPublishedPostBySlug]", error);
      throw error;
    }
    if (!row) return { payload: null };
    const [enriched] = await withAuthorNames(client, [row]);
    return { payload: JSON.stringify(enriched) };
  });

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ payload: string }> => {
    const client = getClient();
    if (!client) throw new Error("Public blog backend is not configured");
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
      throw error;
    }
    const enriched = await withAuthorNames(client, data ?? []);
    return { payload: JSON.stringify(enriched) };
  },
);

export const listBlogCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ payload: string }> => {
    const client = getClient();
    if (!client) throw new Error("Public blog backend is not configured");
    const { data, error } = await client
      .from("blog_categories")
      .select("id,name,slug")
      .order("name");
    if (error) {
      console.error("[listBlogCategories]", error);
      throw error;
    }
    return { payload: JSON.stringify(data ?? []) };
  },
);
