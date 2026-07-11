import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/admin/log";
import { Card } from "@/components/admin/ui";
import { Field, TextField, NumberField, Switch, SaveStatus } from "./primitives";
import { DEFAULTS, SECTION_META, type SectionKey } from "@/data/homepageDefaults";

export function SectionEditor<T>({
  sectionKey,
  render,
  previewHash,
}: {
  sectionKey: SectionKey;
  render: (value: T, onChange: (v: T) => void) => React.ReactNode;
  previewHash?: string;
}) {
  const meta = SECTION_META[sectionKey];
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [title, setTitle] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(meta.sortOrder);
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string>();
  const debounceRef = useRef<number | null>(null);
  const skipNext = useRef(true);

  /* Load or seed */
  useEffect(() => {
    (async () => {
      const { data: existing } = await supabase
        .from("homepage_sections").select("*").eq("section_key", sectionKey).maybeSingle();
      const defaults = DEFAULTS[sectionKey] as T;
      if (!existing) {
        await supabase.from("homepage_sections").insert({
          section_key: sectionKey, title: meta.title,
          data: defaults as never, is_visible: true, sort_order: meta.sortOrder,
        });
        setData(defaults);
        setTitle(meta.title);
        setSortOrder(meta.sortOrder);
        setVisible(true);
      } else {
        const hasData = existing.data && typeof existing.data === "object" && Object.keys(existing.data as object).length > 0;
        setData((hasData ? existing.data : defaults) as T);
        setTitle(existing.title ?? meta.title);
        setSortOrder(existing.sort_order ?? meta.sortOrder);
        setVisible(existing.is_visible ?? true);
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  /* Auto-save on changes */
  useEffect(() => {
    if (!loaded || data === null) return;
    if (skipNext.current) { skipNext.current = false; return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setState("saving");
    debounceRef.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("homepage_sections")
        .update({ title, data: data as never, is_visible: visible, sort_order: sortOrder })
        .eq("section_key", sectionKey);
      if (error) {
        setState("error");
      } else {
        setState("saved");
        setSavedAt(new Date().toLocaleTimeString("id-ID"));
        await logActivity("edit_homepage_section", "homepage_sections", sectionKey);
      }
    }, 900);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [data, title, visible, sortOrder, sectionKey, loaded]);

  if (!loaded || data === null) {
    return <div className="text-sm text-muted-foreground">Memuat data section…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/website/homepage" className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Homepage
          </Link>
          <h1 className="text-2xl font-bold text-secondary">Section: {meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <SaveStatus state={state} savedAt={savedAt} />
          <a
            href={previewHash ? `/${previewHash}` : "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" /> Lihat di frontend
          </a>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="Judul Section (opsional)" value={title} onChange={setTitle} max={120} />
          <NumberField label="Urutan Tampil" value={sortOrder} onChange={setSortOrder} />
          <Field label="Visibility">
            <Switch checked={visible} onChange={setVisible} label={visible ? "Tampil di homepage" : "Disembunyikan"} />
          </Field>
        </div>
      </Card>

      <Card>
        {render(data, setData)}
      </Card>
    </div>
  );
}
