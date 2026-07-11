import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { ChevronDown, Eye, EyeOff, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/website/homepage")({
  head: () => ({ meta: [{ title: "Homepage — Admin" }] }),
  component: HomepageEditor,
});

const LABELS: Record<string, string> = {
  hero: "Hero", stats: "Statistik", problems: "Masalah", solutions: "Solusi",
  workflow: "Workflow", advantages: "Keunggulan", services: "Layanan", portfolio: "Portfolio",
  pricing: "Harga", comparison: "Perbandingan", faq: "FAQ", blogPreview: "Blog Preview", cta: "CTA",
};

function HomepageEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);

  const { data: sections = [] } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => (await supabase.from("homepage_sections").select("*").order("sort_order")).data ?? [],
  });

  async function toggleVisible(id: string, cur: boolean) {
    await supabase.from("homepage_sections").update({ is_visible: !cur }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["homepage-sections"] });
  }

  return (
    <div>
      <PageHeader title="Homepage" description="Kelola setiap section homepage." />
      <Card className="!p-0 overflow-hidden">
        <ul className="divide-y divide-border">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => setOpen(open === s.id ? null : s.id)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-accent"
              >
                <span className="w-6 text-xs text-muted-foreground">{s.sort_order}</span>
                <span className="flex-1 font-medium text-secondary">{LABELS[s.section_key] ?? s.section_key}</span>
                {s.title && <span className="hidden text-xs text-muted-foreground md:inline">{s.title}</span>}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleVisible(s.id, s.is_visible); }}
                  className={`rounded-md p-1 ${s.is_visible ? "text-primary" : "text-muted-foreground"}`}
                  aria-label="Toggle visibility"
                >
                  {s.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <ChevronDown className={`h-4 w-4 transition-transform ${open === s.id ? "rotate-180" : ""}`} />
              </button>
              {open === s.id && (
                <SectionEditor id={s.id} title={s.title ?? ""} data={s.data} onSaved={() => qc.invalidateQueries({ queryKey: ["homepage-sections"] })} />
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SectionEditor({ id, title, data, onSaved }: { id: string; title: string; data: unknown; onSaved: () => void }) {
  const [t, setT] = useState(title);
  const [json, setJson] = useState(JSON.stringify(data ?? {}, null, 2));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const parsed = JSON.parse(json);
      const { error } = await supabase.from("homepage_sections").update({ title: t || null, data: parsed }).eq("id", id);
      if (error) throw error;
      await logActivity("update_homepage_section", "homepage_sections", id);
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally { setSaving(false); }
  }

  return (
    <div className="border-t border-border bg-muted/30 p-5">
      <div className="grid gap-3">
        <Field label="Judul Section (opsional)">
          <input value={t} onChange={(e) => setT(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Data (JSON)" hint="Struktur bebas per section, akan dibaca oleh frontend.">
          <textarea value={json} onChange={(e) => setJson(e.target.value)} rows={10} className={`${inputCls} font-mono text-xs`} />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div><button onClick={save} disabled={saving} className={btnPrimary}><Save className="h-4 w-4" /> Simpan</button></div>
      </div>
    </div>
  );
}
