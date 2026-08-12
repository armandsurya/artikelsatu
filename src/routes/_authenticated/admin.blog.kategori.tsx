import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary, btnDanger } from "@/components/admin/ui";
import { logActivity, slugify } from "@/lib/admin/log";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/blog/kategori")({
  head: () => ({ meta: [{ title: "Kategori — Admin" }] }),
  component: Kategori,
});

function Kategori() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");

  const { data: cats = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () =>
      (await supabase.from("blog_categories").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });

  async function add() {
    if (!name) return;
    const finalSlug = slug || slugify(name);
    const { error } = await supabase
      .from("blog_categories")
      .insert({ name, slug: finalSlug, description: desc || null });
    if (error) {
      alert(error.message);
      return;
    }
    await logActivity("create_category", "blog_categories", finalSlug);
    setName("");
    setSlug("");
    setDesc("");
    qc.invalidateQueries({ queryKey: ["categories-all"] });
  }
  async function remove(id: string) {
    if (!confirm("Hapus kategori?")) return;
    await supabase.from("blog_categories").delete().eq("id", id);
    await logActivity("delete_category", "blog_categories", id);
    qc.invalidateQueries({ queryKey: ["categories-all"] });
  }

  return (
    <div>
      <PageHeader title="Kategori" description="Kelola kategori artikel blog." />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Tambah Kategori</h3>
          <div className="space-y-3">
            <Field label="Nama">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Slug" hint="Otomatis dari nama">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={inputCls}
                placeholder={slugify(name)}
              />
            </Field>
            <Field label="Deskripsi">
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Field>
            <button
              onClick={add}
              disabled={!name}
              className={btnPrimary + " w-full justify-center"}
            >
              <Plus className="h-4 w-4" /> Tambah
            </button>
          </div>
        </Card>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    Belum ada kategori.
                  </td>
                </tr>
              )}
              {cats.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-secondary">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(c.id)}
                      className={btnDanger + " !py-1 !px-2 text-xs"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
