import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/pengguna")({
  head: () => ({ meta: [{ title: "Pengguna — Admin" }] }),
  component: Pengguna,
});

function Pengguna() {
  const { data: users = [] } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  return (
    <div>
      <PageHeader title="Pengguna" description="Daftar pengguna admin dan role mereka." />
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Terdaftar</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Belum ada pengguna.</td></tr>}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-secondary">{u.full_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0 ? <span className="text-muted-foreground">—</span> : u.roles.map((r) => (
                      <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
