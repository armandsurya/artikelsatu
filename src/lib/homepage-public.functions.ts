import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * SSR-safe reader for published homepage sections.
 *
 * The browser Supabase client uses localStorage and silently fails on the
 * Cloudflare Worker used for SSR — so `usePublishedSections` on the home
 * route returned empty during server render (blank HTML + hydration
 * mismatch). This server fn uses a scoped publishable client so SSR and
 * client hit the same public RLS-safe path.
 *
 * jsonb `data` payloads are JSON-stringified before crossing the RPC
 * boundary to preserve arbitrary shape through Seroval serialization.
 */
export const listPublishedSections = createServerFn({ method: "GET" }).handler(async (): Promise<{ payload: string }> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { payload: "[]" };
  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("homepage_sections")
    .select("section_key,title,sort_order,is_visible,data,last_published_at")
    .order("sort_order");
  if (error) {
    console.error("[listPublishedSections]", error);
    return { payload: "[]" };
  }
  return { payload: JSON.stringify(data ?? []) };
});
