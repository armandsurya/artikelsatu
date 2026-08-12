import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/admin/ui";
import { MediaPicker } from "@/components/admin/homepage/primitives";
import { trackMediaUsage, clearMediaUsage } from "@/lib/media/usage";
import { logActivity } from "@/lib/admin/log";
import { PUBLISHED_QUERY_KEY } from "@/lib/publishedContent";
import { VALIDATORS, type SeoConfig } from "@/lib/seo/config";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => ({ meta: [{ title: "SEO — Admin" }] }),
  component: SEO,
});

type Tab = "general" | "og" | "twitter" | "analytics" | "verification" | "schema" | "robots";
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "og", label: "Open Graph" },
  { id: "twitter", label: "Twitter Card" },
  { id: "analytics", label: "Analytics" },
  { id: "verification", label: "Verification" },
  { id: "schema", label: "Schema" },
  { id: "robots", label: "Robots" },
];

const DEFAULT_ROBOTS = `User-agent: *\nAllow: /\n`;

function validate(d: SeoConfig): string | null {
  if (d.ga4Id && !VALIDATORS.ga4(d.ga4Id)) return "Google Analytics ID harus format G-XXXXXXXX.";
  if (d.gtmId && !VALIDATORS.gtm(d.gtmId)) return "Google Tag Manager ID harus format GTM-XXXXXXX.";
  if (d.clarityId && !VALIDATORS.clarity(d.clarityId))
    return "Microsoft Clarity ID harus alfanumerik 5-20 karakter.";
  if (d.metaPixelId && !VALIDATORS.metaPixel(d.metaPixelId))
    return "Meta Pixel ID harus angka (8-20 digit).";
  if (d.schema && d.schema.trim()) {
    try {
      JSON.parse(d.schema);
    } catch {
      return "Schema JSON-LD tidak valid (JSON parse error).";
    }
  }
  if (d.canonicalBase && !/^https?:\/\//i.test(d.canonicalBase))
    return "Canonical Base URL harus dimulai dengan http(s)://";
  return null;
}

function SEO() {
  const qc = useQueryClient();
  const [d, setD] = useState<SeoConfig>({});
  const [tab, setTab] = useState<Tab>("general");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const snapshotRef = useRef<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["seo-settings-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data?.data ?? {}) as Record<string, unknown>;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    const seo = (data.seo as SeoConfig | undefined) ?? {};
    setD(seo);
    snapshotRef.current = JSON.stringify(seo);
  }, [data]);

  const dirty = useMemo(() => JSON.stringify(d) !== snapshotRef.current, [d]);

  async function save() {
    const err = validate(d);
    if (err) {
      toast.error("Validasi gagal", { description: err });
      return;
    }

    setStatus("saving");
    try {
      const { data: row, error: readErr } = await supabase
        .from("site_settings")
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      if (readErr) throw readErr;
      const current = (row?.data as Record<string, unknown>) ?? {};
      const merged = { ...current, seo: d };
      const { error } = await supabase
        .from("site_settings")
        .update({ data: merged as never })
        .eq("id", 1);
      if (error) throw error;

      // Sync media usage
      const fields: Array<[keyof SeoConfig, string]> = [
        ["favicon", "favicon"],
        ["ogImage", "og_image"],
        ["twitterImage", "twitter_image"],
        ["schemaImage", "schema_image"],
        ["organizationLogo", "organization_logo"],
      ];
      for (const [key, field] of fields) {
        const url = (d[key] as string | undefined) ?? "";
        if (url) await trackMediaUsage(url, "seo", "global", field);
        else await clearMediaUsage("seo", "global", field);
      }
      await logActivity("update_seo", "site_settings");

      snapshotRef.current = JSON.stringify(d);
      setStatus("success");
      toast.success("SEO tersimpan", { description: "Perubahan aktif di seluruh website." });

      qc.invalidateQueries({ queryKey: ["seo-settings-full"] });
      qc.invalidateQueries({ queryKey: ["seo-settings"] });
      qc.invalidateQueries({ queryKey: [...PUBLISHED_QUERY_KEY, "site_settings"] });

      setTimeout(() => setStatus((c) => (c === "success" ? "idle" : c)), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const hint = /permission|policy|rls/i.test(msg)
        ? "Tidak memiliki akses (super_admin) atau session kadaluarsa. Login ulang."
        : /network|fetch/i.test(msg)
          ? "Koneksi gagal. Coba lagi."
          : msg;
      setStatus("error");
      toast.error("Gagal menyimpan SEO", { description: hint });
    }
  }

  const bindText = <K extends keyof SeoConfig>(k: K) => ({
    value: (d[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setD({ ...d, [k]: e.target.value }),
  });
  const setImg =
    <K extends keyof SeoConfig>(k: K) =>
    (v: string) =>
      setD({ ...d, [k]: v });

  const btnLabel =
    status === "saving"
      ? "Menyimpan…"
      : status === "success"
        ? "Tersimpan"
        : status === "error"
          ? "Coba Lagi"
          : "Simpan";
  const btnIcon =
    status === "saving" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : status === "success" ? (
      <CheckCircle2 className="h-4 w-4" />
    ) : status === "error" ? (
      <AlertCircle className="h-4 w-4" />
    ) : (
      <Save className="h-4 w-4" />
    );

  return (
    <div>
      <PageHeader
        title="SEO"
        description="Konfigurasi SEO global, meta tag, analytics, verifikasi, schema, robots, dan sitemap."
        actions={
          <div className="flex items-center gap-3">
            {dirty && status === "idle" && (
              <span className="text-xs text-amber-600">Ada perubahan belum disimpan</span>
            )}
            <button
              onClick={save}
              disabled={status === "saving" || isLoading || !dirty}
              className={btnPrimary}
            >
              {btnIcon} {btnLabel}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-secondary"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Homepage</h3>
            <div className="space-y-3">
              <Field label="Meta Title" hint="Tampil di tab browser & hasil pencarian.">
                <input {...bindText("homepageTitle")} className={inputCls} maxLength={70} />
              </Field>
              <Field label="Meta Description" hint="≤ 160 karakter untuk hasil pencarian optimal.">
                <textarea
                  {...bindText("homepageDescription")}
                  rows={3}
                  className={inputCls}
                  maxLength={200}
                />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Blog</h3>
            <div className="space-y-3">
              <Field label="Meta Title (Blog Archive)">
                <input {...bindText("blogTitle")} className={inputCls} maxLength={70} />
              </Field>
              <Field label="Meta Description (Blog Archive)">
                <textarea
                  {...bindText("blogDescription")}
                  rows={3}
                  className={inputCls}
                  maxLength={200}
                />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Default Meta</h3>
            <div className="space-y-3">
              <Field label="Keywords (pisahkan koma)">
                <input
                  {...bindText("defaultKeywords")}
                  className={inputCls}
                  placeholder="jasa artikel seo, penulis konten"
                />
              </Field>
              <Field label="Robots Meta" hint="Contoh: index,follow atau noindex,nofollow.">
                <input {...bindText("robots")} className={inputCls} placeholder="index,follow" />
              </Field>
              <Field label="Canonical Base URL" hint="Domain absolut, contoh https://artikelpro.id">
                <input
                  {...bindText("canonicalBase")}
                  className={inputCls}
                  placeholder="https://…"
                />
              </Field>
              <MediaPicker label="Favicon" value={d.favicon ?? ""} onChange={setImg("favicon")} />
            </div>
          </Card>
        </div>
      )}

      {tab === "og" && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">
            Open Graph (Facebook, WhatsApp, LinkedIn)
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="OG Title (default)">
              <input
                {...bindText("ogTitle")}
                className={inputCls}
                placeholder="Kosongkan untuk pakai Meta Title"
              />
            </Field>
            <Field label="OG Type" hint="Umum: website, article, product.">
              <input {...bindText("ogType")} className={inputCls} placeholder="website" />
            </Field>
            <Field label="OG Description (default)">
              <textarea {...bindText("ogDescription")} rows={2} className={inputCls} />
            </Field>
            <Field label="OG Locale" hint="Contoh: id_ID, en_US">
              <input {...bindText("ogLocale")} className={inputCls} placeholder="id_ID" />
            </Field>
            <Field label="OG Site Name">
              <input {...bindText("ogSiteName")} className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <MediaPicker
                label="OG Image (default, 1200×630 direkomendasikan)"
                value={d.ogImage ?? ""}
                onChange={setImg("ogImage")}
              />
            </div>
          </div>
        </Card>
      )}

      {tab === "twitter" && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Twitter / X Card</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Card Type">
              <select {...bindText("twitterCard")} className={inputCls}>
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
                <option value="app">app</option>
                <option value="player">player</option>
              </select>
            </Field>
            <Field label="Twitter @site" hint="Handle akun brand, contoh @artikelpro">
              <input {...bindText("twitterSite")} className={inputCls} placeholder="@artikelpro" />
            </Field>
            <Field label="Twitter @creator">
              <input {...bindText("twitterCreator")} className={inputCls} placeholder="@armand" />
            </Field>
            <div className="md:col-span-2">
              <MediaPicker
                label="Twitter Image (default)"
                value={d.twitterImage ?? ""}
                onChange={setImg("twitterImage")}
              />
            </div>
          </div>
        </Card>
      )}

      {tab === "analytics" && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Google</h3>
            <div className="space-y-3">
              <Field label="Google Analytics 4 (GA4) ID" hint="Format: G-XXXXXXXX">
                <input {...bindText("ga4Id")} className={inputCls} placeholder="G-ABCD1234EF" />
              </Field>
              <Field label="Google Tag Manager ID" hint="Format: GTM-XXXXXXX">
                <input {...bindText("gtmId")} className={inputCls} placeholder="GTM-XXXXXX" />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Microsoft</h3>
            <div className="space-y-3">
              <Field label="Microsoft Clarity ID">
                <input {...bindText("clarityId")} className={inputCls} placeholder="abcd1234ef" />
              </Field>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Meta / Facebook</h3>
            <div className="space-y-3">
              <Field label="Meta Pixel ID" hint="Angka 8-20 digit.">
                <input
                  {...bindText("metaPixelId")}
                  className={inputCls}
                  placeholder="123456789012345"
                />
              </Field>
            </div>
          </Card>
          <Card className="md:col-span-2 border-dashed bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Skrip analytics hanya dimuat jika ID valid. Kosongkan untuk menonaktifkan. Semua skrip
              dimuat setelah render halaman (non-blocking).
            </p>
          </Card>
        </div>
      )}

      {tab === "verification" && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Search Engine Verification</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Google Search Console" hint="Isi konten tag verification (bukan URL).">
              <input {...bindText("googleVerification")} className={inputCls} />
            </Field>
            <Field label="Bing Webmaster (msvalidate.01)">
              <input {...bindText("bingVerification")} className={inputCls} />
            </Field>
            <Field label="Yandex Webmaster">
              <input {...bindText("yandexVerification")} className={inputCls} />
            </Field>
            <Field label="Facebook Domain Verification">
              <input {...bindText("facebookVerification")} className={inputCls} />
            </Field>
            <Field label="Pinterest Verification">
              <input {...bindText("pinterestVerification")} className={inputCls} />
            </Field>
          </div>
        </Card>
      )}

      {tab === "schema" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Organization Schema</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Organization Name">
                <input {...bindText("organizationName")} className={inputCls} />
              </Field>
              <Field label="Organization URL">
                <input
                  {...bindText("organizationUrl")}
                  className={inputCls}
                  placeholder="https://…"
                />
              </Field>
              <div className="md:col-span-2">
                <MediaPicker
                  label="Organization Logo"
                  value={d.organizationLogo ?? ""}
                  onChange={setImg("organizationLogo")}
                />
              </div>
              <div className="md:col-span-2">
                <MediaPicker
                  label="Schema Image (default)"
                  value={d.schemaImage ?? ""}
                  onChange={setImg("schemaImage")}
                />
              </div>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Custom JSON-LD</h3>
            <Field
              label="Kode JSON-LD (override)"
              hint="Jika diisi, akan menggantikan schema Organization default. Wajib JSON valid."
            >
              <textarea
                {...bindText("schema")}
                rows={12}
                className={`${inputCls} font-mono text-xs`}
                placeholder='{"@context":"https://schema.org", …}'
              />
            </Field>
          </Card>
        </div>
      )}

      {tab === "robots" && (
        <div className="grid gap-6">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">robots.txt</h3>
            <Field label="Isi robots.txt" hint="Kosongkan untuk memakai default 'Allow: /'.">
              <textarea
                {...bindText("robotsTxt")}
                rows={10}
                className={`${inputCls} font-mono text-xs`}
                placeholder={DEFAULT_ROBOTS}
              />
            </Field>
          </Card>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-secondary">Sitemap</h3>
            <Field label="Sitemap URL" hint="Diumumkan di robots.txt. Default: /sitemap.xml">
              <input {...bindText("sitemapUrl")} className={inputCls} placeholder="/sitemap.xml" />
            </Field>
          </Card>
        </div>
      )}
    </div>
  );
}
