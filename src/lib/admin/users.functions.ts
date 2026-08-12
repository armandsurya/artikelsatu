import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/integrations/api/auth-middleware";
import type { ApiClient } from "@/integrations/api/client";

type Role = "super_admin" | "editor" | "author";
const ROLES: readonly Role[] = ["super_admin", "editor", "author"] as const;

type AuthCtx = { api: ApiClient; userId: string };

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  roles: Role[];
};

type RawUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown> | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
};

async function requireSuperAdmin(context: AuthCtx) {
  const { data, error } = await context.api.rpc<boolean>("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

function randomPassword(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await requireSuperAdmin(context as never);
    const { apiAdmin } = await import("@/integrations/api/client.server");
    const { data: users, error } = await apiAdmin.rpc<RawUser[]>("admin_list_users");
    if (error) throw new Error(error.message);
    const list = users ?? [];
    const ids = list.map((u) => u.id);
    const fallbackIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      apiAdmin.from("profiles").select("id, full_name, avatar_url").in("id", fallbackIds),
      apiAdmin.from("user_roles").select("user_id, role").in("user_id", fallbackIds),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));
    return list.map((u) => {
      const p = pMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name:
          (p?.full_name as string | undefined) ??
          (u.user_metadata?.full_name as string | undefined) ??
          null,
        avatar_url: (p?.avatar_url as string | undefined) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: u.banned_until,
        roles: (roles ?? [])
          .filter((r) => r.user_id === u.id)
          .map((r) => r.role as Role),
      };
    });
  });

export const inviteUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { email?: string; full_name?: string; password?: string; roles?: string[] };
    if (!d?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      throw new Error("Email tidak valid");
    if (d.password && d.password.length < 8) throw new Error("Password minimal 8 karakter");
    const roles = (d.roles ?? []).filter((r): r is Role =>
      (ROLES as readonly string[]).includes(r),
    );
    return {
      email: d.email.trim().toLowerCase(),
      full_name: d.full_name?.trim() || null,
      password: d.password || null,
      roles,
    };
  })
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    const { apiAdmin } = await import("@/integrations/api/client.server");
    // Tidak ada layanan email di backend PHP: bila password tidak diisi,
    // sistem membuat password sementara yang dikembalikan ke admin.
    const password = data.password ?? randomPassword();
    const { data: created, error } = await apiAdmin.rpc<{ id: string }>("admin_create_user", {
      _email: data.email,
      _password: password,
      _full_name: data.full_name ?? "",
    });
    if (error) throw new Error(error.message);
    const userId = created!.id;
    if (data.full_name) {
      await apiAdmin.from("profiles").upsert({ id: userId, full_name: data.full_name });
    }
    if (data.roles.length) {
      await apiAdmin
        .from("user_roles")
        .upsert(data.roles.map((role) => ({ user_id: userId, role })));
    }
    return { id: userId, temporary_password: data.password ? null : password };
  });

export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { id?: string; full_name?: string | null; roles?: string[] };
    if (!d?.id) throw new Error("ID diperlukan");
    const roles = (d.roles ?? []).filter((r): r is Role =>
      (ROLES as readonly string[]).includes(r),
    );
    return { id: d.id, full_name: d.full_name ?? null, roles };
  })
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    const { apiAdmin } = await import("@/integrations/api/client.server");
    await apiAdmin.from("profiles").upsert({ id: data.id, full_name: data.full_name });
    const { data: existing } = await apiAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.id);
    const current = new Set((existing ?? []).map((r) => r.role as Role));
    const desired = new Set<Role>(data.roles);
    const toAdd = [...desired].filter((r) => !current.has(r));
    const toRemove = [...current].filter((r) => !desired.has(r));
    if (toAdd.length) {
      await apiAdmin.from("user_roles").insert(toAdd.map((role) => ({ user_id: data.id, role })));
    }
    if (toRemove.length) {
      await apiAdmin.from("user_roles").delete().eq("user_id", data.id).in("role", toRemove);
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { id?: string };
    if (!d?.id) throw new Error("ID diperlukan");
    return { id: d.id };
  })
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    if (data.id === context.userId) throw new Error("Tidak dapat menghapus akun sendiri");
    const { apiAdmin } = await import("@/integrations/api/client.server");
    const { data: admins } = await apiAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    const adminIds = new Set((admins ?? []).map((a) => a.user_id as string));
    if (adminIds.has(data.id) && adminIds.size <= 1)
      throw new Error("Tidak dapat menghapus super admin terakhir");
    const { error } = await apiAdmin.rpc("admin_delete_user", { _user_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { email?: string; id?: string };
    if (!d?.email && !d?.id) throw new Error("Email diperlukan");
    return { email: d.email ?? null, id: d.id ?? null };
  })
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    const { apiAdmin } = await import("@/integrations/api/client.server");
    let userId = data.id;
    if (!userId && data.email) {
      const { data: users } = await apiAdmin.rpc<RawUser[]>("admin_list_users");
      userId = (users ?? []).find((u) => u.email === data.email)?.id ?? null;
    }
    if (!userId) throw new Error("Pengguna tidak ditemukan");
    const password = randomPassword();
    const { error } = await apiAdmin.rpc("admin_set_password", {
      _user_id: userId,
      _password: password,
    });
    if (error) throw new Error(error.message);
    // Backend PHP tidak mengirim email; password sementara ditampilkan ke admin.
    return { ok: true, temporary_password: password };
  });

export const toggleBan = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as { id?: string; ban?: boolean };
    if (!d?.id) throw new Error("ID diperlukan");
    return { id: d.id, ban: !!d.ban };
  })
  .middleware([requireAuth])
  .handler(async ({ context, data }) => {
    await requireSuperAdmin(context as never);
    if (data.id === context.userId) throw new Error("Tidak dapat menonaktifkan akun sendiri");
    const { apiAdmin } = await import("@/integrations/api/client.server");
    const { error } = await apiAdmin.rpc("admin_set_ban", { _user_id: data.id, _ban: data.ban });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
