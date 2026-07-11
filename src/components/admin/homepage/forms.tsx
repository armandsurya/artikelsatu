import { MediaPicker, TextField, TextareaField, NumberField, SelectField, Repeater, IconPicker, Field, inputCls, Switch } from "./primitives";

/* ---------------- HERO ---------------- */

export type HeroFormData = {
  badge: string; title: string; description: string;
  primaryButtonText: string; primaryButtonLink: string;
  secondaryButtonText: string; secondaryButtonTarget: string; secondaryButtonCustomUrl?: string;
  image: string; imageAlt: string; imageWidth: number; imageHeight: number;
};

export function HeroForm({ value, onChange }: { value: HeroFormData; onChange: (v: HeroFormData) => void }) {
  const set = <K extends keyof HeroFormData>(k: K, v: HeroFormData[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-6">
      <TextField label="Badge" value={value.badge ?? ""} onChange={(v) => set("badge", v)} max={60} placeholder="Contoh: Jasa Artikel SEO Berkualitas" />
      <TextField label="Headline" required value={value.title ?? ""} onChange={(v) => set("title", v)} max={120} />
      <TextareaField label="Subheadline" required value={value.description ?? ""} onChange={(v) => set("description", v)} max={280} rows={3} />
      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="Primary Button Text" value={value.primaryButtonText ?? ""} onChange={(v) => set("primaryButtonText", v)} max={30} />
        <TextField label="Primary Button URL" value={value.primaryButtonLink ?? ""} onChange={(v) => set("primaryButtonLink", v)} placeholder="https://wa.me/…" />
        <TextField label="Secondary Button Text" value={value.secondaryButtonText ?? ""} onChange={(v) => set("secondaryButtonText", v)} max={30} />
        <SelectField label="Secondary Button Target" value={value.secondaryButtonTarget ?? "#pricing"} onChange={(v) => set("secondaryButtonTarget", v)}
          options={[
            { label: "Pricing", value: "#pricing" },
            { label: "FAQ", value: "#faq" },
            { label: "CTA", value: "#cta" },
            { label: "Custom URL", value: "custom" },
          ]} />
      </div>
      {value.secondaryButtonTarget === "custom" && (
        <TextField label="Custom URL" value={value.secondaryButtonCustomUrl ?? ""} onChange={(v) => set("secondaryButtonCustomUrl", v)} placeholder="https://…" />
      )}
      <MediaPicker label="Hero Image" value={value.image ?? ""} onChange={(v) => set("image", v)} />
      <TextField label="ALT Text" required value={value.imageAlt ?? ""} onChange={(v) => set("imageAlt", v)} hint="Wajib untuk SEO & aksesibilitas." max={160} />
      <div className="grid gap-6 md:grid-cols-2">
        <NumberField label="Image Width (px)" value={value.imageWidth ?? 1024} onChange={(v) => set("imageWidth", v)} />
        <NumberField label="Image Height (px)" value={value.imageHeight ?? 1024} onChange={(v) => set("imageHeight", v)} />
      </div>
    </div>
  );
}

/* ---------------- STATS ---------------- */

export type StatItem = { icon: string; title: string; value: string; description?: string; sortOrder: number; isVisible: boolean };
export function StatsForm({ value, onChange }: { value: { items: StatItem[] }; onChange: (v: { items: StatItem[] }) => void }) {
  return (
    <Repeater<StatItem>
      items={value.items ?? []}
      onChange={(items) => onChange({ items })}
      addLabel="Tambah Statistik"
      itemTitle={(it, i) => it.title || `Statistik #${i + 1}`}
      newItem={() => ({ icon: "Star", title: "", value: "", description: "", sortOrder: (value.items?.length ?? 0) + 1, isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Icon"><IconPicker value={it.icon} onChange={(icon) => up({ icon })} /></Field>
          <TextField label="Judul" value={it.title} onChange={(title) => up({ title })} max={60} />
          <TextField label="Angka" value={it.value} onChange={(v) => up({ value: v })} placeholder="Contoh: 5.200+" />
          <TextField label="Deskripsi" value={it.description ?? ""} onChange={(description) => up({ description })} max={120} />
          <NumberField label="Urutan" value={it.sortOrder} onChange={(sortOrder) => up({ sortOrder })} />
          <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} label={it.isVisible ? "Tampil" : "Disembunyikan"} /></Field>
        </div>
      )}
    />
  );
}

/* ---------------- PROBLEMS ---------------- */

export type ProblemItem = { icon: string; title: string; description: string; isVisible: boolean };
export function ProblemsForm({ value, onChange }: { value: { items: ProblemItem[] }; onChange: (v: { items: ProblemItem[] }) => void }) {
  return (
    <Repeater<ProblemItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Masalah"
      itemTitle={(it, i) => it.title || `Card #${i + 1}`}
      newItem={() => ({ icon: "TrendingDown", title: "", description: "", isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Icon"><IconPicker value={it.icon} onChange={(icon) => up({ icon })} /></Field>
          <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} /></Field>
          <TextField label="Judul" value={it.title} onChange={(title) => up({ title })} max={80} />
          <TextareaField label="Deskripsi" value={it.description} onChange={(description) => up({ description })} max={200} rows={2} />
        </div>
      )}
    />
  );
}

/* ---------------- SOLUTIONS ---------------- */

export type SolutionRow = { label: string; regular: string; seo: string; isVisible: boolean };
export function SolutionsForm({ value, onChange }: { value: { items: SolutionRow[] }; onChange: (v: { items: SolutionRow[] }) => void }) {
  return (
    <Repeater<SolutionRow>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Baris"
      itemTitle={(it, i) => it.label || `Baris #${i + 1}`}
      newItem={() => ({ label: "", regular: "", seo: "", isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Judul" value={it.label} onChange={(label) => up({ label })} max={80} />
          <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} /></Field>
          <TextField label="Kolom Kiri (Regular)" value={it.regular} onChange={(regular) => up({ regular })} max={120} />
          <TextField label="Kolom Kanan (SEO)" value={it.seo} onChange={(seo) => up({ seo })} max={120} />
        </div>
      )}
    />
  );
}

/* ---------------- WORKFLOW ---------------- */

export type WorkflowItem = { stepNumber: number; title: string; description: string; icon: string; isVisible: boolean };
export function WorkflowForm({ value, onChange }: { value: { items: WorkflowItem[] }; onChange: (v: { items: WorkflowItem[] }) => void }) {
  return (
    <Repeater<WorkflowItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Langkah"
      itemTitle={(it, i) => it.title || `Langkah #${it.stepNumber || i + 1}`}
      newItem={() => ({ stepNumber: (value.items?.length ?? 0) + 1, title: "", description: "", icon: "CheckCircle2", isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField label="Nomor" value={it.stepNumber} onChange={(stepNumber) => up({ stepNumber })} />
          <Field label="Icon"><IconPicker value={it.icon} onChange={(icon) => up({ icon })} /></Field>
          <TextField label="Judul" value={it.title} onChange={(title) => up({ title })} max={80} />
          <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} /></Field>
          <div className="md:col-span-2">
            <TextareaField label="Deskripsi" value={it.description} onChange={(description) => up({ description })} max={200} rows={2} />
          </div>
        </div>
      )}
    />
  );
}

/* ---------------- ADVANTAGES ---------------- */

export type AdvantageItem = { icon: string; title: string; description: string };
export function AdvantagesForm({ value, onChange }: { value: { items: AdvantageItem[] }; onChange: (v: { items: AdvantageItem[] }) => void }) {
  return (
    <Repeater<AdvantageItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Keunggulan"
      itemTitle={(it, i) => it.title || `Item #${i + 1}`}
      newItem={() => ({ icon: "Sparkles", title: "", description: "" })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Icon"><IconPicker value={it.icon} onChange={(icon) => up({ icon })} /></Field>
          <TextField label="Judul" value={it.title} onChange={(title) => up({ title })} max={80} />
          <div className="md:col-span-2">
            <TextareaField label="Deskripsi" value={it.description} onChange={(description) => up({ description })} max={200} rows={2} />
          </div>
        </div>
      )}
    />
  );
}

/* ---------------- SERVICES ---------------- */

export type ServiceItem = { icon: string; name: string; slug: string; description: string; ctaLabel: string; ctaUrl: string };
export function ServicesForm({ value, onChange }: { value: { items: ServiceItem[] }; onChange: (v: { items: ServiceItem[] }) => void }) {
  return (
    <Repeater<ServiceItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Layanan"
      itemTitle={(it, i) => it.name || `Layanan #${i + 1}`}
      newItem={() => ({ icon: "BookOpen", name: "", slug: "", description: "", ctaLabel: "", ctaUrl: "" })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Icon"><IconPicker value={it.icon} onChange={(icon) => up({ icon })} /></Field>
          <TextField label="Nama" value={it.name} onChange={(name) => up({ name })} max={80} />
          <TextField label="Slug" value={it.slug} onChange={(slug) => up({ slug: slug.toLowerCase().replace(/\s+/g, "-") })} />
          <TextField label="CTA Label" value={it.ctaLabel} onChange={(ctaLabel) => up({ ctaLabel })} max={30} />
          <div className="md:col-span-2">
            <TextareaField label="Deskripsi Singkat" value={it.description} onChange={(description) => up({ description })} max={200} rows={2} />
          </div>
          <div className="md:col-span-2">
            <TextField label="CTA URL" value={it.ctaUrl} onChange={(ctaUrl) => up({ ctaUrl })} />
          </div>
        </div>
      )}
    />
  );
}

/* ---------------- PORTFOLIO ---------------- */

export type PortfolioItem = { thumbnail: string; title: string; category: string; keyword: string; wordCount: number; link: string; isVisible: boolean };
export function PortfolioForm({ value, onChange }: { value: { items: PortfolioItem[] }; onChange: (v: { items: PortfolioItem[] }) => void }) {
  return (
    <Repeater<PortfolioItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Portfolio"
      itemTitle={(it, i) => it.title || `Portfolio #${i + 1}`}
      newItem={() => ({ thumbnail: "", title: "", category: "", keyword: "", wordCount: 1000, link: "", isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><MediaPicker label="Thumbnail" value={it.thumbnail} onChange={(thumbnail) => up({ thumbnail })} /></div>
          <TextField label="Judul" value={it.title} onChange={(title) => up({ title })} max={120} />
          <TextField label="Kategori" value={it.category} onChange={(category) => up({ category })} />
          <TextField label="Keyword" value={it.keyword} onChange={(keyword) => up({ keyword })} />
          <NumberField label="Jumlah Kata" value={it.wordCount} onChange={(wordCount) => up({ wordCount })} />
          <TextField label="Link" value={it.link} onChange={(link) => up({ link })} />
          <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} /></Field>
        </div>
      )}
    />
  );
}

/* ---------------- PRICING ---------------- */

export type PricingItem = {
  packageName: string; price: string; priceNote: string; badge: string; isPopular: boolean;
  features: { text: string }[]; ctaLabel: string; ctaUrl: string; isVisible: boolean;
};
export function PricingForm({ value, onChange }: { value: { items: PricingItem[] }; onChange: (v: { items: PricingItem[] }) => void }) {
  return (
    <Repeater<PricingItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah Paket"
      itemTitle={(it, i) => it.packageName || `Paket #${i + 1}`}
      newItem={() => ({ packageName: "", price: "", priceNote: "", badge: "", isPopular: false, features: [{ text: "" }], ctaLabel: "Pesan Sekarang", ctaUrl: "", isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Nama Paket" value={it.packageName} onChange={(packageName) => up({ packageName })} max={40} />
          <TextField label="Harga" value={it.price} onChange={(price) => up({ price })} placeholder="Rp 75rb" />
          <TextField label="Harga (catatan)" value={it.priceNote} onChange={(priceNote) => up({ priceNote })} placeholder="/artikel" />
          <TextField label="Badge" value={it.badge} onChange={(badge) => up({ badge })} placeholder="Terpopuler" />
          <Field label="Popular"><Switch checked={it.isPopular} onChange={(isPopular) => up({ isPopular })} /></Field>
          <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} /></Field>
          <div className="md:col-span-2">
            <Field label="Fitur">
              <div className="space-y-2">
                {it.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={f.text}
                      onChange={(e) => up({ features: it.features.map((x, j) => j === i ? { text: e.target.value } : x) })}
                      className={inputCls}
                      placeholder="Contoh: 1000 kata"
                    />
                    <button type="button" onClick={() => up({ features: it.features.filter((_, j) => j !== i) })}
                      className="rounded-lg border border-border px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">Hapus</button>
                  </div>
                ))}
                <button type="button" onClick={() => up({ features: [...it.features, { text: "" }] })}
                  className="rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent">+ Tambah Fitur</button>
              </div>
            </Field>
          </div>
          <TextField label="CTA Label" value={it.ctaLabel} onChange={(ctaLabel) => up({ ctaLabel })} />
          <TextField label="CTA URL" value={it.ctaUrl} onChange={(ctaUrl) => up({ ctaUrl })} />
        </div>
      )}
    />
  );
}

/* ---------------- COMPARISON ---------------- */

export type ComparisonRow = { feature: string; freelancer: string; ai: string; agency: string; us: string };
export function ComparisonForm({ value, onChange }: { value: { rows: ComparisonRow[] }; onChange: (v: { rows: ComparisonRow[] }) => void }) {
  const rows = value.rows ?? [];
  const update = (i: number, patch: Partial<ComparisonRow>) => onChange({ rows: rows.map((r, j) => j === i ? { ...r, ...patch } : r) });
  const remove = (i: number) => onChange({ rows: rows.filter((_, j) => j !== i) });
  const add = () => onChange({ rows: [...rows, { feature: "", freelancer: "", ai: "", agency: "", us: "" }] });
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              {["Kolom", "Freelancer", "AI", "Agency", "Kami", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-medium text-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i}>
                {(["feature", "freelancer", "ai", "agency", "us"] as const).map((k) => (
                  <td key={k} className="p-2">
                    <input value={r[k]} onChange={(e) => update(i, { [k]: e.target.value } as Partial<ComparisonRow>)} className={inputCls} />
                  </td>
                ))}
                <td className="p-2">
                  <button type="button" onClick={() => remove(i)} className="rounded-lg border border-border px-2 py-1.5 text-xs text-red-600 hover:bg-red-50">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={add} className="inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-primary hover:bg-accent">+ Tambah Baris</button>
    </div>
  );
}

/* ---------------- FAQ ---------------- */

export type FAQItem = { question: string; answer: string; sortOrder: number; isVisible: boolean };
export function FAQForm({ value, onChange }: { value: { items: FAQItem[] }; onChange: (v: { items: FAQItem[] }) => void }) {
  return (
    <Repeater<FAQItem>
      items={value.items ?? []} onChange={(items) => onChange({ items })} addLabel="Tambah FAQ"
      itemTitle={(it, i) => it.question || `FAQ #${i + 1}`}
      newItem={() => ({ question: "", answer: "", sortOrder: (value.items?.length ?? 0) + 1, isVisible: true })}
      renderItem={(it, up) => (
        <div className="grid gap-4">
          <TextField label="Pertanyaan" value={it.question} onChange={(question) => up({ question })} max={160} />
          <TextareaField label="Jawaban" value={it.answer} onChange={(answer) => up({ answer })} rows={3} max={600} />
          <div className="grid gap-4 md:grid-cols-2">
            <NumberField label="Urutan" value={it.sortOrder} onChange={(sortOrder) => up({ sortOrder })} />
            <Field label="Visibility"><Switch checked={it.isVisible} onChange={(isVisible) => up({ isVisible })} /></Field>
          </div>
        </div>
      )}
    />
  );
}

/* ---------------- BLOG PREVIEW ---------------- */

export type BlogPreviewData = { sectionTitle: string; count: string; category: string };
export function BlogPreviewForm({ value, onChange }: { value: BlogPreviewData; onChange: (v: BlogPreviewData) => void }) {
  return (
    <div className="grid gap-6">
      <TextField label="Judul Section" value={value.sectionTitle ?? "Artikel Terbaru"} onChange={(sectionTitle) => onChange({ ...value, sectionTitle })} max={80} />
      <SelectField label="Jumlah Artikel" value={String(value.count ?? "3")} onChange={(count) => onChange({ ...value, count })}
        options={[{ label: "3", value: "3" }, { label: "6", value: "6" }, { label: "9", value: "9" }]} />
      <SelectField label="Kategori" value={value.category ?? "auto"} onChange={(category) => onChange({ ...value, category })}
        options={[{ label: "Auto (semua)", value: "auto" }]} />
    </div>
  );
}

/* ---------------- CTA ---------------- */

export type CTAData = { title: string; subtitle: string; buttonLabel: string; buttonUrl: string; backgroundImage: string };
export function CTAForm({ value, onChange }: { value: CTAData; onChange: (v: CTAData) => void }) {
  const set = <K extends keyof CTAData>(k: K, v: CTAData[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-6">
      <TextField label="Judul" required value={value.title ?? ""} onChange={(v) => set("title", v)} max={120} />
      <TextareaField label="Subjudul" value={value.subtitle ?? ""} onChange={(v) => set("subtitle", v)} max={200} rows={2} />
      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="Button Label" value={value.buttonLabel ?? ""} onChange={(v) => set("buttonLabel", v)} max={30} />
        <TextField label="Button URL" value={value.buttonUrl ?? ""} onChange={(v) => set("buttonUrl", v)} />
      </div>
      <MediaPicker label="Background Image" value={value.backgroundImage ?? ""} onChange={(v) => set("backgroundImage", v)} />
    </div>
  );
}
