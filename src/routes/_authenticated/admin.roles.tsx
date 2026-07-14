import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, btnPrimary, btnGhost } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Save, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  head: () => ({ meta: [{ title: "Role & Permission — Admin" }] }),
  component: RolesPage,
});

type Role = "super_admin" | "editor" | "author";
const ROLES: Role[] = ["super_admin", "editor", "author"];
const PERMS: { key: string; label: string }[] = [
  { key: "homepage", label: "Website / Homepage" },
  { key: "blog", label: "Blog" },
  { key: "media", label: "Media" },
  { key: "seo", label: "SEO" },
  { key: "redirect", label: "Redirect URL" },
  { key: "users", label: "Pengguna" },
  { key: "roles", label: "Role & Permission" },
  { key: "settings", label: "Pengaturan" },
  { key: "security", label: "Keamanan" },
  { key: "log", label: "Log Aktivitas" },
];

type Row = { role: Role; permission: string; allowed: boolean };
type Matrix = Record<Role, Record<string, boolean>>;

function toMatrix(rows: Row[]): Matrix {
  const m = Object.fromEntries(
    ROLES.map((r) => [r, Object.fromEntries(PERMS.map((p) => [p.key, false]))]),
  ) as Matrix;
  for (const row of rows) {
    if (ROLES.includes(row.role) && (m[row.role] as Record<string, boolean>)) {
      m[row.role][row.permission] = row.allowed;
    }
  }
  return m;
}

function RolesPage() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, permission, allowed");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const initial = useMemo(() => toMatrix(rows), [rows]);
  const [matrix, setMatrix] = useState<Matrix>(initial);
  useEffect(() => {
    setMatrix(initial);
  }, [initial]);

  const dirty = JSON.stringify(matrix) !== JSON.stringify(initial);

  const toggle = (role: Role, key: string) => {
    if (role === "super_admin") return; // locked, always allowed
    setMatrix((m) => ({ ...m, [role]: { ...m[role], [key]: !m[role][key] } }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = ROLES.flatMap((role) =>
        PERMS.map((p) => ({
          role,
          permission: p.key,
          allowed: role === "super_admin" ? true : !!matrix[role][p.key],
        })),
      );
      const { error } = await supabase
        .from("role_permissions")
        .upsert(payload, { onConflict: "role,permission" });
      if (error) throw error;
      await logActivity("update_role_permissions", "role_permissions");
    },
    onSuccess: () => {
      toast.success("Matriks permission disimpan");
      qc.invalidateQueries({ queryKey: ["role-permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Assignment section
  const { data: users = [] } = useQuery({
    queryKey: ["users-with-roles-list"],
    queryFn: async () => {
      const [{ data: profiles }, { data: userRoles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (userRoles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as Role),
      }));
    },
  });

  async function setRole(userId: string, role: Role, on: boolean) {
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) return toast.error(error.message);
    }
    await logActivity(on ? "grant_role" : "revoke_role", "user_roles", userId, { role });
    qc.invalidateQueries({ queryKey: ["users-with-roles-list"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div>
      <PageHeader
        title="Role & Permission"
        description="Atur izin per role dan tetapkan role ke pengguna. Perubahan berlaku pada gating menu admin dan API."
        actions={
          <>
            <button onClick={() => setMatrix(initial)} className={btnGhost} disabled={!dirty}>
              <RotateCcw className="h-4 w-4" /> Reset
            </button>
            <button
              onClick={() => saveMut.mutate()}
              className={btnPrimary}
              disabled={!dirty || saveMut.isPending}
            >
              <Save className="h-4 w-4" /> {saveMut.isPending ? "Menyimpan…" : "Simpan"}
            </button>
          </>
        }
      />

      <Card className="mb-6">
        <h3 className="mb-4 text-sm font-semibold text-secondary">Matriks Permission</h3>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground">Memuat…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Modul</th>
                  {ROLES.map((r) => (
                    <th key={r} className="py-2 px-3 text-center">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMS.map((p) => (
                  <tr key={p.key}>
                    <td className="py-2 pr-4 font-medium text-secondary">{p.label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={r === "super_admin" ? true : !!matrix[r]?.[p.key]}
                          disabled={r === "super_admin"}
                          onChange={() => toggle(r, p.key)}
                          className="h-4 w-4"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          <strong>super_admin</strong> selalu memiliki semua izin. Enforcement final dijalankan di
          RLS/database via fungsi <code>has_permission</code>.
        </p>
      </Card>

      <Card className="!p-0 overflow-hidden">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold text-secondary">Assignment Role ke Pengguna</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ceklis untuk memberi/mencabut role. Kelola pengguna lengkap di menu Pengguna.
          </p>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Pengguna</th>
              {ROLES.map((r) => (
                <th key={r} className="px-4 py-3 text-center">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={ROLES.length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Belum ada pengguna.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium text-secondary">
                  {u.full_name ?? u.id.slice(0, 8)}
                </td>
                {ROLES.map((r) => {
                  const has = u.roles.includes(r);
                  return (
                    <td key={r} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={has}
                        onChange={(e) => setRole(u.id, r, e.target.checked)}
                        className="h-4 w-4"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
