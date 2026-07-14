import { ArrowRight } from "lucide-react";
import type { Portfolio } from "@/types";
import { SectionHeader } from "@/components/SectionHeader";

export function PortfolioSection({
  eyebrow,
  subtitle,
  title,
  data,
}: {
  eyebrow?: string;
  subtitle?: string;
  title?: string;
  data: Portfolio[];
}) {
  return (
    <section id="portfolio" className="bg-accent/40 border-y border-border">
      <div className="container-narrow py-20">
        <SectionHeader
          eyebrow={eyebrow ?? "Portofolio"}
          title={title ?? "Contoh Hasil Artikel"}
          description={
            subtitle ?? "Beberapa contoh artikel yang telah kami produksi untuk berbagai niche."
          }
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => {
            const ctaLabel = p.ctaLabel || "Lihat Preview";
            const ctaUrl = p.ctaUrl || "#";
            return (
              <article
                key={p.id}
                className="group flex flex-col rounded-[16px] border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-within:-translate-y-1 focus-within:shadow-md"
              >
                <span className="inline-flex w-fit rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                  {p.category}
                </span>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-secondary line-clamp-2">
                  {p.title}
                </h3>
                {p.excerpt && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{p.excerpt}</p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">
                    <span className="text-[11px] uppercase tracking-wide">Keyword</span>{" "}
                    <span className="font-medium text-secondary">{p.keyword}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-medium text-secondary">
                      {p.wordCount.toLocaleString("id-ID")}
                    </span>{" "}
                    Kata
                  </span>
                </div>

                {p.labels && p.labels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.labels.map((l) => (
                      <span
                        key={l}
                        className="inline-flex items-center rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] font-medium text-secondary/80"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={ctaUrl}
                  target={ctaUrl.startsWith("http") ? "_blank" : undefined}
                  rel={ctaUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={`${ctaLabel}: ${p.title}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                >
                  {ctaLabel}{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
