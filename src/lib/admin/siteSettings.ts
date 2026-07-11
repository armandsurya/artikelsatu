import { supabase } from "@/integrations/supabase/client";

/** site_settings is a singleton row keyed by id=1 holding a JSON blob. */
export async function loadSiteSettings<T = Record<string, unknown>>(): Promise<T> {
  const { data } = await supabase.from("site_settings").select("*").order("id").limit(1).maybeSingle();
  if (!data) {
    const inserted = await supabase.from("site_settings").insert({ data: {} as never }).select("*").single();
    return (inserted.data?.data ?? {}) as T;
  }
  return (data.data ?? {}) as T;
}

export async function patchSiteSettings(patch: Record<string, unknown>): Promise<{ error: unknown }> {
  const { data: row } = await supabase.from("site_settings").select("*").order("id").limit(1).maybeSingle();
  if (!row) {
    const { error } = await supabase.from("site_settings").insert({ data: patch as never });
    return { error };
  }
  const merged = { ...((row.data as Record<string, unknown>) ?? {}), ...patch };
  const { error } = await supabase.from("site_settings").update({ data: merged as never }).eq("id", row.id);
  return { error };
}
