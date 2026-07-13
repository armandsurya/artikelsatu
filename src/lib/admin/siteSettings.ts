import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import { PUBLISHED_QUERY_KEY } from "@/lib/publishedContent";

/**
 * site_settings is a singleton row holding a JSON blob (single source of truth
 * for global site identity: name, logo, contact, header, footer, seo, …).
 *
 * We always read the FIRST row ordered by id — the historical migration path
 * has produced rows with id=1 on some projects and other ids on others; the
 * ordered/limit(1) shape works for both without hard-coding an id.
 */
export async function loadSiteSettings<T = Record<string, unknown>>(): Promise<T> {
  const { data } = await supabase.from("site_settings").select("*").order("id").limit(1).maybeSingle();
  if (!data) {
    const inserted = await supabase.from("site_settings").insert({ data: {} as never }).select("*").single();
    return (inserted.data?.data ?? {}) as T;
  }
  return (data.data ?? {}) as T;
}

export async function patchSiteSettings(patch: Record<string, unknown>): Promise<{ error: { message: string; code?: string; hint?: string } | null }> {
  const { data: row, error: readErr } = await supabase.from("site_settings").select("*").order("id").limit(1).maybeSingle();
  if (readErr) { console.error("[siteSettings] read failed", readErr); return { error: { message: readErr.message, code: readErr.code } }; }
  if (!row) {
    const { data, error } = await supabase.from("site_settings").insert({ data: patch as never }).select();
    if (error) { console.error("[siteSettings] insert failed", error); return { error: { message: error.message, code: error.code, hint: error.hint ?? undefined } }; }
    if (!data || data.length === 0) return { error: { message: "Tidak ada baris yang tersimpan. Akun Anda kemungkinan tidak memiliki hak akses (super_admin) atau session sudah kadaluarsa. Silakan login ulang." } };
    return { error: null };
  }
  const merged = { ...((row.data as Record<string, unknown>) ?? {}), ...patch };
  const { data, error } = await supabase.from("site_settings").update({ data: merged as never }).eq("id", row.id).select();
  if (error) { console.error("[siteSettings] update failed", error); return { error: { message: error.message, code: error.code, hint: error.hint ?? undefined } }; }
  if (!data || data.length === 0) return { error: { message: "Perubahan tidak tersimpan (0 baris ter-update). Session Anda kemungkinan kadaluarsa atau akun bukan super_admin. Silakan login ulang." } };
  return { error: null };
}

/**
 * Central invalidator — any admin surface that mutates site_settings MUST call
 * this so every consumer (Navbar, Footer, SEO route head, admin editors)
 * re-fetches the fresh blob on the next tick.
 */
export function invalidateSiteSettings(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: [...PUBLISHED_QUERY_KEY, "site_settings"] });
  qc.invalidateQueries({ queryKey: ["site-settings-full"] });
  qc.invalidateQueries({ queryKey: ["site-settings"] });
  qc.invalidateQueries({ queryKey: ["seo-settings"] });
}
