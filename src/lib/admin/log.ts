import { supabase } from "@/integrations/supabase/client";

export async function logActivity(
  action: string,
  entity?: string,
  entity_id?: string,
  meta?: Record<string, unknown>,
) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("activity_log").insert({
    user_id: data.user.id,
    action,
    entity: entity ?? null,
    entity_id: entity_id ?? null,
    meta: (meta ?? {}) as never,
  });
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}
