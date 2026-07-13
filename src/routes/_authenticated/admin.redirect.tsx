import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary, btnDanger } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Plus, Trash2, Pencil, Save, X, Search } from "lucide-react";
import {
  ADMIN_REDIRECTS_QUERY_KEY,
  REDIRECTS_QUERY_KEY,
  fetchAllRedirects,
  validateRedirect,
  type RedirectRow,
} from "@/lib/redirects/service";

export const Route = createFileRoute("/_authenticated/admin/redirect")({
  head: () => ({ meta: [{ title: "Redirect URL — Admin" }] }),
  component: RedirectPage,
});

function fmt(dt: string | null | undefined) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("id-ID"); } catch { return "—"; }
}

function RedirectPage() {
  const qc = useQueryClient();
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState<301 | 302>(301);
  const [notes, setNotes] = useState("");
  const [preserveQuery, setPreserveQuery] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<RedirectRow>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [...ADMIN_REDIRECTS_QUERY_KEY],
    queryFn: fetchAllRedirects,
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.source.toLowerCase().includes(term) ||
        r.destination.toLowerCase().includes(term) ||
        (r.notes ?? "").toLowerCase().includes(term),
    );
  }, [rows, q]);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: [...ADMIN_REDIRECTS_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [...REDIRECTS_QUERY_KEY] });
  }

  async function add() {
    const err = validateRedirect({ source, destination }, rows);
    if (err) { toast.error(err); return; }
    setSaving(true);
    const { error } = await supabase.from("redirects").insert({
      source: source.trim(),
      destination: destination.trim(),
      code,
      active: true,
      notes: notes.trim() || null,
      preserve_query: preserveQuery,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await logActivity("create_redirect", "redirects", source.trim());
    toast.success("Redirect ditambahkan");
    setSource(""); setDestination(""); setNotes(""); setCode(301); setPreserveQuery(true);
    invalidateAll();
  }

  async function toggleActive(row: RedirectRow) {
    const { error } = await supabase.from("redirects").update({ active: !row.active }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success(row.active ? "Redirect dinonaktifkan" : "Redirect diaktifkan");
    invalidateAll();
  }

  async function remove(row: RedirectRow) {
    if (!confirm(`Hapus redirect ${row.source} → ${row.destination}?`)) return;
    const { error } = await supabase.from("redirects").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("delete_redirect", "redirects", row.id);
    toast.success("Redirect dihapus");
    invalidateAll();
  }

  function startEdit(r: RedirectRow) {
    setEditingId(r.id);
    setEditDraft({
      source: r.source,
      destination: r.destination,
      code: r.code,
      notes: r.notes,
      preserve_query: r.preserve_query,
    });
  }
  function cancelEdit() { setEditingId(null); setEditDraft({}); }

  async function saveEdit(r: RedirectRow) {
    const draft = { ...r, ...editDraft } as RedirectRow;
    const err = validateRedirect(
      { source: draft.source, destination: draft.destination, id: r.id },
      rows,
    );
    if (err) { toast.error(err); return; }
    const { error } = await supabase.from("redirects").update({
      source: draft.source.trim(),
      destination: draft.destination.trim(),
      code: draft.code,
      notes: (draft.notes ?? "").toString().trim() || null,
      preserve_query: draft.preserve_query,
    }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await logActivity("update_redirect", "redirects", r.id);
    toast.success("Redirect diperbarui");
    cancelEdit();
    invalidateAll();
  }

  return (
    <div>
      <PageHeader title="Redirect URL" description="Kelola redirect 301 & 302 lengkap dengan pelacakan kunjungan." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Tambah Redirect</h3>
          <div className="space-y-3">
            <Field label="Source URL"><input value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} placeholder="/halaman-lama" /></Field>
            <Field label="Destination URL"><input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} placeholder="/halaman-baru atau https://..." /></Field>
            <Field label="Code">
              <select value={code} onChange={(e) => setCode(Number(e.target.value) as 301 | 302)} className={inputCls}>
                <option value={301}>301 Permanent (SEO)</option>
                <option value={302}>302 Temporary</option>
              </select>
            </Field>
            <Field label="Catatan (opsional)"><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Alasan redirect" /></Field>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={preserveQuery} onChange={(e) => setPreserveQuery(e.target.checked)} />
              Pertahankan query string (?utm=...)
            </label>
            <button onClick={add} disabled={saving || !source || !destination} className={btnPrimary + " w-full justify-center"}>
              <Plus className="h-4 w-4" /> {saving ? "Menyimpan..." : "Tambah"}
            </button>
          </div>
          <div className="mt-4 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            Tips: gunakan path relatif diawali <code>/</code> untuk redirect internal.
            Loop otomatis dicegah. Source case-insensitive dan unik.
          </div>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={inputCls + " !py-1.5"}
              placeholder="Cari source, destination, catatan..."
            />
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} / {rows.length}</span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Hits</th>
                <th className="px-4 py-3">Aktif</th>
                <th className="px-4 py-3">Diperbarui</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Memuat...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Belum ada redirect.</td></tr>}
              {filtered.map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <tr key={r.id} className={isEditing ? "bg-muted/30" : ""}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {isEditing ? (
                        <input value={(editDraft.source ?? r.source) as string} onChange={(e) => setEditDraft((d) => ({ ...d, source: e.target.value }))} className={inputCls + " !py-1 !text-xs"} />
                      ) : (
                        <span className="text-secondary">{r.source}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {isEditing ? (
                        <input value={(editDraft.destination ?? r.destination) as string} onChange={(e) => setEditDraft((d) => ({ ...d, destination: e.target.value }))} className={inputCls + " !py-1 !text-xs"} />
                      ) : (
                        <span className="text-muted-foreground">{r.destination}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select value={(editDraft.code ?? r.code) as number} onChange={(e) => setEditDraft((d) => ({ ...d, code: Number(e.target.value) as 301 | 302 }))} className={inputCls + " !py-1 !text-xs"}>
                          <option value={301}>301</option>
                          <option value={302}>302</option>
                        </select>
                      ) : (
                        <span className={"inline-flex rounded px-2 py-0.5 text-xs font-medium " + (r.code === 301 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600")}>{r.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" title={r.last_hit_at ? "Terakhir: " + fmt(r.last_hit_at) : ""}>
                      <span className="font-mono">{r.hits.toLocaleString("id-ID")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center">
                        <input type="checkbox" checked={r.active} onChange={() => toggleActive(r)} />
                      </label>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(r.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(r)} className={btnPrimary + " !py-1 !px-2 text-xs"}><Save className="h-3.5 w-3.5" /></button>
                            <button onClick={cancelEdit} className="inline-flex items-center rounded border border-border px-2 py-1 text-xs"><X className="h-3.5 w-3.5" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(r)} className="inline-flex items-center rounded border border-border px-2 py-1 text-xs hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => remove(r)} className={btnDanger + " !py-1 !px-2 text-xs"}><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
