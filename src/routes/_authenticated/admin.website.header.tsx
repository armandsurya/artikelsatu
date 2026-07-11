import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card } from "@/components/admin/ui";
import { Field, TextField, Repeater, SelectField, SaveStatus } from "@/components/admin/homepage/primitives";
import { settings } from "@/data/settings";
import { mainNav } from "@/data/navigation";
import { logActivity } from "@/lib/admin/log";

type HeaderData = {
  logo: string;
  menu: { label: string; href: string; target: "_self" | "_blank" }[];
  ctaLabel: string;
  ctaUrl: string;
  ctaVisible: boolean;
};

const DEFAULT_HEADER: HeaderData = {
  logo: settings.logo,
  menu: mainNav.map((m) => ({ label: m.label, href: m.href, target: "_self" })),
  ctaLabel: "Konsultasi Gratis",
  ctaUrl: `https://wa.me/${settings.whatsapp}`,
  ctaVisible: true,
};

export const Route = createFileRoute("/_authenticated/admin/website/header")({
  head: () => ({ meta: [{ title: "Header — Admin" }] }),
  component: HeaderEditor,
});

function HeaderEditor() {
  const [data, setData] = useState<HeaderData | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string>();
  const debounce = useRef<number | null>(null);
  const skip = useRef(true);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase.from("site_settings").select("*").eq("key", "header").maybeSingle();
      if (!row) {
        await supabase.from("site_settings").insert({ key: "header", value: DEFAULT_HEADER as never });
        setData(DEFAULT_HEADER);
      } else {
        const v = row.value as unknown as HeaderData;
        setData({ ...DEFAULT_HEADER, ...v, menu: v?.menu?.length ? v.menu : DEFAULT_HEADER.menu });
      }
    })();
  }, []);

  useEffect(() => {
    if (!data) return;
    if (skip.current) { skip.current = false; return; }
    if (debounce.current) window.clearTimeout(debounce.current);
    setState("saving");
    debounce.current = window.setTimeout(async () => {
      const { error } = await supabase.from("site_settings")
        .update({ value: data as never }).eq("key", "header");
      if (error) setState("error");
      else {
        setState("saved");
        setSavedAt(new Date().toLocaleTimeString("id-ID"));
        await logActivity("edit_header", "site_settings", "header");
      }
    }, 900);
  }, [data]);

  if (!data) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  const set = <K extends keyof HeaderData>(k: K, v: HeaderData[K]) => setData({ ...data, [k]: v });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Header"
        description="Kelola logo, menu navigasi, dan tombol CTA header. Data awal diambil dari frontend."
        actions={
          <div className="flex items-center gap-3">
            <SaveStatus state={state} savedAt={savedAt} />
            <a href="/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-secondary hover:bg-accent">
              <ExternalLink className="h-4 w-4" /> Lihat frontend
            </a>
          </div>
        }
      />

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Logo & CTA</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Logo (teks)" value={data.logo} onChange={(v) => set("logo", v)} max={40} />
          <TextField label="CTA Label" value={data.ctaLabel} onChange={(v) => set("ctaLabel", v)} max={40} />
          <TextField label="CTA URL" value={data.ctaUrl} onChange={(v) => set("ctaUrl", v)} placeholder="https://wa.me/…" />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Menu Navigasi</h3>
        <Repeater
          items={data.menu}
          onChange={(menu) => set("menu", menu)}
          addLabel="Tambah Menu"
          itemTitle={(it, i) => it.label || `Menu #${i + 1}`}
          newItem={() => ({ label: "", href: "", target: "_self" as const })}
          renderItem={(it, up) => (
            <div className="grid gap-4 md:grid-cols-3">
              <TextField label="Label" value={it.label} onChange={(label) => up({ label })} max={40} />
              <TextField label="URL / Anchor" value={it.href} onChange={(href) => up({ href })} placeholder="/blog atau /#pricing" />
              <SelectField label="Target" value={it.target} onChange={(target) => up({ target: target as "_self" | "_blank" })}
                options={[{ label: "Sama tab", value: "_self" }, { label: "Tab baru", value: "_blank" }]} />
            </div>
          )}
        />
      </Card>
    </div>
  );
}
