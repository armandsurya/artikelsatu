import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan — Admin" }] }),
  component: Pengaturan,
});

type S = {
  siteName?: string; logo?: string; favicon?: string;
  whatsapp?: string; email?: string; address?: string;
  seoTitle?: string; seoDescription?: string;
  analyticsId?: string; searchConsoleId?: string;
  social?: { label: string; url: string }[];
};

function Pengaturan() {
  const qc = useQueryClient();
  const [s, setS] = useState<S>({ social: [] });
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("data").eq("id", 1).single()).data,
  });
  useEffect(() => { if (data?.data) setS(data.data as S); }, [data]);

  async function save() {
    setSaving(true);
    await supabase.from("site_settings").update({ data: s as never }).eq("id", 1);
    await logActivity("update_settings", "site_settings");
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  const bind = <K extends keyof S>(k: K) => ({
    value: (s[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value }),
  });

  const social = s.social ?? [];
  function updateSocial(i: number, key: "label" | "url", v: string) {
    const next = [...social]; next[i] = { ...next[i], [key]: v }; setS({ ...s, social: next });
  }

  return (
    <div>
      <PageHeader title="Pengaturan Umum" actions={<button onClick={save} disabled={saving} className={btnPrimary}><Save className="h-4 w-4" /> Simpan</button>} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Identitas</h3>
          <div className="space-y-3">
            <Field label="Nama Website"><input {...bind("siteName")} className={inputCls} /></Field>
            <Field label="Logo (URL)"><input {...bind("logo")} className={inputCls} /></Field>
            <Field label="Favicon (URL)"><input {...bind("favicon")} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Kontak</h3>
          <div className="space-y-3">
            <Field label="Nomor WhatsApp"><input {...bind("whatsapp")} className={inputCls} placeholder="628..." /></Field>
            <Field label="Email"><input {...bind("email")} className={inputCls} /></Field>
            <Field label="Alamat"><textarea {...bind("address")} rows={2} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Default SEO</h3>
          <div className="space-y-3">
            <Field label="Meta Title"><input {...bind("seoTitle")} className={inputCls} /></Field>
            <Field label="Meta Description"><textarea {...bind("seoDescription")} rows={3} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Analytics</h3>
          <div className="space-y-3">
            <Field label="Google Analytics ID"><input {...bind("analyticsId")} className={inputCls} placeholder="G-XXXXXXXX" /></Field>
            <Field label="Search Console ID"><input {...bind("searchConsoleId")} className={inputCls} placeholder="verification code" /></Field>
          </div>
        </Card>
        <Card className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary">Social Media</h3>
            <button onClick={() => setS({ ...s, social: [...social, { label: "", url: "" }] })} className="text-sm text-primary hover:underline">+ Tambah</button>
          </div>
          <div className="space-y-2">
            {social.map((sm, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="Label" value={sm.label} onChange={(e) => updateSocial(i, "label", e.target.value)} className={inputCls} />
                <input placeholder="URL" value={sm.url} onChange={(e) => updateSocial(i, "url", e.target.value)} className={inputCls} />
                <button onClick={() => setS({ ...s, social: social.filter((_, idx) => idx !== i) })} className="rounded-md border border-border px-2 text-sm text-muted-foreground hover:bg-accent">Hapus</button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
