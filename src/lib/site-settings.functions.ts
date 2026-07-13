import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * SSR-safe reader for the singleton `site_settings` blob.
 *
 * Uses the server publishable Supabase client so the fetch works during SSR
 * (the browser client depends on localStorage and silently fails on the
 * worker). Public SELECT policy on `site_settings` makes anon reads safe.
 *
 * Rendered result is written into the same TanStack Query cache key that
 * `useSiteSettings` reads, so client hydration starts from the exact DB
 * snapshot the server used — eliminating Navbar/Footer hydration mismatches.
 */
export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<{ data: string }> => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { data: "{}" };
  const client = createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("site_settings")
    .select("data")
    .order("id")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[getPublicSiteSettings]", error);
    return { data: "{}" };
  }
  return { data: JSON.stringify(data?.data ?? {}) };
});

export async function fetchPublicSiteSettings(): Promise<Record<string, unknown>> {
  const { data } = await getPublicSiteSettings();
  try { return JSON.parse(data) as Record<string, unknown>; } catch { return {}; }
}
