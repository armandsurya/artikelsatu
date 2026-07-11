import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/ui";
import { Accordion, Switch, SaveStatus } from "@/components/admin/homepage/primitives";
import {
  HeroForm, StatsForm, ProblemsForm, SolutionsForm, WorkflowForm, AdvantagesForm,
  ServicesForm, PortfolioForm, PricingForm, ComparisonForm, FAQForm, BlogPreviewForm, CTAForm,
} from "@/components/admin/homepage/forms";
import { logActivity } from "@/lib/admin/log";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/website/homepage")({
  head: () => ({ meta: [{ title: "Homepage — Admin" }] }),
  component: HomepageEditor,
});

const LABELS: Record<string, string> = {
  hero: "Hero", stats: "Statistik", problems: "Masalah", solutions: "Solusi",
  workflow: "Workflow", advantages: "Keunggulan", services: "Layanan", portfolio: "Portfolio",
  pricing: "Pricing", comparison: "Comparison", faq: "FAQ", blogPreview: "Blog Preview", cta: "CTA",
};

const DEFAULTS: Record<string, unknown> = {
  hero: {
    badge: "", title: "", description: "",
    primaryButtonText: "", primaryButtonLink: "",
    secondaryButtonText: "", secondaryButtonTarget: "#pricing",
    image: "", imageAlt: "", imageWidth: 1024, imageHeight: 1024,
  },
  stats: { items: [] },
  problems: { items: [] },
  solutions: { items: [] },
  workflow: { items: [] },
  advantages: { items: [] },
  services: { items: [] },
  portfolio: { items: [] },
  pricing: { items: [] },
  comparison: { rows: [] },
  faq: { items: [] },
  blogPreview: { sectionTitle: "Artikel Terbaru", count: "3", category: "auto" },
  cta: { title: "", subtitle: "", buttonLabel: "", buttonUrl: "", backgroundImage: "" },
};

type SectionRow = {
  id: string; section_key: string; title: string | null; sort_order: number;
  is_visible: boolean; data: Record<string, unknown> | null; updated_at: string;
};

function HomepageEditor() {
  const qc = useQueryClient();
  const { data: sections = [], isLoading } = useQuery<SectionRow[]>({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections").select("*").order("sort_order");
      return (data as SectionRow[]) ?? [];
    },
  });

  return (
    <div>
      <PageHeader
        title="Homepage"
        description="Kelola setiap section homepage melalui form. Perubahan otomatis tersimpan."
        actions={
          <>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-secondary hover:bg-accent"
            >
              <ExternalLink className="h-4 w-4" /> Preview Homepage
            </a>
          </>
        }
      />

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <Accordion
          items={sections.map((s) => ({
            key: s.id,
            title: LABELS[s.section_key] ?? s.section_key,
            subtitle: `Urutan #${s.sort_order} • Diperbarui ${new Date(s.updated_at).toLocaleString("id-ID")}`,
            right: (
              <button
                type="button"
                onClick={async () => {
                  await supabase.from("homepage_sections").update({ is_visible: !s.is_visible }).eq("id", s.id);
                  qc.invalidateQueries({ queryKey: ["homepage-sections"] });
                }}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${s.is_visible ? "text-primary" : "text-muted-foreground"} hover:bg-accent`}
                title={s.is_visible ? "Tampil" : "Disembunyikan"}
              >
                {s.is_visible ? <><Eye className="h-3.5 w-3.5" /> Tampil</> : <><EyeOff className="h-3.5 w-3.5" /> Draft</>}
              </button>
            ),
            content: <SectionPane row={s} onSaved={() => qc.invalidateQueries({ queryKey: ["homepage-sections"] })} />,
          }))}
        />
      )}
    </div>
  );
}

function SectionPane({ row, onSaved }: { row: SectionRow; onSaved: () => void }) {
  const initial = { ...(DEFAULTS[row.section_key] as object ?? {}), ...(row.data ?? {}) };
  const [state, setState] = useState<Record<string, unknown>>(initial);
  const [title, setTitle] = useState(row.title ?? "");
  const [sortOrder, setSortOrder] = useState(row.sort_order);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string>(row.updated_at);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const save = useCallback(async (opts?: { publish?: boolean }) => {
    setSaveState("saving");
    const payload: Record<string, unknown> = {
      title: title || null,
      sort_order: sortOrder,
      data: state as never,
    };
    if (opts?.publish) payload.is_visible = true;
    const { error } = await supabase.from("homepage_sections").update(payload as never).eq("id", row.id);
    if (error) { setSaveState("error"); return; }
    setSaveState("saved");
    setSavedAt(new Date().toISOString());
    await logActivity(opts?.publish ? "publish_section" : "autosave_section", "homepage_sections", row.id, { section: row.section_key });
    onSaved();
  }, [row.id, row.section_key, state, title, sortOrder, onSaved]);

  // Autosave debounced
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { save(); }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state, title, sortOrder, save]);

  function renderForm() {
    switch (row.section_key) {
      case "hero": return <HeroForm value={state as never} onChange={setState as never} />;
      case "stats": return <StatsForm value={state as never} onChange={setState as never} />;
      case "problems": return <ProblemsForm value={state as never} onChange={setState as never} />;
      case "solutions": return <SolutionsForm value={state as never} onChange={setState as never} />;
      case "workflow": return <WorkflowForm value={state as never} onChange={setState as never} />;
      case "advantages": return <AdvantagesForm value={state as never} onChange={setState as never} />;
      case "services": return <ServicesForm value={state as never} onChange={setState as never} />;
      case "portfolio": return <PortfolioForm value={state as never} onChange={setState as never} />;
      case "pricing": return <PricingForm value={state as never} onChange={setState as never} />;
      case "comparison": return <ComparisonForm value={state as never} onChange={setState as never} />;
      case "faq": return <FAQForm value={state as never} onChange={setState as never} />;
      case "blogPreview": return <BlogPreviewForm value={state as never} onChange={setState as never} />;
      case "cta": return <CTAForm value={state as never} onChange={setState as never} />;
      default: return <p className="text-sm text-muted-foreground">Section belum didukung.</p>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Section-level meta */}
      <div className="grid gap-6 rounded-lg border border-border bg-background p-4 md:grid-cols-[1fr_auto_auto_auto]">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-secondary">Judul Section (opsional)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <label className="block md:w-28">
          <span className="mb-1.5 block text-sm font-medium text-secondary">Urutan</span>
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </label>
        <div className="flex flex-col justify-end">
          <span className="mb-1.5 block text-sm font-medium text-secondary">Visibility</span>
          <Switch checked={row.is_visible} onChange={async (v) => { await supabase.from("homepage_sections").update({ is_visible: v }).eq("id", row.id); onSaved(); }} label={row.is_visible ? "Tampil" : "Disembunyikan"} />
        </div>
        <div className="flex items-end justify-end gap-2">
          <SaveStatus state={saveState} savedAt={savedAt} />
        </div>
      </div>

      {/* Form */}
      {renderForm()}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <SaveStatus state={saveState} savedAt={savedAt} />
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-secondary hover:bg-accent">
            <Eye className="h-4 w-4" /> Preview
          </a>
          <button
            type="button"
            onClick={() => save({ publish: true })}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
