import { ArrowRight } from "lucide-react";
import type { Portfolio } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";
import { waLink } from "@/lib/whatsapp";

export function PortfolioSection({ eyebrow, subtitle, title, data }: { eyebrow?: string; subtitle?: string; title?: string; data: Portfolio[] }) {
  return (
    <section id="portfolio" className="bg-accent/40 border-y border-border">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow={eyebrow ?? "Portofolio"}
          title={title ?? "Contoh Hasil Artikel"}
          description={subtitle ?? "Beberapa contoh artikel yang telah kami produksi untuk berbagai niche."}
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <article key={p.id} className="flex flex-col rounded-[16px] border border-border bg-card p-6">
              <span className="inline-flex w-fit rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                {p.category}
              </span>
              <h3 className="mt-4 text-base font-semibold leading-snug text-secondary">{p.title}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Keyword</dt>
                  <dd className="mt-0.5 font-medium text-secondary">{p.keyword}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Jumlah kata</dt>
                  <dd className="mt-0.5 font-medium text-secondary">{p.wordCount.toLocaleString("id-ID")}</dd>
                </div>
              </dl>
              <a
                href={waLink(`Halo, saya ingin melihat detail artikel: ${p.title}`)}
                target="_blank" rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-80"
              >
                Lihat Detail <ArrowRight className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
