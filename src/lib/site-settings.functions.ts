import { createServerFn } from "@tanstack/react-start";
import { createServerApiClient } from "@/integrations/api/server";

/**
 * SSR-safe reader for the singleton `site_settings` blob.
 *
 * Uses the server publishable Supabase client so the fetch works during SSR
 * (the browser client depends on localStorage and silently fails on the
 * worker). Anon reads go through the sanitized `get_public_site_settings` RPC.
 *
 * Rendered result is written into the same TanStack Query cache key that
 * `useSiteSettings` reads, so client hydration starts from the exact DB
 * snapshot the server used — eliminating Navbar/Footer hydration mismatches.
 */
export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ data: string }> => {
    const client = createServerApiClient();
    // Reads through a security-definer accessor that returns ONLY the public
    // subset of the settings blob (draft/secret-ish keys are stripped server
    // side); the table itself is no longer readable by anonymous visitors.
    const { data, error } = await client.rpc("get_public_site_settings");
    if (error) {
      console.error("[getPublicSiteSettings]", error);
      throw error;
    }
    return { data: JSON.stringify(data ?? {}) };
  },
);

export async function fetchPublicSiteSettings(): Promise<Record<string, unknown>> {
  const { data } = await getPublicSiteSettings();
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}
