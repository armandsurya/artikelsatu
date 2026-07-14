import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PermissionKey =
  | "homepage"
  | "blog"
  | "media"
  | "seo"
  | "redirect"
  | "users"
  | "roles"
  | "settings"
  | "security"
  | "log";

type PermMap = Record<string, boolean>;

export function usePermissions() {
  return useQuery<PermMap>({
    queryKey: ["my-permissions"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return {};
      const [{ data: myRoles }, { data: rows }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("role_permissions").select("role, permission, allowed"),
      ]);
      const roleSet = new Set((myRoles ?? []).map((r) => r.role as string));
      // super_admin bypass
      if (roleSet.has("super_admin")) {
        const all: PermMap = {};
        for (const r of rows ?? []) all[r.permission] = true;
        // ensure all known perms true
        for (const k of [
          "homepage",
          "blog",
          "media",
          "seo",
          "redirect",
          "users",
          "roles",
          "settings",
          "security",
          "log",
        ])
          all[k] = true;
        return all;
      }
      const map: PermMap = {};
      for (const r of rows ?? []) {
        if (roleSet.has(r.role as string) && r.allowed) map[r.permission] = true;
      }
      return map;
    },
  });
}

export function useHasPermission(key: PermissionKey): { allowed: boolean; loading: boolean } {
  const { data, isLoading } = usePermissions();
  return { allowed: !!data?.[key], loading: isLoading };
}
