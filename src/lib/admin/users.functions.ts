import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "super_admin" | "editor" | "author";
const ROLES: readonly Role[] = ["super_admin", "editor", "author"] as const;

async function requireSuperAdmin(context: { supabase: Awaited<ReturnType<typeof requireSupabaseAuth.server>>["context"]["supabase"]; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authList, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (authErr) throw new Error(authErr.message);
    const ids = authList.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, created_at, updated_at").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return authList.users.map((u) => {
      const p = pMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? (u.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: p?.avatar_url ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        banned_until: (u as unknown as { banned_until?: string | null }).banned_until ?? null,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as Role),
      };
    });
  });

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { email?: string; full_name?: string; password?: string; roles?: string[] };
    if (!d?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error("Email tidak valid");
    if (d.password && d.password.length < 8) throw new Error("Password minimal 8 karakter");
    const roles = (d.roles ?? []).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
    return { email: d.email.trim().toLowerCase(), full_name: d.full_name?.trim() || null, password: d.password || null, roles };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let userId: string;
    if (data.password) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: data.full_name ? { full_name: data.full_name } : {},
      });
      if (error) throw new Error(error.message);
      userId = created.user!.id;
    } else {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: data.full_name ? { full_name: data.full_name } : {},
      });
      if (error) throw new Error(error.message);
      userId = invited.user!.id;
    }
    if (data.full_name) {
      await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.full_name });
    }
    if (data.roles.length) {
      await supabaseAdmin.from("user_roles").upsert(data.roles.map((role) => ({ user_id: userId, role })), { onConflict: "user_id,role" });
    }
    return { id: userId };
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { id?: string; full_name?: string | null; roles?: string[] };
    if (!d?.id) throw new Error("ID diperlukan");
    const roles = (d.roles ?? []).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
    return { id: d.id, full_name: d.full_name ?? null, roles };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").upsert({ id: data.id, full_name: data.full_name });
    // sync roles
    const { data: existing } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.id);
    const current = new Set((existing ?? []).map((r) => r.role as Role));
    const desired = new Set(data.roles);
    const toAdd = [...desired].filter((r) => !current.has(r));
    const toRemove = [...current].filter((r) => !desired.has(r));
    if (toAdd.length) {
      await supabaseAdmin.from("user_roles").insert(toAdd.map((role) => ({ user_id: data.id, role })));
    }
    if (toRemove.length) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).in("role", toRemove);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { id?: string };
    if (!d?.id) throw new Error("ID diperlukan");
    return { id: d.id };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    if (data.id === context.userId) throw new Error("Tidak dapat menghapus akun sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Safeguard: prevent removing the last super_admin
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "super_admin");
    const adminIds = new Set((admins ?? []).map((a) => a.user_id));
    if (adminIds.has(data.id) && adminIds.size <= 1) throw new Error("Tidak dapat menghapus super admin terakhir");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { email?: string };
    if (!d?.email) throw new Error("Email diperlukan");
    return { email: d.email };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email: data.email });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleBan = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { id?: string; ban?: boolean };
    if (!d?.id) throw new Error("ID diperlukan");
    return { id: d.id, ban: !!d.ban };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    if (data.id === context.userId) throw new Error("Tidak dapat menonaktifkan akun sendiri");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.ban ? "876000h" : "none",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
