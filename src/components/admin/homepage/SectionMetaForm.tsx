import { Field, TextField, TextareaField, NumberField, Switch, MediaPicker, inputCls } from "./primitives";
import type { SectionMeta } from "@/lib/admin/sectionMeta";

const PRESET_COLORS = [
  { label: "Default", value: "" },
  { label: "Putih", value: "#FFFFFF" },
  { label: "Abu terang", value: "#F8FAFC" },
  { label: "Abu", value: "#F1F5F9" },
  { label: "Biru muda", value: "#EFF6FF" },
  { label: "Gelap", value: "#0F172A" },
];

export function SectionMetaForm({
  title, sortOrder, visible, meta,
  onTitle, onSortOrder, onVisible, onMeta,
  showSubtitle = true,
}: {
  title: string;
  sortOrder: number;
  visible: boolean;
  meta: SectionMeta;
  onTitle: (v: string) => void;
  onSortOrder: (v: number) => void;
  onVisible: (v: boolean) => void;
  onMeta: (v: SectionMeta) => void;
  showSubtitle?: boolean;
}) {
  const patch = (p: Partial<SectionMeta>) => onMeta({ ...meta, ...p });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <TextField label="Section Badge (opsional)" value={meta.badge} onChange={(v) => patch({ badge: v })} max={60} placeholder="Mis. Layanan Kami" />
        <TextField label="Section Title" value={title} onChange={onTitle} max={120} required />
        <Field label="Visibility">
          <Switch checked={visible} onChange={onVisible} label={visible ? "Tampil di homepage" : "Disembunyikan"} />
        </Field>
      </div>

      {showSubtitle && (
        <TextareaField
          label="Section Subtitle (opsional)"
          value={meta.subtitle}
          onChange={(v) => patch({ subtitle: v })}
          rows={2}
          max={280}
          placeholder="Kalimat pendukung di bawah judul"
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Background Color" hint="Kosongkan untuk memakai warna default section.">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={meta.bgColor || "#ffffff"}
              onChange={(e) => patch({ bgColor: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded border border-border bg-background p-1"
            />
            <input
              type="text"
              value={meta.bgColor}
              onChange={(e) => patch({ bgColor: e.target.value })}
              placeholder="#FFFFFF atau kosong"
              className={inputCls}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => patch({ bgColor: p.value })}
                className={`rounded-md border px-2 py-1 text-xs ${meta.bgColor === p.value ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>
        <MediaPicker
          label="Background Image (opsional)"
          value={meta.bgImage}
          onChange={(v) => patch({ bgImage: v })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NumberField label="Padding Top (px)" value={meta.paddingTop} onChange={(v) => patch({ paddingTop: v })} min={0} max={400} />
        <NumberField label="Padding Bottom (px)" value={meta.paddingBottom} onChange={(v) => patch({ paddingBottom: v })} min={0} max={400} />
        <NumberField label="Sort Order" value={sortOrder} onChange={onSortOrder} min={1} />
      </div>
    </div>
  );
}
