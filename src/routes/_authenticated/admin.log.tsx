import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/browser";
import { PageHeader, Card } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/log")({
  head: () => ({ meta: [{ title: "Log Aktivitas — Admin" }] }),
  component: LogPage,
});

function LogPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      const { data: logs } = await api
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      const userIds = Array.from(
        new Set((logs ?? []).map((l) => l.user_id).filter(Boolean)),
      ) as string[];
      const { data: profiles } = userIds.length
        ? await api.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return (logs ?? []).map(
        (l) =>
          ({
            ...l,
            userName: l.user_id ? (nameMap.get(l.user_id) ?? "—") : "sistem",
          }) as Record<string, any>,
      );
    },
  });

  return (
    <div>
      <PageHeader
        title="Log Aktivitas"
        description="Catatan login, edit, upload, dan perubahan pengaturan."
      />
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Pengguna</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Entitas</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  Belum ada aktivitas.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3">{r.userName}</td>
                <td className="px-4 py-3 font-medium text-secondary">{r.action}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.entity ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
