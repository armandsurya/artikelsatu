import { supabase } from "@/integrations/supabase/client";

export type UsageContext = "homepage_section" | "blog_post" | "site_settings" | "seo";

export type UsageRow = {
  id: string;
  media_id: string;
  context: string;
  context_id: string;
  field: string;
  created_at: string;
};

/** Look up media by URL to get its id. Returns null when the URL isn't managed by Media Library. */
export async function findMediaIdByUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const { data } = await supabase.from("media").select("id").eq("url", url).maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Record that `mediaUrl` is used in a given field. Removes previous usage rows
 * for the same (context, context_id, field) tuple first — one field = one image.
 */
export async function trackMediaUsage(
  mediaUrl: string,
  context: UsageContext,
  contextId: string,
  field: string,
): Promise<void> {
  // Always clear existing for this slot
  await supabase
    .from("media_usage")
    .delete()
    .eq("context", context)
    .eq("context_id", contextId)
    .eq("field", field);
  const mediaId = await findMediaIdByUrl(mediaUrl);
  if (!mediaId) return;
  await supabase
    .from("media_usage")
    .upsert(
      { media_id: mediaId, context, context_id: contextId, field },
      { onConflict: "media_id,context,context_id,field" },
    );
}

export async function clearMediaUsage(
  context: UsageContext,
  contextId: string,
  field?: string,
): Promise<void> {
  let q = supabase.from("media_usage").delete().eq("context", context).eq("context_id", contextId);
  if (field) q = q.eq("field", field);
  await q;
}

export async function getMediaUsage(mediaId: string): Promise<UsageRow[]> {
  const { data } = await supabase
    .from("media_usage")
    .select("*")
    .eq("media_id", mediaId)
    .order("created_at");
  return (data as UsageRow[]) ?? [];
}

export function describeUsage(row: UsageRow): string {
  const map: Record<string, string> = {
    homepage_section: "Homepage",
    blog_post: "Blog",
    site_settings: "Site Settings",
    seo: "SEO",
  };
  return `${map[row.context] ?? row.context} · ${row.context_id} · ${row.field}`;
}
