import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader, Card, Field, inputCls, btnPrimary } from "@/components/admin/ui";
import { logActivity } from "@/lib/admin/log";
import { loadSiteSettings, patchSiteSettings, invalidateSiteSettings } from "@/lib/admin/siteSettings";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/pengaturan")({
  head: () => ({ meta: [{ title: "Pengaturan Umum — Admin" }] }),
  component: Pengaturan,
});

type Social = { label: string; url: string };
type PengaturanUmum = {
  siteName?: string;
  logo?: string;
  favicon?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  social?: Social[];
};

// Semua field SEO/Analytics dipindah ke menu SEO — tidak lagi diedit dari sini.
const EDITABLE_KEYS = ["siteName", "logo", "favicon", "whatsapp", "email", "address", "social"] as const;

function pickEditable(blob: Record<string, unknown>): PengaturanUmum {
  const out: PengaturanUmum = {};
  for (const k of EDITABLE_KEYS) {
    const v = blob[k];
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function validate(s: PengaturanUmum): string | null {
  if (!s.siteName?.trim()) return "Nama Website wajib diisi.";
  if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return "Format email tidak valid.";
  if (s.whatsapp && !/^\d{8,15}$/.test(s.whatsapp)) return "Nomor WhatsApp harus 8-15 digit angka (tanpa + atau spasi).";
  for (const sm of s.social ?? []) {
    if (sm.url && !/^https?:\/\//i.test(sm.url)) return `URL social "${sm.label || sm.url}" harus dimulai dengan http(s)://`;
  }
  return null;
}

function Pengaturan() {
  const qc = useQueryClient();
  const [s, setS] = useState<PengaturanUmum>({ social: [] });
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const snapshotRef = useRef<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings-full"],
    queryFn: () => loadSiteSettings<Record<string, unknown>>(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    const editable = pickEditable(data);
    if (!editable.social) editable.social = [];
    setS(editable);
    snapshotRef.current = JSON.stringify(editable);
  }, [data]);

  const dirty = useMemo(() => JSON.stringify(s) !== snapshotRef.current, [s]);

  async function save() {
    const err = validate(s);
    if (err) { toast.error("Validasi gagal", { description: err }); return; }

    setStatus("saving");
    const patch: Record<string, unknown> = {};
    for (const k of EDITABLE_KEYS) patch[k] = (s as Record<string, unknown>)[k];

    const { error } = await patchSiteSettings(patch);
    if (error) {
      setStatus("error");
      const msg = error.message;
      const hint = /permission|policy|rls/i.test(msg)
        ? "Akun Anda tidak memiliki akses (super_admin) atau session kadaluarsa. Silakan login ulang."
        : /network|fetch/i.test(msg)
        ? "Koneksi ke database gagal. Periksa jaringan lalu coba lagi."
        : msg;
      toast.error("Gagal menyimpan pengaturan", { description: hint });
      return;
    }

    await logActivity("update_settings", "site_settings");
    snapshotRef.current = JSON.stringify(s);
    setStatus("success");
    toast.success("Pengaturan tersimpan", { description: "Perubahan sudah aktif di seluruh website." });
    invalidateSiteSettings(qc);
    setTimeout(() => setStatus((cur) => (cur === "success" ? "idle" : cur)), 2500);
  }

  const bind = <K extends keyof PengaturanUmum>(k: K) => ({
    value: (s[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setS({ ...s, [k]: e.target.value }),
  });

  const social = s.social ?? [];
  function updateSocial(i: number, key: "label" | "url", v: string) {
    const next = [...social]; next[i] = { ...next[i], [key]: v }; setS({ ...s, social: next });
  }

  const btnLabel =
    status === "saving" ? "Menyimpan…" :
    status === "success" ? "Tersimpan" :
    status === "error" ? "Coba Lagi" : "Simpan";
  const btnIcon =
    status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> :
    status === "success" ? <CheckCircle2 className="h-4 w-4" /> :
    status === "error" ? <AlertCircle className="h-4 w-4" /> :
    <Save className="h-4 w-4" />;

  return (
    <div>
      <PageHeader
        title="Pengaturan Umum"
        description="Konfigurasi identitas website. Data ini menjadi sumber tunggal (single source of truth) untuk seluruh frontend. SEO dan Analytics dipindah ke menu SEO."
        actions={
          <div className="flex items-center gap-3">
            {dirty && status === "idle" && <span className="text-xs text-amber-600">Ada perubahan belum disimpan</span>}
            <button onClick={save} disabled={status === "saving" || isLoading || !dirty} className={btnPrimary}>
              {btnIcon} {btnLabel}
            </button>
          </div>
        }
      />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Identitas Website</h3>
          <div className="space-y-3">
            <Field label="Nama Website" hint="Wajib. Digunakan di header, footer, dan meta.">
              <input {...bind("siteName")} className={inputCls} placeholder="ArtikelPro" />
            </Field>
            <Field label="Logo (teks atau URL)" hint="Ditampilkan di navbar & footer.">
              <input {...bind("logo")} className={inputCls} />
            </Field>
            <Field label="Favicon (URL)"><input {...bind("favicon")} className={inputCls} /></Field>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-secondary">Kontak</h3>
          <div className="space-y-3">
            <Field label="Nomor WhatsApp" hint="Format: 628xxxxxxxxx (tanpa + atau spasi).">
              <input {...bind("whatsapp")} className={inputCls} placeholder="6282214949685" />
            </Field>
            <Field label="Email"><input {...bind("email")} className={inputCls} type="email" /></Field>
            <Field label="Alamat"><textarea {...bind("address")} rows={2} className={inputCls} /></Field>
          </div>
        </Card>
        <Card className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-secondary">Social Media</h3>
            <button
              type="button"
              onClick={() => setS({ ...s, social: [...social, { label: "", url: "" }] })}
              className="text-sm text-primary hover:underline"
            >
              + Tambah
            </button>
          </div>
          <div className="space-y-2">
            {social.length === 0 && <p className="text-sm text-muted-foreground">Belum ada social media. Klik "+ Tambah".</p>}
            {social.map((sm, i) => (
              <div key={i} className="flex gap-2">
                <input placeholder="Label (Instagram, LinkedIn, …)" value={sm.label} onChange={(e) => updateSocial(i, "label", e.target.value)} className={inputCls} />
                <input placeholder="https://…" value={sm.url} onChange={(e) => updateSocial(i, "url", e.target.value)} className={inputCls} />
                <button
                  type="button"
                  onClick={() => setS({ ...s, social: social.filter((_, idx) => idx !== i) })}
                  className="rounded-md border border-border px-3 text-sm text-muted-foreground hover:bg-accent"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="md:col-span-2 border-dashed bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <strong className="text-secondary">Catatan arsitektur:</strong> konfigurasi Meta Title, Meta Description, dan
            Analytics (Google Analytics, Search Console, dsb.) telah dipindah ke menu <strong>SEO</strong>. Data lama Anda
            sudah otomatis dimigrasi — silakan cek menu SEO untuk mengelolanya.
          </p>
        </Card>
      </div>
    </div>
  );
}
