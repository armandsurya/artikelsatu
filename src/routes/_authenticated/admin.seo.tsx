import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => ({ meta: [{ title: "SEO — Admin" }] }),
  component: SEO,
});

type SeoData = {
  homepageTitle?: string; homepageDescription?: string;
  blogTitle?: string; blogDescription?: string;
  robots?: string; sitemapUrl?: string; favicon?: string;
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
    const current = (data?.data as Record<string, unknown>) ?? {};
    await supabase.from("site_settings").update({ data: { ...current, seo: d } as never }).eq("id", 1);
    await logActivity("update_seo", "site_settings");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["seo-settings"] });
  }

  const bind = <K extends keyof SeoData>(k: K) => ({
    value: (d[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value }),
  });

  return (
    <div>
      <PageHeader title="SEO" description="Pengaturan SEO global, robots, sitemap, dan schema." actions={
        <button onClick={save} disabled={saving} className={btnPrimary}><Save className="h-4 w-4" /> Simpan</button>
      } />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Homepage SEO</h3>
          <div className="space-y-3">
            <Field label="Meta Title"><input {...bind("homepageTitle")} className={inputCls} /></Field>
            <Field label="Meta Description"><textarea {...bind("homepageDescription")} rows={3} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Blog SEO</h3>
          <div className="space-y-3">
            <Field label="Meta Title"><input {...bind("blogTitle")} className={inputCls} /></Field>
            <Field label="Meta Description"><textarea {...bind("blogDescription")} rows={3} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Robots & Sitemap</h3>
          <div className="space-y-3">
            <Field label="robots.txt"><textarea {...bind("robots")} rows={5} className={`${inputCls} font-mono text-xs`} /></Field>
            <Field label="Sitemap URL"><input {...bind("sitemapUrl")} className={inputCls} placeholder="/sitemap.xml" /></Field>
            <Field label="Favicon URL"><input {...bind("favicon")} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Schema (JSON-LD)</h3>
          <Field label="Kode JSON-LD"><textarea {...bind("schema")} rows={10} className={`${inputCls} font-mono text-xs`} /></Field>
        </Card>
      </div>
    </div>
  );
}
