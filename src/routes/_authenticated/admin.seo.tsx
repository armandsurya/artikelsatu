import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/admin/ui";
import { MediaPicker } from "@/components/admin/homepage/primitives";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { logActivity } from "@/lib/admin/log";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => ({ meta: [{ title: "SEO — Admin" }] }),
  component: SEO,
});

type SeoData = {
  homepageTitle?: string; homepageDescription?: string;
  blogTitle?: string; blogDescription?: string;
  robots?: string; sitemapUrl?: string; favicon?: string;
  ogImage?: string; schemaImage?: string;
  schema?: string;
};

function SEO() {
  const qc = useQueryClient();
  const [d, setD] = useState<SeoData>({});
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("data").eq("id", 1).single()).data,
  });

  useEffect(() => {
    if (data?.data) {
      const s = data.data as Record<string, unknown>;
      setD((s.seo as SeoData) ?? {});
    }
  }, [data]);

  async function save() {
    setSaving(true);
    try {
      const current = (data?.data as Record<string, unknown>) ?? {};
      const { error } = await supabase.from("site_settings").update({ data: { ...current, seo: d } as never }).eq("id", 1);
      if (error) { toast.error("Gagal menyimpan SEO", { description: error.message }); return; }
      // Sync usage
      const fields: Array<[keyof SeoData, string]> = [["favicon", "favicon"], ["ogImage", "og_image"], ["schemaImage", "schema_image"]];
      for (const [key, field] of fields) {
        const url = (d[key] as string | undefined) ?? "";
        if (url) await trackMediaUsage(url, "seo", "global", field);
        else await clearMediaUsage("seo", "global", field);
      }
      await logActivity("update_seo", "site_settings");
      toast.success("SEO tersimpan.");
      qc.invalidateQueries({ queryKey: ["seo-settings"] });
    } finally { setSaving(false); }
  }

  const bindText = <K extends keyof SeoData>(k: K) => ({
    value: (d[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value }),
  });
  const setImg = <K extends keyof SeoData>(k: K) => (v: string) => setD({ ...d, [k]: v });

  return (
    <div>
      <PageHeader title="SEO" description="Pengaturan SEO global, robots, sitemap, dan schema. Gambar diambil dari Media Library." actions={
        <button onClick={save} disabled={saving} className={btnPrimary}><Save className="h-4 w-4" /> Simpan</button>
      } />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Homepage SEO</h3>
          <div className="space-y-3">
            <Field label="Meta Title"><input {...bindText("homepageTitle")} className={inputCls} /></Field>
            <Field label="Meta Description"><textarea {...bindText("homepageDescription")} rows={3} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Blog SEO</h3>
          <div className="space-y-3">
            <Field label="Meta Title"><input {...bindText("blogTitle")} className={inputCls} /></Field>
            <Field label="Meta Description"><textarea {...bindText("blogDescription")} rows={3} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Robots & Sitemap</h3>
          <div className="space-y-3">
            <Field label="robots.txt"><textarea {...bindText("robots")} rows={5} className={`${inputCls} font-mono text-xs`} /></Field>
            <Field label="Sitemap URL"><input {...bindText("sitemapUrl")} className={inputCls} placeholder="/sitemap.xml" /></Field>
            <MediaPicker label="Favicon" value={d.favicon ?? ""} onChange={setImg("favicon")} />
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Social & Schema Image</h3>
          <div className="space-y-3">
            <MediaPicker label="OG Image (default)" value={d.ogImage ?? ""} onChange={setImg("ogImage")} />
            <MediaPicker label="Schema Image (default)" value={d.schemaImage ?? ""} onChange={setImg("schemaImage")} />
          </div>
        </Card>
        <Card className="md:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-secondary">Schema (JSON-LD)</h3>
          <Field label="Kode JSON-LD"><textarea {...bindText("schema")} rows={10} className={`${inputCls} font-mono text-xs`} /></Field>
        </Card>
      </div>
    </div>
  );
}
