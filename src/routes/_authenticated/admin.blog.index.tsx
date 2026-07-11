import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, btnPrimary, btnDanger, inputCls } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  head: () => ({ meta: [{ title: "Semua Artikel — Admin" }] }),
  component: BlogList,
});

type StatusFilter = "all" | "draft" | "published" | "scheduled" | "archived";

function BlogList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const { data: posts = [] } = useQuery({
    queryKey: ["blog-posts", q, status],
    queryFn: async () => {
      let query = supabase.from("blog_posts")
        .select("id, title, slug, status, updated_at, scheduled_at, seo_score, category_id, blog_categories(name)")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      if (q) query = query.ilike("title", `%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  async function remove(id: string) {
    if (!confirm("Hapus artikel ini (soft delete)?")) return;
    await supabase.from("blog_posts").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    await logActivity("delete_post", "blog_posts", id);
    qc.invalidateQueries({ queryKey: ["blog-posts"] });
  }

  return (
    <div>
      <PageHeader
        title="Semua Artikel"
        description="Kelola seluruh artikel blog."
        actions={<Link to="/admin/blog/new" className={btnPrimary}><Plus className="h-4 w-4" /> Tambah Artikel</Link>}
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul..." className={`${inputCls} pl-9`} />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className={inputCls + " w-auto"}>
            <option value="all">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Diperbarui</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada artikel.</td></tr>
            )}
            {posts.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-medium text-secondary">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.blog_categories?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "published" ? "bg-green-50 text-green-700"
                    : p.status === "scheduled" ? "bg-blue-50 text-blue-700"
                    : p.status === "archived" ? "bg-slate-200 text-slate-700"
                    : "bg-amber-50 text-amber-700"
                  }`}>{p.status}</span>
                  {p.status === "scheduled" && p.scheduled_at && (
                    <span className="ml-2 text-[11px] text-muted-foreground">→ {new Date(p.scheduled_at).toLocaleString("id-ID")}</span>
                  )}
                  {typeof p.seo_score === "number" && (
                    <span className={`ml-2 text-[11px] ${p.seo_score >= 75 ? "text-green-700" : p.seo_score >= 50 ? "text-amber-700" : "text-red-700"}`}>SEO {p.seo_score}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(p.updated_at).toLocaleDateString("id-ID")}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to="/admin/blog/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                    <button onClick={() => remove(p.id)} className={btnDanger + " !py-1 !px-2 text-xs"}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
