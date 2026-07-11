import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "Role & Permission — Admin" }] }),
  component: RolesPage,
});

const ROLES = ["super_admin", "editor", "author"] as const;
const PERMS = ["Homepage", "Blog", "SEO", "Pengaturan", "Media", "Pengguna"];
const MATRIX: Record<string, Record<string, boolean>> = {
  super_admin: Object.fromEntries(PERMS.map((p) => [p, true])),
  editor: { Homepage: true, Blog: true, SEO: true, Pengaturan: false, Media: true, Pengguna: false },
  author: { Homepage: false, Blog: true, SEO: false, Pengaturan: false, Media: true, Pengguna: false },
};

function RolesPage() {
  const qc = useQueryClient();
  const { data: users = [] } = useQuery({
    queryKey: ["users-with-roles-list"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("user_roles").select("user_id, role, id"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id),
      }));
    },
  });

  async function setRole(userId: string, role: typeof ROLES[number], on: boolean) {
    if (on) await supabase.from("user_roles").insert({ user_id: userId, role });
    else await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    await logActivity(on ? "grant_role" : "revoke_role", "user_roles", userId, { role });
    qc.invalidateQueries({ queryKey: ["users-with-roles-list"] });
  }

  return (
    <div>
      <PageHeader title="Role & Permission" description="Atur peran pengguna dan ringkasan permission." />
      <Card className="mb-6 !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Pengguna</th>
              {ROLES.map((r) => <th key={r} className="px-4 py-3 text-center">{r}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-secondary">{u.full_name ?? u.id.slice(0, 8)}</td>
                {ROLES.map((r) => {
                  const has = u.roles.some((x) => x.role === r);
                  return (
                    <td key={r} className="px-4 py-3 text-center">
                      <input type="checkbox" checked={has} onChange={(e) => setRole(u.id, r, e.target.checked)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Matriks Permission</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Modul</th>{ROLES.map((r) => <th key={r} className="py-2 text-center">{r}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMS.map((p) => (
                <tr key={p}>
                  <td className="py-2 font-medium text-secondary">{p}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="py-2 text-center">{MATRIX[r][p] ? "✓" : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Matriks ini adalah rujukan; enforcement dilakukan lewat RLS di database.</p>
      </Card>
    </div>
  );
}
