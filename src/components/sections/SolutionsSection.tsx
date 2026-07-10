import { X, Check } from "lucide-react";
import type { ComparisonItem } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function SolutionsSection({ title, data }: { title?: string; data: ComparisonItem[] }) {
  return (
    <section id="solutions" className="bg-accent/40 border-y border-border">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow="Solusi"
          title={title ?? "Artikel Biasa vs Artikel SEO"}
          description="Perbedaan mendasar antara artikel yang ditulis tanpa strategi dengan artikel yang dioptimasi untuk SEO."
        />

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[16px] border border-border bg-card">
          <div className="grid grid-cols-3 border-b border-border bg-background text-sm font-semibold text-secondary">
            <div className="p-4">Aspek</div>
            <div className="p-4">Artikel Biasa</div>
            <div className="p-4 bg-accent text-primary">Artikel SEO</div>
          </div>
          {data.map((row, i) => (
            <div key={row.id} className={`grid grid-cols-3 text-sm ${i !== data.length - 1 ? "border-b border-border" : ""}`}>
              <div className="p-4 font-medium text-secondary">{row.label}</div>
              <div className="p-4 text-muted-foreground">
                <span className="inline-flex items-start gap-2"><X className="mt-0.5 h-4 w-4 text-muted-foreground" />{row.regular}</span>
              </div>
              <div className="p-4 bg-accent/60 text-secondary">
                <span className="inline-flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary" />{row.seo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
