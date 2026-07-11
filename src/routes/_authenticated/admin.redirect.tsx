import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary, btnDanger } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/redirect")({
  head: () => ({ meta: [{ title: "Redirect URL — Admin" }] }),
  component: RedirectPage,
});

function RedirectPage() {
  const qc = useQueryClient();
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState<301 | 302>(301);

  const { data: rows = [] } = useQuery({
    queryKey: ["redirects"],
    queryFn: async () => (await supabase.from("redirects").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function add() {
    if (!source || !destination) return;
    const { error } = await supabase.from("redirects").insert({ source, destination, code });
    if (error) { alert(error.message); return; }
    await logActivity("create_redirect", "redirects", source);
    setSource(""); setDestination("");
    qc.invalidateQueries({ queryKey: ["redirects"] });
  }
  async function toggleActive(id: string, cur: boolean) {
    await supabase.from("redirects").update({ active: !cur }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["redirects"] });
  }
  async function remove(id: string) {
    if (!confirm("Hapus redirect?")) return;
    await supabase.from("redirects").delete().eq("id", id);
    await logActivity("delete_redirect", "redirects", id);
    qc.invalidateQueries({ queryKey: ["redirects"] });
  }

  return (
    <div>
      <PageHeader title="Redirect URL" description="Kelola redirect 301 & 302." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Tambah Redirect</h3>
          <div className="space-y-3">
            <Field label="Source URL"><input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="/lama" /></Field>
            <Field label="Destination URL"><input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} placeholder="/baru" /></Field>
            <Field label="Code">
              <select value={code} onChange={(e) => setCode(Number(e.target.value) as 301 | 302)} className={inputCls}>
                <option value={301}>301 Permanent</option>
                <option value={302}>302 Temporary</option>
              </select>
            </Field>
            <button onClick={add} disabled={!source || !destination} className={btnPrimary + " w-full justify-center"}><Plus className="h-4 w-4" /> Tambah</button>
          </div>
        </Card>
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Destination</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Aktif</th><th></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada redirect.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs text-secondary">{r.source}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.destination}</td>
                  <td className="px-4 py-3">{r.code}</td>
                  <td className="px-4 py-3"><label className="inline-flex items-center"><input type="checkbox" checked={r.active} onChange={() => toggleActive(r.id, r.active)} /></label></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => remove(r.id)} className={btnDanger + " !py-1 !px-2 text-xs"}><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
