import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PageHeader, Card } from "@/components/admin/ui";
import { TextField, TextareaField, Repeater, SaveStatus, inputCls } from "@/components/admin/homepage/primitives";
import { settings } from "@/data/settings";
import { footer } from "@/data/footer";
import { logActivity } from "@/lib/admin/log";
import { loadSiteSettings, patchSiteSettings } from "@/lib/admin/siteSettings";

type FooterData = {
  description: string;
  copyright: string;
  contact: { whatsapp: string; email: string; address: string };
  social: { label: string; url: string }[];
  columns: { title: string; links: { label: string; href: string }[] }[];
};

const DEFAULT_FOOTER: FooterData = {
  description: footer.description,
  copyright: settings.copyright,
  contact: { whatsapp: settings.whatsapp, email: settings.email, address: settings.address },
  social: settings.social,
  columns: footer.columns,
};

export const Route = createFileRoute("/_authenticated/admin/website/footer")({
  head: () => ({ meta: [{ title: "Footer — Admin" }] }),
  component: FooterEditor,
});

function FooterEditor() {
  const [data, setData] = useState<FooterData | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string>();
  const debounce = useRef<number | null>(null);
  const skip = useRef(true);

  useEffect(() => {
    (async () => {
      const all = await loadSiteSettings<{ footer?: Partial<FooterData> }>();
      const v = all.footer;
      if (!v) {
        await patchSiteSettings({ footer: DEFAULT_FOOTER });
        setData(DEFAULT_FOOTER);
      } else {
        setData({
          ...DEFAULT_FOOTER, ...v,
          contact: { ...DEFAULT_FOOTER.contact, ...(v?.contact ?? {}) },
          social: v?.social?.length ? v.social : DEFAULT_FOOTER.social,
          columns: v?.columns?.length ? v.columns : DEFAULT_FOOTER.columns,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!data) return;
    if (skip.current) { skip.current = false; return; }
    if (debounce.current) window.clearTimeout(debounce.current);
    setState("saving");
    debounce.current = window.setTimeout(async () => {
      const { error } = await patchSiteSettings({ footer: data });
      if (error) setState("error");
      else {
        setState("saved");
        setSavedAt(new Date().toLocaleTimeString("id-ID"));
        await logActivity("edit_footer", "site_settings", "footer");
      }
    }, 900);
  }, [data]);

  if (!data) return <div className="text-sm text-muted-foreground">Memuat…</div>;
  const set = <K extends keyof FooterData>(k: K, v: FooterData[K]) => setData({ ...data, [k]: v });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Footer"
        description="Kelola deskripsi, kontak, sosial media, dan kolom link footer."
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
        <h3 className="mb-4 text-sm font-semibold text-secondary">Umum</h3>
        <div className="grid gap-4">
          <TextareaField label="Deskripsi Perusahaan" value={data.description} onChange={(v) => set("description", v)} rows={3} max={280} />
          <TextField label="Copyright" value={data.copyright} onChange={(v) => set("copyright", v)} max={160} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Kontak</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="WhatsApp (angka saja)" value={data.contact.whatsapp}
            onChange={(v) => set("contact", { ...data.contact, whatsapp: v })} placeholder="628123456789" />
          <TextField label="Email" value={data.contact.email}
            onChange={(v) => set("contact", { ...data.contact, email: v })} />
          <TextField label="Alamat" value={data.contact.address}
            onChange={(v) => set("contact", { ...data.contact, address: v })} />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Sosial Media</h3>
        <Repeater
          items={data.social}
          onChange={(social) => set("social", social)}
          addLabel="Tambah Sosial Media"
          itemTitle={(it, i) => it.label || `Sosial #${i + 1}`}
          newItem={() => ({ label: "", url: "" })}
          renderItem={(it, up) => (
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Label" value={it.label} onChange={(label) => up({ label })} />
              <TextField label="URL" value={it.url} onChange={(url) => up({ url })} />
            </div>
          )}
        />
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-secondary">Kolom Link</h3>
        <Repeater
          items={data.columns}
          onChange={(columns) => set("columns", columns)}
          addLabel="Tambah Kolom"
          itemTitle={(it, i) => it.title || `Kolom #${i + 1}`}
          newItem={() => ({ title: "", links: [] })}
          renderItem={(col, upCol) => (
            <div className="grid gap-4">
              <TextField label="Judul Kolom" value={col.title} onChange={(title) => upCol({ title })} max={40} />
              <div>
                <div className="mb-2 text-sm font-medium text-secondary">Link</div>
                <div className="space-y-2">
                  {col.links.map((l, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <input value={l.label} placeholder="Label" className={inputCls}
                        onChange={(e) => upCol({ links: col.links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                      <input value={l.href} placeholder="URL" className={inputCls}
                        onChange={(e) => upCol({ links: col.links.map((x, j) => j === i ? { ...x, href: e.target.value } : x) })} />
                      <button type="button" onClick={() => upCol({ links: col.links.filter((_, j) => j !== i) })}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Hapus</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => upCol({ links: [...col.links, { label: "", href: "" }] })}
                    className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent">+ Tambah Link</button>
                </div>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
