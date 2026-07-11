import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, Field, inputCls, btnPrimary, btnDanger } from "./ui";
import { logActivity } from "@/lib/admin/log";
import { Plus, Trash2 } from "lucide-react";

export function MenuManager({ location }: { location: "header" | "footer" }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [group, setGroup] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["menu-items", location],
    queryFn: async () => (await supabase.from("menu_items").select("*").eq("location", location).order("sort_order")).data ?? [],
  });

  async function add() {
    if (!label || !href) return;
    const nextOrder = (items[items.length - 1]?.sort_order ?? 0) + 1;
    await supabase.from("menu_items").insert({ location, label, href, group_name: group || null, sort_order: nextOrder });
    await logActivity("create_menu_item", "menu_items", label, { location });
    setLabel(""); setHref(""); setGroup("");
    qc.invalidateQueries({ queryKey: ["menu-items", location] });
  }
  async function remove(id: string) {
    await supabase.from("menu_items").delete().eq("id", id);
    await logActivity("delete_menu_item", "menu_items", id);
    qc.invalidateQueries({ queryKey: ["menu-items", location] });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-secondary">Tambah Item</h3>
        <div className="space-y-3">
          <Field label="Label"><input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} /></Field>
          <Field label="URL / Href"><input value={href} onChange={(e) => setHref(e.target.value)} className={inputCls} placeholder="/tentang" /></Field>
          {location === "footer" && (
            <Field label="Group (opsional)"><input value={group} onChange={(e) => setGroup(e.target.value)} className={inputCls} placeholder="Navigasi, Layanan..." /></Field>
          )}
          <button onClick={add} disabled={!label || !href} className={btnPrimary + " w-full justify-center"}><Plus className="h-4 w-4" /> Tambah</button>
        </div>
      </Card>
      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Urutan</th><th className="px-4 py-3">Label</th><th className="px-4 py-3">Href</th>{location === "footer" && <th className="px-4 py-3">Group</th>}<th></th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Belum ada item.</td></tr>}
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3 text-muted-foreground">{i.sort_order}</td>
                <td className="px-4 py-3 font-medium text-secondary">{i.label}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.href}</td>
                {location === "footer" && <td className="px-4 py-3 text-muted-foreground">{i.group_name ?? "—"}</td>}
                <td className="px-4 py-3 text-right"><button onClick={() => remove(i.id)} className={btnDanger + " !py-1 !px-2 text-xs"}><Trash2 className="h-3.5 w-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
