import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/integrations/api/browser";
import { PageHeader, Card } from "@/components/admin/ui";
import {
  FileText,
  FolderTree,
  Image as ImageIcon,
  Users,
  Database,
  Clock,
  CheckCircle2,
  PenLine,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin ArtikelPro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const base = () =>
        api
          .from("blog_posts")
          .select("*", { count: "exact", head: true })
          .is("deleted_at", null);
      const [posts, drafts, published, scheduled, archived, cats, media, users, recent] =
        await Promise.all([
          base(),
          base().eq("status", "draft"),
          base().eq("status", "published"),
          base().eq("status", "scheduled"),
          api
            .from("blog_posts")
            .select("*", { count: "exact", head: true })
            .not("deleted_at", "is", null),
          api.from("blog_categories").select("*", { count: "exact", head: true }),
          api.from("media").select("size_bytes"),
          api.from("profiles").select("*", { count: "exact", head: true }),
          api
            .from("activity_log")
            .select("id, action, entity, created_at, user_id")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
      const storage = (media.data ?? []).reduce((a, m) => a + Number(m.size_bytes ?? 0), 0);
      return {
        posts: posts.count ?? 0,
        drafts: drafts.count ?? 0,
        published: published.count ?? 0,
        scheduled: scheduled.count ?? 0,
        archived: archived.count ?? 0,
        cats: cats.count ?? 0,
        mediaCount: media.data?.length ?? 0,
        users: users.count ?? 0,
        storage,
        recent: recent.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Jumlah Artikel", value: data?.posts ?? "—", icon: FileText },
    { label: "Draft", value: data?.drafts ?? "—", icon: PenLine },
    { label: "Published", value: data?.published ?? "—", icon: CheckCircle2 },
    { label: "Kategori", value: data?.cats ?? "—", icon: FolderTree },
    { label: "Media", value: data?.mediaCount ?? "—", icon: ImageIcon },
    { label: "Pengguna", value: data?.users ?? "—", icon: Users },
    { label: "Storage", value: data ? formatBytes(data.storage) : "—", icon: Database },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Ringkasan konten dan aktivitas terbaru." />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-semibold text-secondary">{s.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-secondary">Aktivitas Terbaru</h2>
          </div>
          {data?.recent.length ? (
            <ul className="divide-y divide-border">
              {data.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span>
                    <span className="font-medium text-secondary">{r.action}</span>
                    {r.entity && <span className="text-muted-foreground"> · {r.entity}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada aktivitas.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
